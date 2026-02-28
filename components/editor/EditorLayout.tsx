/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { PreviewStage } from './PreviewStage';
import { CodeWorkspace } from './CodeWorkspace';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '../../utils';
import { useProjectStore } from '../../store';

export const EditorLayout = () => {
    const [leftOpen, setLeftOpen] = useState(true);
    const [leftWidth, setLeftWidth] = useState(260);
    const { activeProjectId, projects, editorMode } = useProjectStore();
    
    const project = activeProjectId ? projects[activeProjectId] : null;

    const isResizingLeft = useRef(false);

    useEffect(() => {
        const savedLeft = localStorage.getItem('flashui_left_width');
        if (savedLeft) setLeftWidth(parseInt(savedLeft));
    }, []);

    const startResizeLeft = () => { isResizingLeft.current = true; };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingLeft.current) {
                const newWidth = Math.max(200, Math.min(600, e.clientX));
                setLeftWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (isResizingLeft.current) {
                isResizingLeft.current = false;
                localStorage.setItem('flashui_left_width', leftWidth.toString());
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [leftWidth]);

    return (
        <div className="flex w-full h-full bg-[#09090b] text-white overflow-hidden relative">
            
            {/* Left Sidebar */}
            <div 
                style={{ width: leftOpen ? leftWidth : 0 }} 
                className="flex-shrink-0 transition-[width] duration-300 ease-in-out relative flex flex-col overflow-hidden border-r border-white/10"
            >
                <div style={{ width: leftWidth }} className="h-full">
                     <Sidebar />
                </div>
            </div>

            {/* Left Resizer & Toggle */}
            <div className="relative w-0 z-20 flex items-center justify-center">
                 <div 
                    className="absolute w-1 h-full hover:bg-indigo-500/50 cursor-col-resize z-10 transition-colors"
                    onMouseDown={startResizeLeft}
                 />
                 <button 
                    onClick={() => setLeftOpen(!leftOpen)}
                    className="absolute left-[-12px] top-6 z-30 p-1 bg-[#18181b] border border-white/10 rounded-full text-white/40 hover:text-white shadow-lg"
                 >
                    {leftOpen ? <PanelLeftClose size={12} /> : <PanelLeftOpen size={12} />}
                 </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 h-full flex flex-col relative z-0">
                <div className="flex-1 relative overflow-hidden">
                    {/* Preview Stage */}
                    <div className={cn("absolute inset-0 w-full h-full", editorMode === 'preview' ? "z-10 visible" : "z-0 invisible")}>
                         <PreviewStage />
                    </div>
                    
                    {/* Code Workspace */}
                    {editorMode === 'code' && (
                        <div className="absolute inset-0 w-full h-full z-10 bg-[#09090b]">
                            <CodeWorkspace />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};