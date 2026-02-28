/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { useProjectStore } from '../../store';
import { ProjectTabs } from './ProjectTabs';
import { InputDeck } from './InputDeck';
import DottedGlowBackground from '../DottedGlowBackground';
import { PlusIcon, Grid, Plus, Edit2, X, Dices, Download, Upload, FileJson } from 'lucide-react';
import ArtifactCard from '../ArtifactCard';
import { Variant } from '../../types';
import { toast } from 'sonner';
import { generateId } from '../../utils';
import { aiService } from '../../lib/ai/service';
import { RANDOM_STYLES } from '../../constants';
import { downloadProjectAsZip, exportProjectAsJson, importProjectFromJson } from '../../lib/export';

export const Dashboard = () => {
    const { 
        projects, activeProjectId, createProject, setViewMode, setActiveVariant,
        renameProject, addVariant, updateProject, settings: globalSettings,
        updateVariantStatus, setFiles, saveCheckpoint, toggleSettingsModal
    } = useProjectStore();

    const [isRenaming, setIsRenaming] = useState(false);
    const [showNewDesignModal, setShowNewDesignModal] = useState(false);
    
    // New Design Modal State
    const [newDesignTitle, setNewDesignTitle] = useState("New Style");
    const [newDesignName, setNewDesignName] = useState("");
    const [newDesignInstructions, setNewDesignInstructions] = useState("");
    const [attachedImages, setAttachedImages] = useState<string[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const activeProject = activeProjectId ? projects[activeProjectId] : null;
    const hasVariants = activeProject && Object.keys(activeProject.variants).length > 0;

    const handleImageUploadClick = () => {
        imageInputRef.current?.click();
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        setAttachedImages(prev => [...prev, reader.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
        if (e.target) e.target.value = '';
    };

    const removeAttachedImage = (index: number) => {
        setAttachedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleCardClick = (variantId: string) => {
        if (activeProject) {
            setActiveVariant(activeProject.id, variantId);
            setViewMode('editor');
        }
    };

    const handleExportProject = () => {
        if (activeProject) {
            exportProjectAsJson(activeProject);
            toast.success("Project exported");
        }
    };

    const handleDownloadAll = () => {
        if (activeProject) {
            downloadProjectAsZip(activeProject);
            toast.success("Project downloaded as Zip");
        }
    };

    const handleRenameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem('projectTitle') as HTMLInputElement;
        if (input && activeProject) {
            renameProject(activeProject.id, input.value);
        }
        setIsRenaming(false);
    };

    const handleCreateDesign = async () => {
        if (!activeProject) return;

        const apiKey = globalSettings.apiKeys.gemini;
        if (!apiKey) {
            toast.error("Gemini API Key missing");
            toggleSettingsModal(true);
            return;
        }

        const variantId = generateId();
        
        addVariant(activeProject.id, {
            id: variantId,
            rootId: variantId,
            name: newDesignName || "", 
            styleDirective: newDesignTitle,
            isMain: true,
            parentId: undefined,
            history: [],
            historyIndex: -1,
            status: 'generating',
            streamedCode: "// Connecting to AI Service...",
            settings: { ...activeProject.globalSettings, customInstructions: newDesignInstructions },
            currentFiles: []
        });

        setShowNewDesignModal(false);

        try {
            const combinedPrompt = `
Create a stunning, high-fidelity UI for the project: "${activeProject.title}".

**CONCEPTUAL DIRECTION: ${newDesignTitle}**
Interpret this as a physical/material metaphor. Let it drive every design decision — typography, color palette, textures, animations, and layout composition. Commit fully to this aesthetic.

${newDesignInstructions ? `**Additional Instructions:** ${newDesignInstructions}` : ''}
**Application Type:** ${activeProject.globalSettings.appType}.
${activeProject.globalSettings.theme ? `**Theme:** ${activeProject.globalSettings.theme} mode.` : ''}
            `;

            const files = await aiService.generateCode(
                combinedPrompt,
                { ...activeProject.globalSettings, customInstructions: newDesignInstructions },
                apiKey,
                attachedImages
            );
            
            setFiles(activeProject.id, variantId, files);
            updateVariantStatus(activeProject.id, variantId, 'idle');
            saveCheckpoint(activeProject.id, variantId, 'Initial Create');
            
            setNewDesignTitle("New Style");
            setNewDesignName("");
            setNewDesignInstructions("");
            setAttachedImages([]);

        } catch (e) {
            console.error(e);
            updateVariantStatus(activeProject.id, variantId, 'error', "// Error generating.");
            toast.error("Failed to generate design.");
        }
    };

    const randomizeNewDesignTitle = () => {
        setNewDesignTitle(RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)]);
    };

    return (
        <div className="relative w-full h-full flex flex-col bg-[#09090b] text-white overflow-hidden">
            <DottedGlowBackground 
                 gap={24} 
                 radius={1.5} 
                 color="rgba(255, 255, 255, 0.02)" 
                 glowColor="rgba(255, 255, 255, 0.15)" 
                 speedScale={0.5} 
            />
            
            <ProjectTabs />

            <div className="relative z-10 flex-1 flex flex-col pt-6 overflow-hidden">
                {activeProject ? (
                    hasVariants ? (
                        <div className="flex-1 flex flex-col px-8 overflow-y-auto pb-12">
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div className="group flex items-center gap-3">
                                    {isRenaming ? (
                                        <form onSubmit={handleRenameSubmit} onBlur={handleRenameSubmit}>
                                            <input 
                                                name="projectTitle"
                                                autoFocus
                                                type="text" 
                                                defaultValue={activeProject.title}
                                                className="text-2xl font-bold bg-transparent border-b border-white/20 outline-none text-white min-w-[200px]"
                                            />
                                        </form>
                                    ) : (
                                        <h2 
                                            onClick={() => setIsRenaming(true)}
                                            className="text-2xl font-bold text-white cursor-pointer flex items-center gap-3 hover:text-white/90"
                                        >
                                            {activeProject.title}
                                            <Edit2 size={16} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </h2>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleExportProject}
                                        className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-white/70"
                                        title="Export Project JSON"
                                    >
                                        <FileJson size={14} />
                                    </button>
                                    <button 
                                        onClick={handleDownloadAll}
                                        className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-white/70"
                                        title="Download All Variants (Zip)"
                                    >
                                        <Download size={14} />
                                    </button>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <button 
                                        onClick={() => createProject()} 
                                        className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
                                    >
                                        New Project
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {(Object.values(activeProject.variants) as Variant[])
                                    .filter(v => v.isMain)
                                    .map(variant => (
                                    <ArtifactCard 
                                        key={variant.id}
                                        variant={variant}
                                        onClick={() => handleCardClick(variant.id)}
                                    />
                                ))}

                                <button 
                                    onClick={() => setShowNewDesignModal(true)}
                                    className="h-[320px] rounded-xl border border-dashed border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-4 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus size={24} className="text-white/40 group-hover:text-white" />
                                    </div>
                                    <span className="text-sm text-white/40 font-medium group-hover:text-white/70">Create New Design</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            <InputDeck />
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-6 animate-in fade-in zoom-in duration-500">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                            <Grid size={32} className="text-white/40" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-white/90">Flash UI <span className="text-white/30 font-light">v2</span></h1>
                        <button 
                            onClick={() => createProject()}
                            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium hover:scale-105 transition-transform"
                        >
                            <PlusIcon size={18} />
                            Start New Project
                        </button>
                    </div>
                )}
            </div>

            {/* Create Design Modal */}
            {showNewDesignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-lg font-bold text-white">Create New Design</h3>
                            <button onClick={() => setShowNewDesignModal(false)} className="text-white/40 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Style Directive</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newDesignTitle}
                                        onChange={(e) => setNewDesignTitle(e.target.value)}
                                        className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
                                        placeholder="e.g. Minimalist"
                                    />
                                    <button 
                                        onClick={randomizeNewDesignTitle}
                                        className="p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 hover:text-indigo-400 transition-colors"
                                        title="Random Style"
                                    >
                                        <Dices size={18} />
                                    </button>
                                </div>
                            </div>
                             <div>
                                <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Variant Name (Optional)</label>
                                <input 
                                    type="text" 
                                    value={newDesignName}
                                    onChange={(e) => setNewDesignName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
                                    placeholder="My Cool Variant"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Extra Instructions</label>
                                <textarea 
                                    value={newDesignInstructions}
                                    onChange={(e) => setNewDesignInstructions(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50 min-h-[80px]"
                                    placeholder="Additional requirements for this design..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Reference Images</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {attachedImages.map((img, idx) => (
                                        <div key={idx} className="relative group">
                                            <img src={img} alt="Reference" className="h-12 w-12 object-cover rounded border border-white/10" />
                                            <button 
                                                onClick={() => removeAttachedImage(idx)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={8} />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={handleImageUploadClick}
                                        className="h-12 w-12 rounded border border-dashed border-white/20 flex items-center justify-center text-white/20 hover:text-white hover:border-white/40 transition-colors"
                                        title="Add Image"
                                    >
                                        <Upload size={14} />
                                    </button>
                                </div>
                                <input 
                                    type="file" 
                                    ref={imageInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    multiple
                                    onChange={handleImageChange} 
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={handleCreateDesign}
                                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                            >
                                Generate Design
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};