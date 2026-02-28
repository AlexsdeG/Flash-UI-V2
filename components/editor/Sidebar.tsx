/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../../store';
import { 
    ChevronLeft, Layers, Plus, MoreHorizontal, GitBranch, CheckCircle, Trash2, Edit2, Maximize,
    File, FileCode, FileType, Monitor, Code, Zap, X, Dices, Download
} from 'lucide-react';
import { cn, generateId } from '../../utils';
import { Variant } from '../../types';
import { toast } from 'sonner';
import { aiService } from '../../lib/ai/service';
import { RANDOM_STYLES } from '../../constants';
import { downloadVariantAsZip } from '../../lib/export';

export const Sidebar = () => {
    const { 
        projects, activeProjectId, setViewMode, setActiveVariant, 
        addVariant, deleteVariant, renameVariant, updateFile,
        addFile, deleteFile, renameFile, toggleFileOpen, 
        setEditorMode, setActiveFile, editorMode, settings,
        updateVariantStatus, setFiles, saveCheckpoint
    } = useProjectStore();

    const [tab, setTab] = useState<'variants' | 'files'>('variants');
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [variantToDelete, setVariantToDelete] = useState<string | null>(null);
    
    // Variant State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [isRenamingHeader, setIsRenamingHeader] = useState(false);

    // Fork Modal State
    const [forkModalOpen, setForkModalOpen] = useState(false);
    const [forkSourceId, setForkSourceId] = useState<string | null>(null);
    const [forkName, setForkName] = useState("");
    const [forkInstructions, setForkInstructions] = useState("");

    // File State
    const [newFileName, setNewFileName] = useState("");
    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [editFileName, setEditFileName] = useState("");

    const project = activeProjectId ? projects[activeProjectId] : null;
    const variant = project?.activeVariantId ? project.variants[project.activeVariantId] : null;

    const visibleVariants = useMemo(() => {
        if (!project || !project.activeVariantId) return [];
        const allVariants = Object.values(project.variants) as Variant[];
        const activeVar = project.variants[project.activeVariantId];
        const familyRootId = activeVar.rootId || (activeVar.parentId ? null : activeVar.id);
        if (!familyRootId) return allVariants;
        return allVariants.filter(v => v.rootId === familyRootId || v.id === familyRootId);
    }, [project]);

    if (!project) return null;

    // Helper for display name - prioritizing style directive if name is missing
    const getVariantDisplayName = (v: Variant) => {
        if (v.name && v.name.trim().length > 0) return v.name;
        if (v.styleDirective && v.styleDirective.trim().length > 0) return v.styleDirective;
        return 'Untitled';
    };

    const openForkModal = (sourceId: string) => {
        setForkSourceId(sourceId);
        setForkName("");
        setForkInstructions("");
        setForkModalOpen(true);
        setMenuOpenId(null);
    };

    const handleForkVariant = async () => {
         if (!forkSourceId) return;
         const sourceVar = project.variants[forkSourceId];
         if (!sourceVar) return;

         const apiKey = settings.apiKeys.gemini;
         if (!apiKey) {
            toast.error("API Key missing");
            return;
         }

         const newId = generateId();
         
         addVariant(project.id, {
             id: newId,
             rootId: sourceVar.rootId || sourceVar.id,
             name: forkName || `Fork of ${sourceVar.name}`,
             isMain: false,
             parentId: sourceVar.id,
             history: [],
             historyIndex: -1,
             status: 'generating',
             streamedCode: "// Forking and Modifying...",
             settings: { ...sourceVar.settings, customInstructions: forkInstructions },
             currentFiles: []
         });

         setActiveVariant(project.id, newId);
         setForkModalOpen(false);

         try {
             // Deep copy current files
             const filesCopy = JSON.parse(JSON.stringify(sourceVar.currentFiles));
             
             if (forkInstructions.trim()) {
                 const newFiles = await aiService.modifyCode(filesCopy, forkInstructions, apiKey);
                 setFiles(project.id, newId, newFiles);
                 updateVariantStatus(project.id, newId, 'idle');
                 saveCheckpoint(project.id, newId, `Fork with: ${forkInstructions}`);
             } else {
                 setFiles(project.id, newId, filesCopy);
                 updateVariantStatus(project.id, newId, 'idle');
                 saveCheckpoint(project.id, newId, 'Direct Fork');
             }

         } catch (e) {
             console.error(e);
             updateVariantStatus(project.id, newId, 'error', "// Error processing fork");
             toast.error("Forking failed");
         }
    };

    const handleRandomVariation = async () => {
        if (!variant) return;

        const apiKey = settings.apiKeys.gemini;
        if (!apiKey) {
           toast.error("API Key missing");
           return;
        }

        const newId = generateId();
        const randomStyle = RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)];

        addVariant(project.id, {
            id: newId,
            rootId: variant.rootId || variant.id,
            name: `Mix: ${randomStyle}`,
            styleDirective: randomStyle,
            isMain: false,
            parentId: variant.id,
            history: [],
            historyIndex: -1,
            status: 'generating',
            streamedCode: `// Applying Radical Style Transfer: ${randomStyle}...`,
            settings: variant.settings,
            currentFiles: []
        });

        setActiveVariant(project.id, newId);

        try {
            const filesCopy = JSON.parse(JSON.stringify(variant.currentFiles));
            const newFiles = await aiService.modifyCode(
                filesCopy, 
                "Re-imagine this entire interface in the requested style. Change layout, colors, fonts, and vibes completely.", 
                apiKey,
                randomStyle // Pass the style directive explicitly
            );
            
            setFiles(project.id, newId, newFiles);
            updateVariantStatus(project.id, newId, 'idle');
            saveCheckpoint(project.id, newId, `Random Mix: ${randomStyle}`);

        } catch (e) {
            console.error(e);
            updateVariantStatus(project.id, newId, 'error', "// Mix Failed");
            toast.error("Variation Failed");
        }
    };

    const handleFullBuild = async (sourceId: string) => {
        setMenuOpenId(null);
        const sourceVar = project.variants[sourceId];
        const apiKey = settings.apiKeys.gemini;
        
        if (!apiKey) {
             toast.error("API Key missing");
             return;
        }

        const newId = generateId();
        
        addVariant(project.id, {
             id: newId,
             rootId: sourceVar.rootId || sourceVar.id,
             name: `${sourceVar.name} (Full Build)`,
             isMain: false,
             parentId: sourceVar.id,
             history: [],
             historyIndex: -1,
             status: 'generating',
             streamedCode: "// Constructing Full Application Architecture...",
             settings: sourceVar.settings,
             currentFiles: []
        });

        setActiveVariant(project.id, newId);

        try {
            const filesCopy = JSON.parse(JSON.stringify(sourceVar.currentFiles));
            const newFiles = await aiService.fullBuild(filesCopy, apiKey);
            
            setFiles(project.id, newId, newFiles);
            updateVariantStatus(project.id, newId, 'idle');
            saveCheckpoint(project.id, newId, 'Full Build Generation');
            toast.success("Full Build Complete");

        } catch (e) {
            console.error(e);
            updateVariantStatus(project.id, newId, 'error', "// Build Failed");
            toast.error("Full Build Failed");
        }
    };

    // ... (Existing file handlers remain same, just ensure they are included)
    const handleCreateFile = () => {
        if (!variant || !newFileName.trim()) { setIsCreatingFile(false); setNewFileName(""); return; }
        const ext = newFileName.split('.').pop() as any;
        addFile(project.id, variant.id, newFileName, ext);
        setIsCreatingFile(false); setNewFileName("");
    };
    const handleFileClick = (fileName: string) => {
        if (variant) {
            const file = variant.currentFiles.find(f => f.name === fileName);
            if (file && !file.isOpen) toggleFileOpen(project.id, variant.id, fileName, true);
            setActiveFile(project.id, variant.id, fileName); setEditorMode('code');
        }
    };
    const handleDeleteFile = (e: React.MouseEvent, fileName: string) => {
        e.stopPropagation(); setFileToDelete(fileName);
    };
    const confirmDeleteFile = () => {
        if (variant && fileToDelete) { deleteFile(project.id, variant.id, fileToDelete); toast.success("File deleted"); setFileToDelete(null); }
    };
    const startFileRename = (e: React.MouseEvent, fileName: string) => {
        e.stopPropagation(); setEditingFile(fileName); setEditFileName(fileName);
    };
    const submitFileRename = () => {
        if (variant && editingFile && editFileName.trim() && editFileName !== editingFile) renameFile(project.id, variant.id, editingFile, editFileName);
        setEditingFile(null);
    };
    const startRename = (e: React.MouseEvent, variant: Variant) => {
        e.stopPropagation(); setEditingId(variant.id); setEditName(variant.name); setMenuOpenId(null);
    };
    const submitRename = () => {
        if (editingId && editName.trim()) renameVariant(project.id, editingId, editName);
        setEditingId(null);
    };
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); 
        setVariantToDelete(id);
        setMenuOpenId(null);
    };
    const confirmDeleteVariant = () => {
        if (variantToDelete) {
            deleteVariant(project.id, variantToDelete);
            toast.success("Variant deleted");
            setVariantToDelete(null);
        }
    };

    const submitHeaderRename = (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent) => {
        if (variant && editName.trim()) renameVariant(project.id, variant.id, editName);
        setIsRenamingHeader(false);
    };
    const handleCancelCreateFile = () => { setIsCreatingFile(false); setNewFileName(""); };

    return (
        <div className="flex flex-col h-full bg-[#09090b]" onClick={() => setMenuOpenId(null)}>
            
            {/* Top Toolbar */}
            <div className="p-3 border-b border-white/5 flex justify-center">
                <div className="flex bg-white/5 p-0.5 rounded-lg w-full">
                    <button 
                        onClick={() => setEditorMode('preview')}
                        className={cn("flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all", editorMode === 'preview' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white")}
                    >
                        <Monitor size={14} /> Preview
                    </button>
                    <button 
                        onClick={() => setEditorMode('code')}
                        className={cn("flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all", editorMode === 'code' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white")}
                    >
                        <Code size={14} /> Code
                    </button>
                </div>
            </div>

            <div className="h-10 flex items-center px-4 shrink-0">
                <button onClick={() => setViewMode('dashboard')} className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 hover:text-white transition-colors">
                    <ChevronLeft size={12} /> Back to Dashboard
                </button>
            </div>

            {/* Header */}
            <div className="px-4 pb-4 border-b border-white/5">
                <div className="mb-2">
                    {variant && (
                        isRenamingHeader ? (
                            <input autoFocus type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={submitHeaderRename} onKeyDown={(e) => e.key === 'Enter' && submitHeaderRename(e)} className="w-full bg-black/50 border border-indigo-500/50 rounded px-1 py-0.5 text-sm font-semibold text-white outline-none" />
                        ) : (
                            <div className="group flex items-center gap-2">
                                <h2 
                                    className={cn("font-semibold truncate text-sm cursor-pointer", !variant.name && !variant.styleDirective ? "text-white/30 italic" : "text-white/90")}
                                    onClick={() => { setEditName(getVariantDisplayName(variant)); setIsRenamingHeader(true); }}
                                >
                                    {getVariantDisplayName(variant)}
                                </h2>
                                <button onClick={() => { setEditName(getVariantDisplayName(variant)); setIsRenamingHeader(true); }} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white transition-opacity"><Edit2 size={12} /></button>
                            </div>
                        )
                    )}
                </div>
                {variant?.styleDirective && <span className="inline-block bg-white/5 text-white/50 text-[10px] px-2 py-0.5 rounded border border-white/5 truncate max-w-full">{variant.styleDirective}</span>}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 px-4 mt-2 text-xs font-medium text-white/40 border-b border-white/5">
                <button onClick={() => setTab('variants')} className={cn("hover:text-white transition-colors py-2 border-b-2", tab === 'variants' ? "text-white border-indigo-500" : "border-transparent")}>Variants</button>
                <button onClick={() => setTab('files')} className={cn("hover:text-white transition-colors py-2 border-b-2", tab === 'files' ? "text-white border-indigo-500" : "border-transparent")}>Files</button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                {tab === 'variants' && (
                    <div className="flex flex-col gap-1 px-2">
                         <div className="px-2 flex items-center justify-between mb-2 mt-2">
                            <span className="text-xs font-medium text-white/40 flex items-center gap-1.5"><Layers size={12} /> Family Tree</span>
                            <button onClick={() => variant && openForkModal(variant.id)} className="text-white/20 hover:text-white"><Plus size={14} /></button>
                        </div>
                        {visibleVariants.map(v => (
                            <div 
                                key={v.id}
                                onClick={() => setActiveVariant(project.id, v.id)}
                                className={cn("group relative flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all", project.activeVariantId === v.id ? "bg-white/10 border-white/10" : "bg-transparent border-transparent hover:bg-white/5")}
                            >
                                <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/5 relative shrink-0">
                                    <span className="text-[10px] font-bold text-indigo-300">
                                        {(getVariantDisplayName(v)).charAt(0)}
                                    </span>
                                    {project.activeVariantId === v.id && <div className="absolute -top-1 -right-1"><CheckCircle size={10} className="text-green-500 fill-black" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={cn("text-xs font-medium truncate", project.activeVariantId === v.id ? "text-white" : "text-white/70")}>
                                        {getVariantDisplayName(v)}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === v.id ? null : v.id); }} className={cn("p-1 rounded text-white/20 hover:text-white hover:bg-white/10", menuOpenId === v.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}><MoreHorizontal size={14} /></button>
                                
                                {menuOpenId === v.id && (
                                    <div className="absolute right-0 top-8 w-48 bg-[#18181b] border border-white/10 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                                         <button onClick={(e) => { e.stopPropagation(); openForkModal(v.id); }} className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white flex items-center gap-2"><GitBranch size={12} /> Fork Variant</button>
                                         <button onClick={(e) => { e.stopPropagation(); handleFullBuild(v.id); }} className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-white/5 hover:text-indigo-300 flex items-center gap-2"><Zap size={12} /> Full Build</button>
                                         <button onClick={(e) => { e.stopPropagation(); downloadVariantAsZip(v); toast.success("Downloading Zip..."); }} className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white flex items-center gap-2"><Download size={12} /> Download Code</button>
                                        <div className="h-px bg-white/5 my-1" />
                                        <button onClick={(e) => startRename(e, v)} className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 flex items-center gap-2"><Edit2 size={12} /> Rename</button>
                                        <button onClick={(e) => handleDelete(e, v.id)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={12} /> Delete</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Dotted Random Variation Button */}
                        <div 
                            onClick={handleRandomVariation}
                            className="mt-2 mx-1 border border-dashed border-white/10 rounded-lg p-3 cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group flex items-center justify-center gap-2"
                        >
                             <Dices size={14} className="text-white/20 group-hover:text-indigo-400 transition-colors" />
                             <span className="text-xs text-white/30 group-hover:text-indigo-300 transition-colors">Radical Variation</span>
                        </div>
                    </div>
                )}

                {tab === 'files' && variant && (
                    <div className="px-4 pt-2">
                         <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-medium text-white/40">Project Files</span>
                            <button onClick={() => setIsCreatingFile(true)} className="text-white/20 hover:text-white"><Plus size={14} /></button>
                        </div>
                        {isCreatingFile && (
                            <div className="mb-2 flex items-center gap-2">
                                <File size={12} className="text-white/40" />
                                <input autoFocus type="text" value={newFileName} onChange={(e) => setNewFileName(e.target.value)} onBlur={handleCreateFile} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); if (e.key === 'Escape') handleCancelCreateFile(); }} className="bg-black/50 border border-indigo-500/50 rounded px-1 py-0.5 text-xs text-white outline-none w-full" placeholder="filename.css" />
                            </div>
                        )}
                        <div className="space-y-1">
                            {variant.currentFiles.map(file => (
                                <div key={file.name} className={cn("group flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors", variant.activeFileName === file.name ? "bg-indigo-500/10 text-white" : "hover:bg-white/5 text-white/70 hover:text-white")} onClick={() => handleFileClick(file.name)}>
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        {file.name.endsWith('.css') ? <FileType size={12} className="text-blue-400 shrink-0" /> : <FileCode size={12} className="text-orange-400 shrink-0" />}
                                        {editingFile === file.name ? (
                                             <input autoFocus type="text" value={editFileName} onChange={(e) => setEditFileName(e.target.value)} onBlur={submitFileRename} onKeyDown={(e) => e.key === 'Enter' && submitFileRename()} onClick={(e) => e.stopPropagation()} className="bg-black/50 border border-indigo-500/50 rounded px-1 py-0 text-xs text-white outline-none w-full" />
                                        ) : (
                                            <span className="text-xs truncate">{file.name}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => startFileRename(e, file.name)} className="text-white/20 hover:text-white p-1 hover:bg-white/10 rounded"><Edit2 size={10} /></button>
                                        <button onClick={(e) => handleDeleteFile(e, file.name)} className="text-white/20 hover:text-red-400 p-1 hover:bg-white/10 rounded"><Trash2 size={10} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {fileToDelete && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-white/10 p-4 rounded-lg shadow-xl w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-sm font-semibold text-white mb-2">Delete File?</h3>
                        <p className="text-xs text-white/70 mb-4">Delete <span className="text-white">{fileToDelete}</span>?</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setFileToDelete(null); }} className="px-3 py-1.5 text-xs text-white/70 hover:text-white rounded">Cancel</button>
                            <button onClick={(e) => { e.stopPropagation(); confirmDeleteFile(); }} className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded">Delete</button>
                        </div>
                    </div>
                </div>
            )}
            
            {variantToDelete && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-white/10 p-4 rounded-lg shadow-xl w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-sm font-semibold text-white mb-2">Delete Variant?</h3>
                        <p className="text-xs text-white/70 mb-4">Are you sure you want to delete this variant?</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setVariantToDelete(null); }} className="px-3 py-1.5 text-xs text-white/70 hover:text-white rounded">Cancel</button>
                            <button onClick={(e) => { e.stopPropagation(); confirmDeleteVariant(); }} className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {forkModalOpen && (
                 <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white">Fork & Modify</h3>
                            <button onClick={() => setForkModalOpen(false)} className="text-white/40 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="space-y-4">
                             <div>
                                <label className="text-[10px] uppercase text-white/40 font-bold mb-1 block">Variant Name</label>
                                <input type="text" value={forkName} onChange={(e) => setForkName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50" placeholder="Variant Name" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-white/40 font-bold mb-1 block">Modification Instructions</label>
                                <textarea value={forkInstructions} onChange={(e) => setForkInstructions(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50 min-h-[80px]" placeholder="e.g. Change color scheme to blue, add a footer..." />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleForkVariant} className="bg-white text-black px-4 py-2 rounded text-xs font-bold hover:bg-gray-200">Fork Design</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};