/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState } from 'react';
import { useProjectStore } from '../../store';
import { 
    Sparkles, Settings2, Trash2, Plus, Zap, Cpu, Dices, ChevronDown, LayoutTemplate, Palette, X, Edit2, Upload
} from 'lucide-react';
import { cn, generateId } from '../../utils';
import { toast } from 'sonner';
import { aiService } from '../../lib/ai/service';
import { RANDOM_STYLES, INITIAL_PLACEHOLDERS } from '../../constants';
import { importProjectFromJson } from '../../lib/export';
import { AI_MODELS } from '../../config/models';

const APP_TYPES = [
    { id: 'landing_page', label: 'Landing Page' },
    { id: 'dashboard', label: 'SaaS Dashboard' },
    { id: 'mobile_app', label: 'Mobile App' },
    { id: 'ecommerce', label: 'E-Commerce' },
    { id: 'blog', label: 'Blog / Content' },
    { id: 'custom', label: 'Custom Application...' }
];

const DEFAULT_COLORS = [
    '#ffffff', '#000000', '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

export const InputDeck = () => {
    const { 
        projects, activeProjectId, updateProject, updateCardConfig, addCardConfig, 
        removeCardConfig, updateProjectSettings, addVariant, setViewMode, settings: globalSettings,
        updateVariantStatus, setFiles, saveCheckpoint, toggleSettingsModal, importProject
    } = useProjectStore();

    const [showSettings, setShowSettings] = useState(false);
    const [configCardId, setConfigCardId] = useState<string | null>(null);
    const [customColors, setCustomColors] = useState<string[]>([]);
    const [editingCardName, setEditingCardName] = useState<string | null>(null);
    const [attachedImages, setAttachedImages] = useState<string[]>([]);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    // Load custom colors
    useEffect(() => {
        const saved = localStorage.getItem('flashui_custom_colors');
        if (saved) setCustomColors(JSON.parse(saved));
    }, []);

    // Cycle placeholder prompts
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % INITIAL_PLACEHOLDERS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const project = await importProjectFromJson(file);
                importProject(project);
                toast.success("Project imported successfully");
            } catch (err) {
                console.error(err);
                toast.error("Failed to import project");
            }
        }
        // Reset input
        if (e.target) e.target.value = '';
    };

    const saveCustomColors = (colors: string[]) => {
        setCustomColors(colors);
        localStorage.setItem('flashui_custom_colors', JSON.stringify(colors));
    };

    const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        if (!customColors.includes(color)) {
            saveCustomColors([...customColors, color]);
        }
    };

    const removeCustomColor = (e: React.MouseEvent, color: string) => {
        e.stopPropagation();
        saveCustomColors(customColors.filter(c => c !== color));
    };

    const activeProject = activeProjectId ? projects[activeProjectId] : null;
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [activeProject?.prompt]);

    if (!activeProject) return <div className="text-white/30 p-10">No project selected</div>;

    const handleRandomizeStyle = (cardId: string) => {
        const randomStyle = RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)];
        updateCardConfig(activeProject.id, cardId, { styleDirective: randomStyle });
    };

    const handleGenerate = async () => {
        if (!activeProject.prompt.trim()) return;
        
        const apiKey = globalSettings.apiKeys.gemini;
        if (!apiKey) {
            toast.error("Gemini API Key missing. Please check settings.");
            toggleSettingsModal(true);
            return;
        }

        toast.info("Generating Variants...");
        
        // Generate a creative title for the project
        aiService.generateProjectTitle(activeProject.prompt, apiKey)
            .then(title => {
                updateProject(activeProject.id, { title });
            })
            .catch(err => console.error("Title generation failed", err));

        setViewMode('dashboard');
        
        activeProject.cardConfigs.forEach(async (card, index) => {
            const variantId = generateId();
            
            // Initial optimistic variant
            addVariant(activeProject.id, {
                id: variantId,
                rootId: variantId, 
                name: card.name || "", 
                styleDirective: card.styleDirective,
                isMain: true, 
                parentId: undefined,
                history: [],
                historyIndex: -1,
                status: 'generating',
                streamedCode: "// Connecting to Neural Network...",
                settings: { 
                    ...activeProject.globalSettings,
                    ...card.settings
                },
                currentFiles: []
            });

            try {
                const combinedPrompt = `
Create a stunning, high-fidelity UI for: "${activeProject.prompt}".

**CONCEPTUAL DIRECTION: ${card.styleDirective}**
Interpret this as a physical/material metaphor. Let it drive every design decision — typography, color palette, textures, animations, and layout composition. Commit fully to this aesthetic.

${card.settings?.customInstructions ? `**Additional Instructions:** ${card.settings.customInstructions}` : ''}
**Application Type:** ${activeProject.globalSettings.appType}.
${activeProject.globalSettings.theme ? `**Theme:** ${activeProject.globalSettings.theme} mode.` : ''}
${activeProject.globalSettings.colors?.length ? `**Brand Colors:** ${activeProject.globalSettings.colors.join(', ')}.` : ''}
                `;

                const files = await aiService.generateCode(
                    combinedPrompt, 
                    { ...activeProject.globalSettings, ...card.settings }, 
                    apiKey,
                    attachedImages
                );

                setFiles(activeProject.id, variantId, files);
                updateVariantStatus(activeProject.id, variantId, 'idle');
                saveCheckpoint(activeProject.id, variantId, 'Initial Generation');

            } catch (error) {
                console.error(error);
                updateVariantStatus(activeProject.id, variantId, 'error', "// Error generating code. Check API Key.");
                toast.error("Generation failed for one or more variants.");
            }
        });
    };

    const toggleColor = (color: string) => {
        const currentColors = activeProject.globalSettings.colors || [];
        const newColors = currentColors.includes(color) 
            ? currentColors.filter(c => c !== color)
            : [color]; 
        updateProjectSettings(activeProject.id, { colors: newColors });
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
            
            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 pb-2">
                    What are we building?
                </h1>
                <p className="text-white/40">Describe your interface. We'll generate the code.</p>
                
                <div className="mt-4 flex justify-center">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json" 
                        onChange={handleFileChange} 
                    />
                    <button 
                        onClick={handleImportClick}
                        className="text-xs text-white/30 hover:text-white flex items-center gap-2 transition-colors border border-white/5 hover:border-white/20 bg-white/5 px-3 py-1.5 rounded-full"
                    >
                        <Upload size={12} />
                        Or import an existing project JSON
                    </button>
                </div>
            </div>

            {/* --- Main Input Area --- */}
            <div className="relative group mb-10 z-20">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition duration-700"></div>
                <div className="relative bg-[#09090b] border border-white/10 rounded-xl p-6 shadow-2xl">
                    
                    {/* Attached Images */}
                    {attachedImages.length > 0 && (
                        <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                            {attachedImages.map((img, idx) => (
                                <div key={idx} className="relative group shrink-0">
                                    <img src={img} alt="Reference" className="h-16 w-16 object-cover rounded-lg border border-white/10" />
                                    <button 
                                        onClick={() => removeAttachedImage(idx)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <textarea
                        ref={textAreaRef}
                        value={activeProject.prompt}
                        onChange={(e) => updateProject(activeProject.id, { prompt: e.target.value })}
                        placeholder={INITIAL_PLACEHOLDERS[placeholderIndex]}
                        className="w-full bg-transparent border-none outline-none text-xl font-light text-white placeholder:text-white/20 resize-none min-h-[60px]"
                        rows={1}
                        autoFocus
                    />
                    
                    <div className="flex items-center justify-between mt-6 border-t border-white/5 pt-4">
                        <div className="flex items-center gap-3">
                             <input 
                                type="file" 
                                ref={imageInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                multiple
                                onChange={handleImageChange} 
                            />
                            <button 
                                onClick={handleImageUploadClick}
                                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                title="Attach Reference Image"
                            >
                                <Upload size={16} />
                            </button>

                             <button 
                                onClick={() => setShowSettings(!showSettings)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium",
                                    showSettings ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-transparent text-white/40 hover:text-white"
                                )}
                            >
                                <Settings2 size={14} />
                                Configuration
                                <ChevronDown size={12} className={cn("transition-transform", showSettings && "rotate-180")} />
                            </button>

                            <div className="h-6 w-px bg-white/10 mx-1"></div>
                             <select 
                                className="bg-transparent text-xs text-white/60 hover:text-white outline-none cursor-pointer border border-transparent hover:border-white/10 rounded px-2 py-1"
                                value={activeProject.globalSettings.model}
                                onChange={(e) => updateProjectSettings(activeProject.id, { model: e.target.value })}
                            >
                                {AI_MODELS.map(model => (
                                    <option key={model.id} value={model.id}>{model.name}</option>
                                ))}
                            </select>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            className="bg-white text-black px-8 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            disabled={!activeProject.prompt.trim()}
                        >
                            <Sparkles size={16} />
                            Generate Variants
                        </button>
                    </div>

                    {/* Expandable Settings Panel */}
                    {showSettings && (
                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Application Type</label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {APP_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => updateProjectSettings(activeProject.id, { appType: type.id as any })}
                                            className={cn(
                                                "text-left text-xs px-3 py-2 rounded border transition-all truncate",
                                                activeProject.globalSettings.appType === type.id
                                                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-200"
                                                    : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                                            )}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                                {activeProject.globalSettings.appType === 'custom' && (
                                    <input 
                                        type="text"
                                        placeholder="e.g. CRM, Music Player, Game..."
                                        value={activeProject.globalSettings.customAppType || ''}
                                        onChange={(e) => updateProjectSettings(activeProject.id, { customAppType: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                                    />
                                )}
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Theme Mode</label>
                                    <div className="flex bg-white/5 p-1 rounded-lg inline-flex">
                                        {['dark', 'light'].map(theme => (
                                            <button
                                                key={theme}
                                                onClick={() => updateProjectSettings(activeProject.id, { theme: theme as any })}
                                                className={cn(
                                                    "px-4 py-1.5 rounded text-xs capitalize transition-all",
                                                    activeProject.globalSettings.theme === theme 
                                                        ? "bg-white/10 text-white shadow-sm" 
                                                        : "text-white/40 hover:text-white"
                                                )}
                                            >
                                                {theme}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Brand Colors</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DEFAULT_COLORS.concat(customColors).map(color => (
                                            <div key={color} className="relative group">
                                                <button
                                                    onClick={() => toggleColor(color)}
                                                    className={cn(
                                                        "w-6 h-6 rounded-full border transition-all",
                                                        activeProject.globalSettings.colors?.includes(color)
                                                            ? "border-white scale-110 shadow-lg"
                                                            : "border-transparent opacity-70 hover:opacity-100 hover:scale-110"
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                />
                                                {customColors.includes(color) && (
                                                    <button 
                                                        onClick={(e) => removeCustomColor(e, color)}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        x
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <label className="w-6 h-6 rounded-full border border-dashed border-white/30 flex items-center justify-center text-white/40 hover:text-white hover:border-white/60 transition-colors cursor-pointer relative overflow-hidden">
                                            <input 
                                                type="color" 
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full p-0 border-0" 
                                                onChange={handleColorInput} 
                                            />
                                            <Plus size={12} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Style Stack --- */}
            <div className="space-y-4">
                <div className="flex items-center justify-between text-white/50 text-sm px-1">
                    <span className="flex items-center gap-2 uppercase tracking-wider font-semibold text-[10px]">
                        <LayoutTemplate size={14} />
                        Style Stack
                    </span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/30">{activeProject.cardConfigs.length} Variants</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeProject.cardConfigs.map((card, index) => (
                        <div 
                            key={card.id} 
                            className="group relative bg-[#121214] border border-white/5 rounded-xl p-5 transition-all hover:border-white/20 hover:bg-[#18181b] hover:-translate-y-1"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-[10px] font-mono font-bold text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                                    0{index + 1}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => setConfigCardId(card.id)}
                                        className="text-white/20 hover:text-white transition-colors"
                                        title="Configure Style"
                                    >
                                        <Settings2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleRandomizeStyle(card.id)}
                                        className="text-white/20 hover:text-indigo-400 transition-colors"
                                        title="Randomize Style"
                                    >
                                        <Dices size={14} />
                                    </button>
                                    {activeProject.cardConfigs.length > 1 && (
                                        <button 
                                            onClick={() => removeCardConfig(activeProject.id, card.id)}
                                            className="text-white/20 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <label className="block text-[10px] uppercase text-white/40 mb-2 font-medium flex justify-between">
                                    Variant Name
                                    {editingCardName !== card.id && (
                                        <span onClick={() => setEditingCardName(card.id)} className="cursor-pointer hover:text-white"><Edit2 size={10}/></span>
                                    )}
                                </label>
                                {editingCardName === card.id ? (
                                    <input 
                                        type="text"
                                        autoFocus
                                        value={card.name || ''}
                                        onChange={(e) => updateCardConfig(activeProject.id, card.id, { name: e.target.value })}
                                        onBlur={() => setEditingCardName(null)}
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingCardName(null)}
                                        className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm text-white/90 focus:border-indigo-500/50 outline-none transition-colors placeholder:text-white/10"
                                        placeholder="e.g. Hero Section V1"
                                    />
                                ) : (
                                    <div 
                                        onClick={() => setEditingCardName(card.id)}
                                        className="w-full bg-white/5 border border-transparent rounded-lg px-3 py-2 text-sm text-white/90 truncate cursor-pointer hover:bg-white/10"
                                    >
                                        {card.name || <span className="text-white/30 italic">Untitled</span>}
                                    </div>
                                )}
                            </div>

                            <label className="block text-[10px] uppercase text-white/40 mb-2 font-medium">Style Directive</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={card.styleDirective}
                                    onChange={(e) => updateCardConfig(activeProject.id, card.id, { styleDirective: e.target.value })}
                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm text-white/90 focus:border-indigo-500/50 outline-none transition-colors placeholder:text-white/10 pl-8"
                                    placeholder="e.g. Minimalist, Brutalist..."
                                />
                                <div className="absolute left-3 top-2.5 text-white/20">
                                    <Palette size={14} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {activeProject.cardConfigs.length < 5 && (
                        <button 
                            onClick={() => addCardConfig(activeProject.id)}
                            className="flex flex-col items-center justify-center gap-3 bg-transparent border border-dashed border-white/10 rounded-xl p-4 text-white/20 hover:text-white/60 hover:border-white/30 hover:bg-white/5 transition-all h-full min-h-[160px]"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                <Plus size={20} />
                            </div>
                            <span className="text-xs font-medium">Add Variant</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Config Modal */}
            {configCardId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-lg font-bold text-white">Configure Variant</h3>
                            <button onClick={() => setConfigCardId(null)} className="text-white/40 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-sm text-white/60">
                                Specific settings for this style card. Overrides global project settings.
                            </p>
                             <div>
                                <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Specific Instructions</label>
                                <textarea 
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50 min-h-[80px]"
                                    placeholder="Add extra instructions for this variant (e.g. 'Use heavy shadows')"
                                    onChange={(e) => updateCardConfig(activeProject.id, configCardId!, { settings: { ...activeProject.cardConfigs.find(c => c.id === configCardId)?.settings, customInstructions: e.target.value } })}
                                ></textarea>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={() => setConfigCardId(null)}
                                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};