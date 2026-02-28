/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import { produce } from 'immer';
import { AppState, Project, Variant, GlobalSettings, ArtifactCardConfig, GenerationSettings, FileAsset, HistoryStep } from './types';
import { generateId } from './utils';
import { DEFAULT_MODEL } from './config/models';

interface ProjectStore extends AppState {
    // Actions
    createProject: (title?: string) => string;
    closeProject: (id: string) => void;
    setActiveProject: (id: string | null) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    renameProject: (id: string, title: string) => void;
    
    // Variant Actions
    addVariant: (projectId: string, variant: Variant) => void;
    deleteVariant: (projectId: string, variantId: string) => void;
    renameVariant: (projectId: string, variantId: string, newName: string) => void;
    setActiveVariant: (projectId: string, variantId: string) => void;
    updateVariantStatus: (projectId: string, variantId: string, status: Variant['status'], streamedCode?: string) => void;
    
    // File Actions
    updateFile: (projectId: string, variantId: string, fileName: string, content: string) => void;
    addFile: (projectId: string, variantId: string, fileName: string, language: FileAsset['language']) => void;
    deleteFile: (projectId: string, variantId: string, fileName: string) => void;
    renameFile: (projectId: string, variantId: string, oldName: string, newName: string) => void;
    toggleFileOpen: (projectId: string, variantId: string, fileName: string, isOpen: boolean) => void;
    setActiveFile: (projectId: string, variantId: string, fileName: string) => void;
    setFiles: (projectId: string, variantId: string, files: FileAsset[]) => void;

    // History Actions
    saveCheckpoint: (projectId: string, variantId: string, description: string) => void;
    undo: (projectId: string, variantId: string) => void;
    redo: (projectId: string, variantId: string) => void;

    // Config Actions
    updateCardConfig: (projectId: string, cardId: string, updates: Partial<ArtifactCardConfig>) => void;
    addCardConfig: (projectId: string) => void;
    removeCardConfig: (projectId: string, cardId: string) => void;
    updateProjectSettings: (projectId: string, settings: Partial<GenerationSettings>) => void;

    // Settings
    updateSettings: (updates: Partial<GlobalSettings>) => void;
    setApiKey: (provider: 'gemini' | 'openrouter', key: string) => void;
    toggleSettingsModal: (isOpen: boolean) => void;

    importProject: (project: Project) => void;

    setViewMode: (mode: 'dashboard' | 'editor') => void;
    setEditorMode: (mode: 'preview' | 'code') => void;
}

// Safely retrieve env var
const getEnvApiKey = () => {
    try {
        // @ts-ignore
        return process.env.GEMINI_API_KEY || '';
    } catch {
        return '';
    }
};

const INITIAL_SETTINGS: GlobalSettings = {
    defaultProvider: 'gemini',
    apiKeys: {
        gemini: getEnvApiKey() || localStorage.getItem('flashui_gemini_key') || '',
        openrouter: localStorage.getItem('flashui_openrouter_key') || ''
    },
    theme: 'dark',
    customModels: []
};

const DEFAULT_GEN_SETTINGS: GenerationSettings = {
    model: DEFAULT_MODEL,
    temperature: 0.7,
    provider: 'gemini',
    appType: 'landing_page',
    framework: 'vanilla',
    theme: 'dark',
    colors: []
};

const DEFAULT_CARDS: ArtifactCardConfig[] = [
    { id: 'c1', styleDirective: 'Minimalist & Clean', isGenerated: false },
    { id: 'c2', styleDirective: 'Bold & Brutalist', isGenerated: false },
    { id: 'c3', styleDirective: 'Glassmorphic & Futuristic', isGenerated: false },
];

export const useProjectStore = create<ProjectStore>((set, get) => ({
    projects: {},
    activeProjectId: null,
    viewMode: 'dashboard',
    editorMode: 'preview',
    settings: INITIAL_SETTINGS,
    isSettingsOpen: false,

    createProject: (title) => {
        const id = generateId();
        const newProject: Project = {
            id,
            title: title || 'Untitled Project',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            activeVariantId: null,
            variants: {},
            prompt: '',
            cardConfigs: JSON.parse(JSON.stringify(DEFAULT_CARDS)), 
            globalSettings: { ...DEFAULT_GEN_SETTINGS }
        };

        set(produce((state: AppState) => {
            state.projects[id] = newProject;
            state.activeProjectId = id;
            state.viewMode = 'dashboard'; 
        }));

        return id;
    },

    closeProject: (id) => {
        set(produce((state: AppState) => {
            delete state.projects[id];
            if (state.activeProjectId === id) {
                const remainingIds = Object.keys(state.projects);
                state.activeProjectId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null;
            }
        }));
    },

    renameProject: (id, title) => {
        set(produce((state: AppState) => {
            if (state.projects[id]) {
                state.projects[id].title = title;
            }
        }));
    },

    setActiveProject: (id) => {
        set(produce((state: AppState) => {
            state.activeProjectId = id;
            if (id && Object.keys(state.projects[id].variants).length > 0) {
                state.viewMode = 'dashboard';
            } else {
                state.viewMode = 'dashboard';
            }
        }));
    },

    updateProject: (id, updates) => {
        set(produce((state: AppState) => {
            if (state.projects[id]) {
                Object.assign(state.projects[id], updates);
                state.projects[id].updatedAt = Date.now();
            }
        }));
    },

    addVariant: (projectId, variant) => {
        set(produce((state: AppState) => {
            const project = state.projects[projectId];
            if (project) {
                // Initialize history
                variant.history = [];
                variant.historyIndex = -1;
                
                project.variants[variant.id] = variant;
                if (!project.activeVariantId) {
                    project.activeVariantId = variant.id;
                }
            }
        }));
    },

    updateVariantStatus: (projectId, variantId, status, streamedCode) => {
        set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant) {
                variant.status = status;
                if (streamedCode !== undefined) variant.streamedCode = streamedCode;
            }
        }));
    },

    deleteVariant: (projectId, variantId) => {
        set(produce((state: AppState) => {
            const project = state.projects[projectId];
            if (project) {
                delete project.variants[variantId];
                if (project.activeVariantId === variantId) {
                    const remaining = Object.keys(project.variants);
                    project.activeVariantId = remaining.length > 0 ? remaining[0] : null;
                }
            }
        }));
    },

    renameVariant: (projectId, variantId, newName) => {
        set(produce((state: AppState) => {
            const project = state.projects[projectId];
            if (project && project.variants[variantId]) {
                project.variants[variantId].name = newName;
            }
        }));
    },

    setActiveVariant: (projectId, variantId) => {
         set(produce((state: AppState) => {
            const project = state.projects[projectId];
            if (project && project.variants[variantId]) {
                project.activeVariantId = variantId;
            }
        }));
    },

    updateFile: (projectId, variantId, fileName, content) => {
        set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant) {
                const file = variant.currentFiles.find(f => f.name === fileName);
                if (file) {
                    file.content = content;
                }
                variant.status = 'idle'; 
            }
        }));
    },

    addFile: (projectId, variantId, fileName, language) => {
        set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant && !variant.currentFiles.find(f => f.name === fileName)) {
                variant.currentFiles.push({
                    name: fileName,
                    content: '',
                    language: language,
                    isOpen: true,
                    type: 'file'
                });
            }
        }));
    },

    deleteFile: (projectId, variantId, fileName) => {
         set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant) {
                variant.currentFiles = variant.currentFiles.filter(f => f.name !== fileName);
                if (variant.activeFileName === fileName) {
                    const nextFile = variant.currentFiles.find(f => f.isOpen);
                    variant.activeFileName = nextFile ? nextFile.name : undefined;
                }
            }
        }));
    },

    renameFile: (projectId, variantId, oldName, newName) => {
         set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant) {
                const file = variant.currentFiles.find(f => f.name === oldName);
                if (file) {
                    file.name = newName;
                }
                if (variant.activeFileName === oldName) {
                    variant.activeFileName = newName;
                }
            }
        }));
    },

    toggleFileOpen: (projectId, variantId, fileName, isOpen) => {
        set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant) {
                const file = variant.currentFiles.find(f => f.name === fileName);
                if (file) file.isOpen = isOpen;
                if (!isOpen && variant.activeFileName === fileName) {
                    const nextFile = variant.currentFiles.find(f => f.isOpen && f.name !== fileName);
                    variant.activeFileName = nextFile ? nextFile.name : undefined;
                }
            }
        }));
    },
    
    setActiveFile: (projectId, variantId, fileName) => {
        set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant) {
                variant.activeFileName = fileName;
                const file = variant.currentFiles.find(f => f.name === fileName);
                if (file) file.isOpen = true;
            }
        }));
    },

    setFiles: (projectId, variantId, files) => {
        set(produce((state: AppState) => {
             const variant = state.projects[projectId]?.variants[variantId];
             if (variant) {
                 variant.currentFiles = files;
             }
        }));
    },

    saveCheckpoint: (projectId, variantId, description) => {
        set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant) {
                // Remove any future history if we are in the middle of the stack
                if (variant.historyIndex < variant.history.length - 1) {
                    variant.history = variant.history.slice(0, variant.historyIndex + 1);
                }

                const snapshot: HistoryStep = {
                    id: generateId(),
                    timestamp: Date.now(),
                    files: JSON.parse(JSON.stringify(variant.currentFiles)),
                    description
                };

                variant.history.push(snapshot);
                variant.historyIndex = variant.history.length - 1;
            }
        }));
    },

    undo: (projectId, variantId) => {
        set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant && variant.historyIndex > 0) {
                variant.historyIndex--;
                const prevStep = variant.history[variant.historyIndex];
                variant.currentFiles = JSON.parse(JSON.stringify(prevStep.files));
            }
        }));
    },

    redo: (projectId, variantId) => {
        set(produce((state: AppState) => {
            const variant = state.projects[projectId]?.variants[variantId];
            if (variant && variant.historyIndex < variant.history.length - 1) {
                variant.historyIndex++;
                const nextStep = variant.history[variant.historyIndex];
                variant.currentFiles = JSON.parse(JSON.stringify(nextStep.files));
            }
        }));
    },

    updateCardConfig: (projectId, cardId, updates) => {
        set(produce((state: AppState) => {
            const project = state.projects[projectId];
            if (project) {
                const card = project.cardConfigs.find(c => c.id === cardId);
                if (card) Object.assign(card, updates);
            }
        }));
    },

    addCardConfig: (projectId) => {
        set(produce((state: AppState) => {
            const project = state.projects[projectId];
            if (project && project.cardConfigs.length < 5) {
                project.cardConfigs.push({
                    id: generateId(),
                    styleDirective: 'New Style',
                    isGenerated: false
                });
            }
        }));
    },

    removeCardConfig: (projectId, cardId) => {
        set(produce((state: AppState) => {
            const project = state.projects[projectId];
            if (project && project.cardConfigs.length > 1) {
                project.cardConfigs = project.cardConfigs.filter(c => c.id !== cardId);
            }
        }));
    },

    updateProjectSettings: (projectId, settings) => {
        set(produce((state: AppState) => {
             const project = state.projects[projectId];
             if (project) {
                 Object.assign(project.globalSettings, settings);
             }
        }));
    },

    updateSettings: (updates) => {
        set(produce((state: AppState) => {
            Object.assign(state.settings, updates);
        }));
    },

    setApiKey: (provider, key) => {
        set(produce((state: AppState) => {
            state.settings.apiKeys[provider] = key;
        }));
        // Persist
        if (provider === 'gemini') localStorage.setItem('flashui_gemini_key', key);
        if (provider === 'openrouter') localStorage.setItem('flashui_openrouter_key', key);
    },

    toggleSettingsModal: (isOpen) => {
        set(produce((state: AppState) => {
            state.isSettingsOpen = isOpen;
        }));
    },

    importProject: (project) => {
        set(produce((state: AppState) => {
            // Ensure ID is unique or overwrite? Let's overwrite if exists, or just add.
            // If we import a project with same ID, it might be an update.
            state.projects[project.id] = project;
            state.activeProjectId = project.id;
            state.viewMode = 'dashboard';
        }));
    },

    setViewMode: (mode) => {
        set(produce((state: AppState) => {
            state.viewMode = mode;
        }));
    },

    setEditorMode: (mode) => {
        set(produce((state: AppState) => {
            state.editorMode = mode;
        }));
    }
}));