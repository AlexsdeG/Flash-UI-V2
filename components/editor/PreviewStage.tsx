/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store';
import { 
    Monitor, Smartphone, Tablet, RotateCw, Moon, Sun, Maximize2, X, Zap, RefreshCw,
    Pencil, MousePointer2, Square, Type, Undo2, Eraser, Send, GripVertical, Plus, ArrowLeft
} from 'lucide-react';
import { cn, constructSrcDoc, generateId } from '../../utils';
import { toast } from 'sonner';
import { Annotator, AnnotatorRef, AnnotationTool } from './Annotator';
import { aiService } from '../../lib/ai/service';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const PreviewStage = () => {
    const { projects, activeProjectId, updateVariantStatus, setFiles, saveCheckpoint, settings } = useProjectStore();
    const [device, setDevice] = useState<DeviceMode>('desktop');
    const [rotated, setRotated] = useState(false);
    const [darkMode, setDarkMode] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [scale, setScale] = useState(1);
    
    // Annotation State
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [activeTool, setActiveTool] = useState<AnnotationTool>('cursor');
    const [brushColor, setBrushColor] = useState('#ef4444'); // Default red
    const [chatInput, setChatInput] = useState("");
    const annotatorRef = useRef<AnnotatorRef>(null);

    // Toolbar Dragging State
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const codeScrollRef = useRef<HTMLPreElement>(null);

    const project = activeProjectId ? projects[activeProjectId] : null;
    const variant = project?.activeVariantId ? project.variants[project.activeVariantId] : null;
    
    // Status Check
    const isGenerating = variant?.status === 'generating' || variant?.status === 'streaming';

    // Auto-scroll logic for the code preview
    useEffect(() => {
        if (codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [variant?.streamedCode]);

    // Check if variant likely supports dark mode (naive check for simplicity)
    const hasDarkModeSupport = useMemo(() => {
        const css = variant?.currentFiles.find(f => f.name === 'styles.css')?.content || '';
        return css.includes('@media (prefers-color-scheme: dark)') || css.includes('.dark');
    }, [variant]);

    const srcDoc = useMemo(() => {
        if (!variant?.currentFiles) return '';
        
        let html = constructSrcDoc(variant.currentFiles);
        
        // Inject dark mode class if enabled and supported, or basic override
        if (darkMode) {
            // Simple injection to force dark mode if the class exists or body styling
            if (html.includes('<html')) {
                html = html.replace('<html', '<html class="dark"');
            } else if (html.includes('<body')) {
                html = html.replace('<body', '<body class="dark"');
            }
        }
        
        return html;
    }, [variant?.currentFiles, darkMode, refreshKey]);

    const getDimensions = () => {
        if (device === 'mobile') return rotated ? { w: 720, h: 375 } : { w: 375, h: 720 };
        if (device === 'tablet') return rotated ? { w: 1024, h: 768 } : { w: 768, h: 1024 };
        return { w: '100%', h: '100%' };
    };

    const dims = getDimensions();
    const isDesktop = device === 'desktop';

    // Auto-scale logic
    useEffect(() => {
        if (isDesktop) {
            setScale(1);
            return;
        }

        const calculateScale = () => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = containerRef.current.clientHeight;
            
            // Add padding to calculation
            const availableW = containerWidth - 64; 
            const availableH = containerHeight - 64;

            const targetW = typeof dims.w === 'number' ? dims.w : availableW;
            const targetH = typeof dims.h === 'number' ? dims.h : availableH;

            const scaleW = availableW / targetW;
            const scaleH = availableH / targetH;

            // Fit containment
            const newScale = Math.min(scaleW, scaleH, 1);
            setScale(newScale);
        };

        const observer = new ResizeObserver(calculateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        calculateScale(); // Initial cal

        return () => observer.disconnect();
    }, [device, rotated, dims, isDesktop]);

    // Dragging Logic with Constraint
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingRef.current) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                
                setToolbarPosition(prev => {
                    const newX = prev.x + dx;
                    const newY = prev.y + dy;
                    
                    // Simple constraint: don't let it drift too far from center
                    // Assuming toolbar is roughly 500px wide. Center is 0.
                    // Screen width / 2 is the edge from center.
                    const halfScreenW = window.innerWidth / 2;
                    const constrainedX = Math.max(-halfScreenW + 200, Math.min(halfScreenW - 200, newX));
                    
                    // Constrain Y to not go below screen bottom or too high up
                    // Y=0 is bottom: 32px. Y negative goes up.
                    // We allow dragging up to top of screen roughly.
                    const constrainedY = Math.max(-window.innerHeight + 100, Math.min(0, newY));

                    return { x: constrainedX, y: constrainedY };
                });
                
                dragStartRef.current = { x: e.clientX, y: e.clientY };
            }
        };

        const handleMouseUp = () => {
            isDraggingRef.current = false;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleDragStart = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };


    const handleGenerateTheme = () => {
        toast.info("AI generation for theme variant coming in V3...");
    };

    const handleReload = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleBack = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            try {
                iframeRef.current.contentWindow.history.back();
            } catch (e) {
                console.warn("Navigation back failed", e);
            }
        }
    };

    const toggleAnnotationMode = () => {
        setIsAnnotating(!isAnnotating);
        if (!isAnnotating) setActiveTool('pen');
        else setActiveTool('cursor');
    };

    const handleSendFeedback = async () => {
        if (!project || !variant) return;
        const prompt = chatInput.trim();
        if (!prompt) return;

        const apiKey = settings.apiKeys.gemini;
        if (!apiKey) {
            toast.error("API Key missing");
            return;
        }

        let imageData = null;
        if (annotatorRef.current) {
            imageData = await annotatorRef.current.capture();
        }

        updateVariantStatus(project.id, variant.id, 'generating', '// Analyzing visual feedback...');
        setIsAnnotating(false);
        setChatInput("");
        if (annotatorRef.current) annotatorRef.current.clear();

        try {
             // Clone files for modification
             const filesCopy = JSON.parse(JSON.stringify(variant.currentFiles));
             
             const newFiles = await aiService.modifyCode(
                 filesCopy, 
                 prompt, 
                 apiKey, 
                 undefined, 
                 imageData || undefined
             );

             setFiles(project.id, variant.id, newFiles);
             updateVariantStatus(project.id, variant.id, 'idle');
             saveCheckpoint(project.id, variant.id, `Feedback: ${prompt}`);
        } catch (e) {
            console.error(e);
            updateVariantStatus(project.id, variant.id, 'error', '// Feedback Iteration Failed');
            toast.error("Failed to apply feedback");
        }
    };

    return (
        <div className={cn("flex flex-col bg-[#121214] overflow-hidden relative w-full h-full", isFullScreen && "fixed inset-0 z-50")}>
            {/* Toolbar */}
            <div className="h-12 border-b border-white/5 bg-[#09090b] flex items-center justify-between px-4 shrink-0 z-10">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                    <button onClick={() => setDevice('desktop')} className={cn("p-1.5 rounded transition-colors", device === 'desktop' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}><Monitor size={16} /></button>
                    <button onClick={() => setDevice('tablet')} className={cn("p-1.5 rounded transition-colors", device === 'tablet' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}><Tablet size={16} /></button>
                    <button onClick={() => setDevice('mobile')} className={cn("p-1.5 rounded transition-colors", device === 'mobile' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}><Smartphone size={16} /></button>
                </div>

                <div className="flex items-center gap-2">
                     <button 
                        onClick={toggleAnnotationMode}
                        className={cn("p-2 rounded transition-all flex items-center gap-2 border border-transparent", isAnnotating ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "text-white/40 hover:bg-white/5 hover:text-white")}
                        title="Annotate & Edit"
                    >
                        <Pencil size={16} />
                        {isAnnotating && <span className="text-xs font-medium">Editing</span>}
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    <button 
                        onClick={handleBack}
                        className="p-2 rounded text-white/40 hover:bg-white/5 hover:text-white transition-all"
                        title="Go Back"
                    >
                        <ArrowLeft size={16} />
                    </button>

                    <button 
                        onClick={handleReload}
                        className="p-2 rounded text-white/40 hover:bg-white/5 hover:text-white transition-all"
                        title="Reload Preview"
                    >
                        <RefreshCw size={16} />
                    </button>
                    
                    <button 
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={cn("p-2 rounded text-white/40 hover:bg-white/5 hover:text-white transition-all", isFullScreen && "text-indigo-400")}
                        title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    >
                        {isFullScreen ? <X size={16} /> : <Maximize2 size={16} />}
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    {hasDarkModeSupport ? (
                        <button 
                            onClick={() => setDarkMode(!darkMode)}
                            className={cn("p-2 rounded text-white/40 hover:bg-white/5 hover:text-white transition-all", darkMode && "text-indigo-300")}
                            title="Toggle Theme Mode"
                        >
                            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    ) : (
                        <button 
                            onClick={handleGenerateTheme}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] hover:bg-indigo-500/20"
                        >
                            <Zap size={10} /> Generate Dark Mode
                        </button>
                    )}
                </div>
            </div>

            {/* Stage */}
            <div 
                ref={containerRef}
                className={cn("flex-1 flex items-center justify-center overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5 relative", isDesktop ? "p-0" : "p-8")}
            >
                <div 
                    className={cn("relative transition-all duration-300 ease-out shadow-2xl bg-white origin-center")}
                    style={{
                        width: isDesktop ? '100%' : dims.w,
                        height: isDesktop ? '100%' : dims.h,
                        transform: isDesktop ? 'none' : `scale(${scale})`,
                        borderRadius: isDesktop ? '0' : (device === 'tablet' ? '12px' : '24px'),
                        border: isDesktop ? 'none' : (device === 'tablet' ? '1px solid #333' : '8px solid #1a1a1a'),
                        overflow: 'hidden'
                    }}
                >
                    {variant ? (
                        isGenerating ? (
                            <div className="w-full h-full bg-[#09090b] relative flex flex-col p-6 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                                <div className="text-indigo-400 text-sm font-mono mb-4 flex items-center gap-3 z-10">
                                     <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                                     <span className="animate-pulse">Constructing Neural UI...</span>
                                </div>
                                <pre ref={codeScrollRef} className="text-xs font-mono text-green-400/80 overflow-hidden whitespace-pre-wrap break-all opacity-80 mask-image-b z-10">
                                    {variant.streamedCode || "Initializing..."}
                                </pre>
                            </div>
                        ) : (
                            <>
                                <Annotator 
                                    ref={annotatorRef}
                                    containerRef={containerRef}
                                    tool={activeTool} 
                                    color={brushColor} 
                                    isActive={isAnnotating} 
                                />
                                <iframe 
                                    ref={iframeRef}
                                    key={refreshKey}
                                    srcDoc={srcDoc}
                                    title="Preview"
                                    className="w-full h-full border-none bg-white"
                                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                                />
                            </>
                        )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-black/30">Waiting...</div>
                    )}
                </div>
            </div>

            {/* Floating Annotation Toolbar */}
            {isAnnotating && (
                <div 
                    className="absolute z-50 flex flex-col items-center gap-3"
                    style={{
                        bottom: '32px',
                        left: '50%',
                        transform: `translate(calc(-50% + ${toolbarPosition.x}px), ${toolbarPosition.y}px)`,
                        cursor: isDraggingRef.current ? 'grabbing' : 'default'
                    }}
                >
                    <div className="bg-[#18181b]/90 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 shadow-2xl">
                         <div 
                            onMouseDown={handleDragStart}
                            className="cursor-grab active:cursor-grabbing p-1 text-white/20 hover:text-white"
                         >
                            <GripVertical size={14} />
                         </div>
                         
                         {/* Tools */}
                         <div className="flex items-center gap-1">
                             <button onClick={() => setActiveTool('cursor')} className={cn("p-2 rounded-full transition-all", activeTool === 'cursor' ? "bg-white text-black" : "text-white/50 hover:text-white")}><MousePointer2 size={16} /></button>
                             <button onClick={() => setActiveTool('rect')} className={cn("p-2 rounded-full transition-all", activeTool === 'rect' ? "bg-white text-black" : "text-white/50 hover:text-white")}><Square size={16} /></button>
                             <button onClick={() => setActiveTool('text')} className={cn("p-2 rounded-full transition-all", activeTool === 'text' ? "bg-white text-black" : "text-white/50 hover:text-white")}><Type size={16} /></button>
                             <button onClick={() => setActiveTool('pen')} className={cn("p-2 rounded-full transition-all", activeTool === 'pen' ? "bg-white text-black" : "text-white/50 hover:text-white")}><Pencil size={16} /></button>
                         </div>

                         <div className="h-6 w-px bg-white/10" />

                         {/* Color */}
                         <div className="flex items-center gap-1">
                             {['#ef4444', '#22c55e', '#3b82f6', '#ffffff'].map(c => (
                                 <button 
                                    key={c} 
                                    onClick={() => setBrushColor(c)}
                                    className={cn("w-4 h-4 rounded-full border border-white/10 transition-transform", brushColor === c && "scale-125 border-white")}
                                    style={{ backgroundColor: c }}
                                 />
                             ))}
                             
                             {/* Custom Color Picker */}
                             <label className="relative w-4 h-4 rounded-full border border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:border-white/80 overflow-hidden">
                                <input 
                                    type="color" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0"
                                    onChange={(e) => setBrushColor(e.target.value)}
                                />
                                <Plus size={8} className="text-white/50" />
                             </label>
                             {/* Show currently selected custom color if not in presets */}
                             {!['#ef4444', '#22c55e', '#3b82f6', '#ffffff'].includes(brushColor) && (
                                <div 
                                    className="w-4 h-4 rounded-full border border-white scale-125 ml-1"
                                    style={{ backgroundColor: brushColor }}
                                />
                             )}
                         </div>

                         <div className="h-6 w-px bg-white/10" />

                         {/* History */}
                         <div className="flex items-center gap-1">
                            <button onClick={() => annotatorRef.current?.undo()} className="p-2 text-white/50 hover:text-white"><Undo2 size={16} /></button>
                            <button onClick={() => annotatorRef.current?.clear()} className="p-2 text-white/50 hover:text-red-400"><Eraser size={16} /></button>
                         </div>
                    </div>
                    
                    {/* Prompt Input */}
                    <div className="bg-[#18181b] border border-white/10 rounded-full p-1 pl-4 flex items-center w-[400px] shadow-2xl">
                        <input 
                            autoFocus
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendFeedback()}
                            placeholder="Add to chat (e.g., 'Make the box blue')..."
                            className="bg-transparent border-none outline-none text-sm text-white placeholder:text-white/30 flex-1"
                        />
                        <button 
                            onClick={handleSendFeedback}
                            className="p-2 bg-indigo-500 rounded-full text-white hover:bg-indigo-600 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
             
             {/* Full Screen Close Button Floating */}
             {isFullScreen && (
                <button 
                    onClick={() => setIsFullScreen(false)}
                    className="fixed top-4 right-4 z-[60] bg-black/50 hover:bg-red-500 text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/10"
                >
                    <X size={20} />
                </button>
             )}
        </div>
    );
};