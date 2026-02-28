/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type AiProvider = 'gemini' | 'openrouter' | 'local';
export type DeviceType = 'desktop' | 'tablet' | 'mobile';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AppType = 'landing_page' | 'dashboard' | 'mobile_app' | 'ecommerce' | 'blog' | 'custom';
export type Framework = 'vanilla' | 'react' | 'vue';

export interface FileAsset {
  name: string;
  content: string;
  language: 'html' | 'css' | 'javascript' | 'json' | 'markdown';
  type?: 'file' | 'folder'; // Added to support folder logic
  isOpen?: boolean; // Track if file is open in editor tabs
}

export interface GenerationSettings {
    model: string;
    temperature: number;
    provider: AiProvider;
    appType: AppType;
    customAppType?: string; // For "Custom" selection
    framework: Framework;
    theme: ThemeMode;
    colors?: string[]; // Preferred color palette
    customInstructions?: string;
}

export interface ArtifactCardConfig {
    id: string;
    name?: string; // Optional variant name
    styleDirective: string; // e.g., "Minimalist", "Brutalist"
    isGenerated: boolean;
    // Overrides for specific cards
    settings?: Partial<GenerationSettings>;
}

// A single step in the history of a variant
export interface HistoryStep {
  id: string;
  timestamp: number;
  files: FileAsset[];
  description: string;
  thumbnail?: string;
}

// A specific version/design (Unified "Design" and "Variant")
export interface Variant {
  id: string;
  parentId?: string; // If branched from another
  rootId?: string; // The ID of the original design this variant belongs to
  name: string; // e.g. "Kinetic Silhouette Balance"
  styleDirective?: string; // e.g. "Minimalist"
  thumbnail?: string;
  currentFiles: FileAsset[];
  activeFileName?: string; // Currently focused file in editor
  history: HistoryStep[];
  historyIndex: number; // Current position in history stack
  settings: GenerationSettings;
  status: 'idle' | 'generating' | 'error' | 'streaming';
  isMain: boolean;
  // For the streaming effect in ArtifactCard
  streamedCode?: string; 
}

// A Project Container (Tab)
export interface Project {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  activeVariantId: string | null;
  variants: Record<string, Variant>;
  prompt: string;
  cardConfigs: ArtifactCardConfig[]; // Configuration for the initial generation
  globalSettings: GenerationSettings;
}

export interface GlobalSettings {
    defaultProvider: AiProvider;
    apiKeys: {
        gemini?: string;
        openrouter?: string;
    };
    theme: ThemeMode;
    customModels: string[];
}

export interface AppState {
  projects: Record<string, Project>;
  activeProjectId: string | null;
  viewMode: 'dashboard' | 'editor';
  editorMode: 'preview' | 'code';
  settings: GlobalSettings;
  isSettingsOpen: boolean;
}