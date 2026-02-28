/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from "@google/genai";
import { FileAsset, GenerationSettings } from '../../types';
import { DEFAULT_MODEL } from '../../config/models';

export class AiService {
  private getClient(apiKey: string) {
    return new GoogleGenAI({ apiKey });
  }

  private cleanJson(text: string): string {
    // Aggressively find the JSON object braces
    let start = text.indexOf('{');
    let end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {
        // Fallback: try to remove markdown fencing if braces aren't clear
        return text.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    return text.substring(start, end + 1);
  }

  async generateProjectTitle(prompt: string, apiKey: string): Promise<string> {
    if (!apiKey) throw new Error("API Key missing");
    
    const client = this.getClient(apiKey);
    const systemPrompt = `
        You are a creative naming assistant.
        Given a project description, generate a short, catchy, and relevant title (max 4-5 words).
        Do not use quotes. Just return the title text.
    `;

    try {
        const response = await client.models.generateContent({
            model: DEFAULT_MODEL,
            contents: prompt,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
            }
        });

        return response.text?.trim() || 'Untitled Project';
    } catch (e) {
        console.error("Failed to generate title:", e);
        return 'Untitled Project';
    }
  }

  async generateCode(
    prompt: string, 
    settings: GenerationSettings, 
    apiKey: string,
    images?: string[],
    onStream?: (chunk: string) => void
  ): Promise<FileAsset[]> {
    if (!apiKey) throw new Error("API Key missing");

    const client = this.getClient(apiKey);
    const modelId = settings.model || DEFAULT_MODEL;

    const systemPrompt = `
You are Flash UI — a master Frontend Creative Technologist and visual designer.
Your goal is to generate **stunning, high-fidelity, production-ready** web interfaces that look like they were hand-crafted by a top design studio.

**VISUAL EXECUTION RULES:**
1.  **Materiality & Style Commitment:** The user's style directive is a *physical/material metaphor*. Let it drive EVERY CSS choice. For example:
    - "Risograph" → use \`feTurbulence\` SVG filters for grain, \`mix-blend-mode: multiply\` for ink layering, muted spot colors.
    - "Glassmorphism" → use \`backdrop-filter: blur()\`, frosted translucent layers, subtle refraction borders.
    - "Brutalist" → raw concrete textures, heavy monospace type, stark black/white, exposed grid structure.
    Go ALL IN. Never produce generic Bootstrap/Material looks.
2.  **Typography:** Import and use high-quality Google Fonts. Pair a bold display/sans-serif headline with a refined monospace or serif for body/data text. Type hierarchy is critical.
3.  **Motion & Micro-interactions:** Include subtle, high-performance CSS animations and JS interactions:
    - Entry reveals (fade-in, slide-up on scroll)
    - Hover state transitions (scale, glow, color shift)
    - Loading shimmer effects or pulsing indicators
    - At least 2-3 distinct animation effects per design.
4.  **Layout & Composition:** Be bold with negative space and visual hierarchy. Avoid generic symmetric card grids. Use asymmetric layouts, overlapping elements, creative whitespace, and unexpected compositions.
5.  **Realism:** Fill with realistic, contextual mock data — real names, plausible numbers, proper dates. Never use "Lorem ipsum" or placeholder text.
6.  **Color & Texture:** Use rich, intentional color palettes (not just grey + one accent). Apply gradients, textures, shadows, and layering for depth. Each design should have its own distinct palette.
7.  **Modern Stack:** Use modern CSS (Grid, Flex, Variables, Animations, \`clamp()\`, \`@container\`). NO jQuery. Use vanilla JS for interactions.
8.  **Completeness:** The \`index.html\` must be a full document with \`<head>\`, font imports, and \`<body>\`.

**STRICT IP SAFEGUARD:** Never reference specific artist names, brand names, or trademarks. Use physical/material metaphors instead.

**JSON OUTPUT RULES (CRITICAL):**
1.  Return **ONLY** a single valid JSON object.
2.  **NO Markdown** formatting (no \`\`\`json blocks).
3.  **Escape Characters:** You MUST escape double quotes inside your HTML/CSS/JS strings (e.g., \`class="btn"\` becomes \`class=\\"btn\\"\` inside the JSON value).
4.  **No Comments:** Do not add comments inside the JSON structure itself.

**Structure:**
{
  "files": [
    { "name": "index.html", "language": "html", "content": "<!DOCTYPE html>..." },
    { "name": "styles.css", "language": "css", "content": "body { ... }" },
    { "name": "script.js", "language": "javascript", "content": "console.log('...')" }
  ]
}
    `;

    const contents: any = [
        { text: prompt }
    ];

    if (images && images.length > 0) {
        images.forEach(img => {
            contents.push({
                inlineData: {
                    mimeType: "image/png",
                    data: img.split(',')[1] 
                }
            });
        });
    }

    try {
        const response = await client.models.generateContent({
            model: modelId,
            contents: contents,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                temperature: settings.temperature ?? 1.0
            }
        });

        const jsonStr = this.cleanJson(response.text || "{}");
        const data = JSON.parse(jsonStr);
        
        if (data.files && Array.isArray(data.files)) {
            return data.files.map((f: any) => ({ ...f, isOpen: true, type: 'file' }));
        }
        return [];
    } catch (e) {
        console.error("AI Generation Error", e);
        throw e;
    }
  }

  async modifyCode(
    currentFiles: FileAsset[], 
    instruction: string, 
    apiKey: string,
    styleDirective?: string,
    images?: string[]
  ): Promise<FileAsset[]> {
    if (!apiKey) throw new Error("API Key missing");
    
    const client = this.getClient(apiKey);
    const context = currentFiles.map(f => `File: ${f.name}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');

    let specificStylePrompt = "";
    if (styleDirective) {
        specificStylePrompt = `
        **RADICAL REDESIGN REQUESTED:**
        The user wants to transform this existing code into the style: "${styleDirective}".
        - completely rewrite the CSS to match this style.
        - update HTML structure if needed to support the new look.
        - be creative and bold.
        `;
    }

    const systemPrompt = `
        You are an expert Frontend Engineer.
        Modify the provided code based on the user's instruction.
        ${images && images.length > 0 ? "The user has provided screenshot(s) with annotations. Pay close attention to the visual markup." : ""}
        ${specificStylePrompt}
        
        **CRITICAL:**
        - Return ONLY valid JSON.
        - Escape all quotes inside strings properly.
        - Ensure \`index.html\` remains a complete document.
        
        Structure: { "files": [{ "name": "...", "language": "...", "content": "..." }] }
    `;

    const contents: any = [
        { text: `Current Code:\n${context}\n\nInstruction: ${instruction}` }
    ];

    if (images && images.length > 0) {
        images.forEach(img => {
            contents.push({
                inlineData: {
                    mimeType: "image/png",
                    data: img.split(',')[1] 
                }
            });
        });
    } else if (typeof images === 'string') {
        // Backward compatibility if passed as single string (though type says string[])
        // But I changed the signature to string[] | undefined. 
        // Let's assume caller fixes it or we handle it if I missed something.
        // Actually I'm replacing the method so I define the signature.
    }

    try {
        const response = await client.models.generateContent({
            model: DEFAULT_MODEL,
            contents: contents,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json"
            }
        });

        const jsonStr = this.cleanJson(response.text || "{}");
        const data = JSON.parse(jsonStr);
        
        if (data.files && Array.isArray(data.files)) {
            return data.files.map((f: any) => ({ ...f, isOpen: true, type: 'file' }));
        }
        return currentFiles;
    } catch (e) {
        console.error("AI Modification Error", e);
        throw e;
    }
  }

  async fullBuild(
    currentFiles: FileAsset[],
    apiKey: string
  ): Promise<FileAsset[]> {
      const instruction = "Refactor this code into a fully featured, production-ready application. Expand functionality, add responsive design, improve styling, and ensure accessibility. Add navigation, footer, and proper layout structure. Ensure the design is visually stunning.";
      return this.modifyCode(currentFiles, instruction, apiKey);
  }
}

export const aiService = new AiService();