/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { useProjectStore } from '../../store';
import { 
    FileCode, FileType, Play, Check, Copy, X, FolderOpen, Save
} from 'lucide-react';
import { cn } from '../../utils';
import { toast } from 'sonner';

export const CodeWorkspace = () => {
    const { projects, activeProjectId, updateFile, toggleFileOpen, setActiveFile, setEditorMode, saveCheckpoint } = useProjectStore();
    
    const project = activeProjectId ? projects[activeProjectId] : null;
    const variant = project?.activeVariantId ? project.variants[project.activeVariantId] : null;

    // Determine visible files (open tabs)
    const openFiles = variant?.currentFiles.filter(f => f.isOpen) || [];
    
    // Sync active file from store
    const activeFileName = variant?.activeFileName;
    const currentFile = variant?.currentFiles.find(f => f.name === activeFileName);

    // If active file is closed or deleted, try to pick another open one
    useEffect(() => {
        if (!currentFile && openFiles.length > 0) {
            setActiveFile(project!.id, variant!.id, openFiles[0].name);
        }
    }, [currentFile, openFiles, project, variant, setActiveFile]);
    
    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined && project && variant && currentFile) {
            updateFile(project.id, variant.id, currentFile.name, value);
        }
    };

    const handleCopy = () => {
        if (currentFile) {
            navigator.clipboard.writeText(currentFile.content);
            toast.success("Code copied to clipboard");
        }
    };

    const handleSave = () => {
        if (project && variant) {
             saveCheckpoint(project.id, variant.id, "Manual Save");
             // Force refresh preview by toggling editor mode briefly or relying on state update
             toast.success("Saved & Snapshot created");
        }
    };

    const handleCloseTab = (e: React.MouseEvent, fileName: string) => {
        e.stopPropagation();
        if (project && variant) {
            toggleFileOpen(project.id, variant.id, fileName, false);
        }
    };

    const handleTabClick = (fileName: string) => {
        if (project && variant) {
            setActiveFile(project.id, variant.id, fileName);
        }
    };

    if (!variant) return <div className="h-full bg-[#09090b] flex items-center justify-center text-white/30">No Active Variant</div>;

    // Empty State
    if (openFiles.length === 0) {
        return (
            <div className="h-full bg-[#09090b] flex flex-col items-center justify-center text-white/30">
                <FolderOpen size={48} className="mb-4 opacity-50" />
                <p>No files open</p>
                <p className="text-xs mt-2 text-white/20">Click on a file in the sidebar to open it</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#09090b]">
            {/* Tabs */}
            <div className="flex items-center h-12 border-b border-white/10 bg-[#09090b] px-2 overflow-x-auto no-scrollbar">
                {openFiles.map(file => (
                    <button 
                        key={file.name}
                        onClick={() => handleTabClick(file.name)}
                        className={cn(
                            "group flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all border border-transparent min-w-[100px]",
                            activeFileName === file.name ? "bg-white/10 text-white border-white/10" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {file.name.endsWith('.css') ? <FileType size={12} className="text-blue-400" /> : <FileCode size={12} className="text-orange-400" />}
                        <span className="truncate flex-1 text-left">{file.name}</span>
                        <span 
                            onClick={(e) => handleCloseTab(e, file.name)}
                            className="opacity-0 group-hover:opacity-100 hover:bg-white/20 rounded p-0.5"
                        >
                            <X size={10} />
                        </span>
                    </button>
                ))}
            </div>

            {/* Editor Container */}
            <div className="flex-1 relative">
                {currentFile ? (
                    <Editor
                        height="100%"
                        theme="vs-dark"
                        path={currentFile.name} // path prop helps monaco with intellisense context
                        language={currentFile.language}
                        value={currentFile.content}
                        onChange={handleEditorChange}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 12,
                            fontFamily: "'Roboto Mono', monospace",
                            padding: { top: 16 },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-white/20 text-sm">
                        Select a file
                    </div>
                )}
            </div>

            {/* Footer Status */}
            <div className="h-8 border-t border-white/10 flex items-center justify-between px-3 text-[10px] text-white/30">
                <div className="flex items-center gap-2">
                    <Check size={12} className="text-green-500" />
                    <span>Saved locally</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleSave} className="hover:text-white flex items-center gap-1">
                        <Save size={10} /> Save & Snapshot
                    </button>
                    <button onClick={handleCopy} className="hover:text-white flex items-center gap-1">
                        <Copy size={10} /> Copy Code
                    </button>
                </div>
            </div>
        </div>
    );
};