/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useMemo } from 'react';
import { Variant } from '../types';
import { constructSrcDoc } from '../utils';

interface ArtifactCardProps {
    variant: Variant;
    onClick: () => void;
}

const ArtifactCard = React.memo(({ 
    variant, 
    onClick 
}: ArtifactCardProps) => {
    const codeRef = useRef<HTMLPreElement>(null);

    // Auto-scroll logic for the code preview
    useEffect(() => {
        if (codeRef.current) {
            codeRef.current.scrollTop = codeRef.current.scrollHeight;
        }
    }, [variant.streamedCode]);

    const isGenerating = variant.status === 'generating' || variant.status === 'streaming';

    // Construct srcDoc for preview using robust utility
    const srcDoc = useMemo(() => {
        if (!variant.currentFiles || variant.currentFiles.length === 0) return '';
        return constructSrcDoc(variant.currentFiles);
    }, [variant.currentFiles]);

    return (
        <div 
            className={`relative bg-[#111] border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl flex flex-col h-[320px] group ${isGenerating ? 'ring-1 ring-indigo-500/50' : ''}`}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#09090b] border-b border-white/5 shrink-0 z-10 gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {variant.name ? (
                        <span className="text-xs font-semibold text-white/90 truncate">
                            {variant.name}
                        </span>
                    ) : null}
                    
                    {variant.styleDirective && (
                        <span className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider truncate border border-white/5">
                            {variant.styleDirective}
                        </span>
                    )}
                </div>
                
                {isGenerating && (
                    <div className="flex items-center gap-2 text-[9px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Generating
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 relative bg-white w-full h-full">
                {/* Streaming Overlay */}
                {isGenerating && (
                    <div className="absolute inset-0 z-20 bg-[#09090b]/95 overflow-hidden flex flex-col p-4">
                         <div className="text-indigo-400 text-xs font-mono mb-2 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                             Constructing Neural UI...
                         </div>
                        <pre ref={codeRef} className="text-[10px] font-mono text-green-400/80 overflow-hidden whitespace-pre-wrap break-all opacity-80 mask-image-b">
                            {variant.streamedCode || "Initializing..."}
                        </pre>
                    </div>
                )}

                {/* Iframe Preview */}
                <iframe 
                    srcDoc={srcDoc} 
                    title={variant.id} 
                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                    className="w-[200%] h-[200%] border-none scale-50 origin-top-left pointer-events-none"
                    scrolling="no"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <span className="bg-white text-black px-4 py-2 rounded-full font-medium text-sm transform scale-90 group-hover:scale-100 transition-transform">
                        Open Editor
                    </span>
                </div>
            </div>
        </div>
    );
});

export default ArtifactCard;