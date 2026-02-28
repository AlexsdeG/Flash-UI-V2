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

    // The Prompt is engineered to encourage high variance and strict JSON compliance
    const systemPrompt = `
      You are an expert Frontend Creative Technologist.
      Your goal is to generate **production-ready, visually distinct** web interfaces.
      
      **DESIGN RULES:**
      1.  **High Variance:** Do NOT stick to generic Bootstrap/Material looks. If a style is requested (e.g., "Cyberpunk"), go ALL IN on it (custom fonts, neon borders, black backgrounds).
      2.  **Modern Stack:** Use modern CSS (Grid, Flex, Variables, Animations). NO jQuery.
      3.  **Completeness:** The \`index.html\` must be a full document. Fill it with realistic mock data.
      
      **JSON OUTPUT RULES (CRITICAL):**
      1.  Return **ONLY** a single valid JSON object.
      2.  **NO Markdown** formatting (no \`\`\`json blocks).
      3.  **Escape Characters:** You MUST escape double quotes inside your HTML/CSS/JS strings (e.g., \`class="btn"\` becomes \`class=\\"btn\\"\` inside the JSON value).
      4.  **No Comments:** Do not add comments inside the JSON structure itself (comments inside the JS/HTML code strings are fine).

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
                responseMimeType: "application/json"
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