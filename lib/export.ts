import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Project, Variant } from '../types';

export const downloadVariantAsZip = async (variant: Variant) => {
    const zip = new JSZip();
    
    variant.currentFiles.forEach(file => {
        zip.file(file.name, file.content);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${variant.name || 'variant'}-${variant.id}.zip`);
};

export const downloadProjectAsZip = async (project: Project) => {
    const zip = new JSZip();
    const projectFolder = zip.folder(project.title || 'project');

    Object.values(project.variants).forEach(variant => {
        const variantName = variant.name || variant.styleDirective || variant.id;
        // Sanitize folder name
        const safeName = variantName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const variantFolder = projectFolder?.folder(safeName);
        
        variant.currentFiles.forEach(file => {
            variantFolder?.file(file.name, file.content);
        });
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${project.title || 'project'}-${project.id}.zip`);
};

export const exportProjectAsJson = (project: Project) => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    saveAs(blob, `${project.title || 'project'}-${project.id}.json`);
};

export const importProjectFromJson = (file: File): Promise<Project> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                const project = JSON.parse(json) as Project;
                // Basic validation
                if (!project.id || !project.variants) {
                    throw new Error("Invalid project file");
                }
                resolve(project);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};
