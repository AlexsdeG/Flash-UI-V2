/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import html2canvas from 'html2canvas';
import { Check } from 'lucide-react';

export type AnnotationTool = 'cursor' | 'pen' | 'rect' | 'text';

interface AnnotatorProps {
    tool: AnnotationTool;
    color: string;
    isActive: boolean;
    containerRef: React.RefObject<HTMLDivElement>;
}

export interface AnnotatorRef {
    capture: () => Promise<string | null>;
    undo: () => void;
    clear: () => void;
}

interface Point { x: number; y: number }

interface Annotation {
    id: string;
    type: 'path' | 'rect' | 'text';
    color: string;
    points?: Point[]; // For path
    rect?: { x: number, y: number, w: number, h: number }; // For rect
    text?: { x: number, y: number, content: string }; // For text
}

export const Annotator = forwardRef<AnnotatorRef, AnnotatorProps>(({ tool, color, isActive, containerRef }, ref) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [currentRect, setCurrentRect] = useState<{start: Point, current: Point} | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    // Text input state
    const [textInput, setTextInput] = useState<{x: number, y: number, content: string} | null>(null);

    useImperativeHandle(ref, () => ({
        capture: async () => {
            if (!containerRef.current) return null;
            try {
                // We capture the container which holds both iframe and annotator
                const canvas = await html2canvas(containerRef.current, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                    ignoreElements: (el) => el.classList.contains('annotator-ignore')
                });
                return canvas.toDataURL('image/png');
            } catch (e) {
                console.error("Screenshot failed", e);
                return null;
            }
        },
        undo: () => {
            setAnnotations(prev => prev.slice(0, -1));
        },
        clear: () => {
            setAnnotations([]);
        }
    }));

    const getPoint = (e: React.PointerEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        // If clicking on the text input box itself, don't trigger canvas events
        if ((e.target as HTMLElement).closest('.text-input-box')) return;

        if (!isActive || tool === 'cursor') return;
        
        // If placing text
        if (tool === 'text') {
             // If we already have an open input, commit it first (if it has content)
             if (textInput) {
                commitText();
                return;
            }
            
            // Open new input
            const p = getPoint(e);
            setTextInput({ x: p.x, y: p.y, content: '' });
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        const p = getPoint(e);

        if (tool === 'pen') {
            setCurrentPath([p]);
        } else if (tool === 'rect') {
            setCurrentRect({ start: p, current: p });
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        const p = getPoint(e);

        if (tool === 'pen') {
            setCurrentPath(prev => [...prev, p]);
        } else if (tool === 'rect' && currentRect) {
            setCurrentRect({ ...currentRect, current: p });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (tool === 'pen' && currentPath.length > 0) {
            setAnnotations(prev => [...prev, {
                id: Date.now().toString(),
                type: 'path',
                color,
                points: currentPath
            }]);
            setCurrentPath([]);
        } else if (tool === 'rect' && currentRect) {
            const { start, current } = currentRect;
            setAnnotations(prev => [...prev, {
                id: Date.now().toString(),
                type: 'rect',
                color,
                rect: {
                    x: Math.min(start.x, current.x),
                    y: Math.min(start.y, current.y),
                    w: Math.abs(current.x - start.x),
                    h: Math.abs(current.y - start.y)
                }
            }]);
            setCurrentRect(null);
        }
    };

    const commitText = () => {
        if (textInput && textInput.content.trim()) {
            setAnnotations(prev => [...prev, {
                id: Date.now().toString(),
                type: 'text',
                color,
                text: { x: textInput.x, y: textInput.y, content: textInput.content }
            }]);
        }
        setTextInput(null);
    };

    const renderPath = (points: Point[]) => {
        if (points.length < 2) return '';
        const d = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        return d;
    };

    return (
        <div 
            className={`absolute inset-0 z-50 ${isActive && tool !== 'cursor' ? 'cursor-crosshair' : 'pointer-events-none'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <svg className="w-full h-full pointer-events-none">
                {/* Saved Annotations */}
                {annotations.map(ann => {
                    if (ann.type === 'path' && ann.points) {
                        return (
                            <path 
                                key={ann.id} 
                                d={renderPath(ann.points)} 
                                stroke={ann.color} 
                                strokeWidth={3} 
                                fill="none" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                            />
                        );
                    }
                    if (ann.type === 'rect' && ann.rect) {
                        return (
                            <rect 
                                key={ann.id}
                                x={ann.rect.x} y={ann.rect.y} width={ann.rect.w} height={ann.rect.h}
                                stroke={ann.color}
                                strokeWidth={3}
                                fill="transparent"
                            />
                        );
                    }
                    return null;
                })}

                {/* Current Drawing */}
                {tool === 'pen' && currentPath.length > 0 && (
                     <path 
                        d={renderPath(currentPath)} 
                        stroke={color} 
                        strokeWidth={3} 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                    />
                )}
                {tool === 'rect' && currentRect && (
                     <rect 
                        x={Math.min(currentRect.start.x, currentRect.current.x)} 
                        y={Math.min(currentRect.start.y, currentRect.current.y)} 
                        width={Math.abs(currentRect.current.x - currentRect.start.x)} 
                        height={Math.abs(currentRect.current.y - currentRect.start.y)}
                        stroke={color}
                        strokeWidth={3}
                        fill="transparent"
                    />
                )}
            </svg>

            {/* Text Annotations (Rendered) */}
            {annotations.filter(a => a.type === 'text' && a.text).map(ann => (
                <div 
                    key={ann.id}
                    style={{ 
                        position: 'absolute', 
                        left: ann.text!.x, 
                        top: ann.text!.y, 
                        color: ann.color,
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'auto',
                        whiteSpace: 'nowrap',
                        transform: 'translateY(-50%)' 
                    }}
                >
                    {ann.text!.content}
                </div>
            ))}

            {/* Active Text Input Box */}
            {textInput && (
                <div
                    className="text-input-box annotator-ignore"
                    style={{
                        position: 'absolute',
                        left: textInput.x,
                        top: textInput.y,
                        transform: 'translateY(-50%)',
                        pointerEvents: 'auto',
                        zIndex: 100
                    }}
                >
                    <div className="flex items-center gap-1 bg-[#18181b] border border-white/20 p-1 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
                        <input
                            autoFocus
                            type="text"
                            value={textInput.content}
                            onChange={(e) => setTextInput({ ...textInput, content: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitText();
                                if (e.key === 'Escape') setTextInput(null);
                            }}
                            className="bg-transparent border-none outline-none text-sm text-white min-w-[120px] px-2"
                            style={{ color: color }}
                            placeholder="Type comment..."
                        />
                        <button 
                            onClick={commitText}
                            className="p-1 hover:bg-white/10 rounded text-green-400"
                        >
                            <Check size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});