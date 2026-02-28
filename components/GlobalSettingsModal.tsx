/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { useProjectStore } from '../store';
import { X, Key, Check } from 'lucide-react';
import { toast } from 'sonner';

export const GlobalSettingsModal = () => {
    const { settings, setApiKey, toggleSettingsModal, isSettingsOpen } = useProjectStore();
    const [geminiKey, setGeminiKey] = useState(settings.apiKeys.gemini || '');
    
    if (!isSettingsOpen) return null;

    const handleSave = () => {
        setApiKey('gemini', geminiKey);
        toast.success("Settings saved");
        toggleSettingsModal(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key size={18} /> Global Settings
                    </h3>
                    <button onClick={() => toggleSettingsModal(false)} className="text-white/40 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2 block">Google Gemini API Key</label>
                        <input 
                            type="password" 
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
                            placeholder="AIza..."
                        />
                        <p className="text-[10px] text-white/30 mt-2">Required for Gemini models. Stored locally in your browser.</p>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                        <p className="text-xs text-indigo-200">
                            More providers (OpenRouter, Local LLM) coming in v2.1.
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button 
                        onClick={() => toggleSettingsModal(false)}
                        className="text-white/60 hover:text-white px-4 py-2 text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
                    >
                        <Check size={14} /> Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
