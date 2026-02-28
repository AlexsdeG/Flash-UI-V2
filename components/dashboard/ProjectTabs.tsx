/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../store';
import { PlusIcon, XIcon, LayoutIcon, Settings, Edit2, Github, Twitter } from 'lucide-react';
import { cn } from '../../utils';
import { Project } from '../../types';

export const ProjectTabs = () => {
    const { projects, activeProjectId, createProject, setActiveProject, closeProject, toggleSettingsModal, renameProject } = useProjectStore();
    
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const projectList = (Object.values(projects) as Project[]).sort((a, b) => a.createdAt - b.createdAt);

    useEffect(() => {
        if (editingProjectId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingProjectId]);

    const startEditing = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setEditingProjectId(project.id);
        setEditTitle(project.title);
    };

    const saveTitle = () => {
        if (editingProjectId) {
            renameProject(editingProjectId, editTitle.trim() || "Untitled Project");
            setEditingProjectId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveTitle();
        } else if (e.key === 'Escape') {
            setEditingProjectId(null);
        }
    };

    return (
        <div className="flex items-center gap-2 px-4 h-12 bg-[#09090b]/90 border-b border-white/5 backdrop-blur-md sticky top-0 z-50 overflow-x-auto no-scrollbar justify-between">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-4 text-white/50">
                    <LayoutIcon size={18} />
                    <span className="font-bold text-sm tracking-tight">FlashUI</span>
                    <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/40">v2</span>
                </div>

                {projectList.map(project => (
                    <div 
                        key={project.id}
                        className={cn(
                            "group relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-all border border-transparent min-w-[120px] max-w-[200px]",
                            activeProjectId === project.id 
                                ? "bg-white/10 text-white border-white/10 shadow-sm" 
                                : "text-white/40 hover:bg-white/5 hover:text-white/70"
                        )}
                        onClick={() => setActiveProject(project.id)}
                        title={project.title} // Native tooltip for full name
                    >
                        {editingProjectId === project.id ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border-none outline-none text-white w-full min-w-[80px]"
                            />
                        ) : (
                            <>
                                <span className="truncate flex-1 max-w-[120px]">{project.title || 'Untitled'}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        className="hover:bg-white/20 p-1 rounded text-white/60 hover:text-white transition-colors"
                                        onClick={(e) => startEditing(e, project)}
                                        title="Rename Project"
                                    >
                                        <Edit2 size={10} />
                                    </button>
                                    <button 
                                        className="hover:bg-white/20 p-1 rounded text-white/60 hover:text-white transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeProject(project.id);
                                        }}
                                        title="Close Project"
                                    >
                                        <XIcon size={10} />
                                    </button>
                                </div>
                            </>
                        )}
                        
                        {/* Active Indicator */}
                        {activeProjectId === project.id && (
                            <div className="absolute bottom-[-9px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                        )}
                    </div>
                ))}

                <button 
                    onClick={() => createProject()}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-white/30 hover:bg-white/10 hover:text-white transition-all ml-1"
                    title="New Project"
                >
                    <PlusIcon size={16} />
                </button>
            </div>

            <div className="flex items-center gap-1">
                <a
                    href="https://github.com/AlexsdeG/Flash-UI-V2"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/30 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="GitHub Repository"
                >
                    <Github size={18} />
                </a>
                <a
                    href="https://x.com/ammaar"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/30 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Original Flash UI by @ammaar"
                >
                    <Twitter size={18} />
                </a>
                <button 
                    onClick={() => toggleSettingsModal(true)}
                    className="text-white/30 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Global Settings"
                >
                    <Settings size={18} />
                </button>
            </div>
        </div>
    );
};