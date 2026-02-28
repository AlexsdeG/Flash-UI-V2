/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FileAsset } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export const constructSrcDoc = (files: FileAsset[]) => {
    const htmlFile = files.find(f => f.name === 'index.html');
    const cssFile = files.find(f => f.name === 'styles.css');
    const jsFile = files.find(f => f.name === 'script.js');

    let htmlContent = htmlFile?.content || '';
    const cssContent = cssFile?.content || '';
    const jsContent = jsFile?.content || '';

    // If no HTML content, return empty or loading
    if (!htmlContent) return '';

    // Simple heuristic to see if it's a full document
    const hasDocType = htmlContent.toLowerCase().includes('<!doctype html>');
    const hasHtmlTag = htmlContent.toLowerCase().includes('<html');

    if (!hasDocType && !hasHtmlTag) {
        // Wrap fragment
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                    * { box-sizing: border-box; }
                    ${cssContent}
                </style>
            </head>
            <body>
                ${htmlContent}
                <script>
                    window.onerror = function(msg, url, line) { console.error("Iframe Error:", msg, line); };
                    try {
                        ${jsContent}
                    } catch (e) { console.error("Script Error:", e); }
                </script>
            </body>
            </html>
        `;
    }

    // Inject into full document
    let finalHtml = htmlContent;

    // Inject CSS before </head> or end of html if missing
    if (cssContent) {
        if (finalHtml.includes('</head>')) {
            finalHtml = finalHtml.replace('</head>', `<style>${cssContent}</style></head>`);
        } else if (finalHtml.includes('<body>')) {
             finalHtml = finalHtml.replace('<body>', `<head><style>${cssContent}</style></head><body>`);
        } else {
             finalHtml = `<style>${cssContent}</style>` + finalHtml;
        }
    }

    // Inject JS before </body>
    if (jsContent) {
        if (finalHtml.includes('</body>')) {
            finalHtml = finalHtml.replace('</body>', `<script>${jsContent}</script></body>`);
        } else if (finalHtml.includes('</html>')) {
             finalHtml = finalHtml.replace('</html>', `<script>${jsContent}</script></html>`);
        } else {
            finalHtml += `<script>${jsContent}</script>`;
        }
    }

    return finalHtml;
}