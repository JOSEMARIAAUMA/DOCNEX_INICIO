'use client';

import React from 'react';

interface ViewerBlockProps {
    block: any;
    index: number;
    showMapping: boolean;
    showNotes: boolean;
    showTags: boolean;
    showSubBlocks: boolean;
    showSupport: boolean;
    showVersions: boolean;
}

export function ViewerBlock({
    block,
    index,
    showMapping,
    showNotes,
    showTags,
    showSubBlocks,
    showSupport,
    showVersions
}: ViewerBlockProps) {
    const isSubBlock = !!block.parent_block_id; // Keeping existing variable

    if (isSubBlock && !showSubBlocks) return null;

    // Dynamic styles for mapping mode
    const mappingStyle = isSubBlock
        ? 'bg-fuchsia-600/5 -mx-6 px-10 py-10 border border-fuchsia-600/20 shadow-sm'
        : 'bg-sky-600/5 -mx-6 px-10 py-10 border border-sky-600/20 shadow-sm';

    const labelStyle = isSubBlock
        ? 'text-fuchsia-700 dark:text-fuchsia-400 bg-fuchsia-600/10 dark:bg-fuchsia-400/10 border-fuchsia-600/20 dark:border-fuchsia-400/20'
        : 'text-sky-700 dark:text-sky-400 bg-sky-600/10 dark:bg-sky-400/10 border-sky-600/20 dark:border-sky-400/20';

    return (
        <div
            id={`block-${String(block.id)}`}
            className={`
                relative group transition-all duration-500 rounded-[2rem] scroll-mt-28
                ${showMapping ? mappingStyle : 'py-6 px-4'}
                ${isSubBlock ? 'ml-12 border-l-2 border-fuchsia-600/30 pl-10' : ''}
            `}
        >
            {/* Mapping Indicator Label */}
            {showMapping && (
                <div className="absolute top-10 right-full mr-6 flex items-center justify-end select-none">
                    <span className={`text-[10px] font-sans font-black uppercase tracking-widest lining-nums tabular-nums px-3 py-1.5 rounded-full border whitespace-nowrap shadow-sm ${labelStyle}`}>
                        {isSubBlock ? 'Sub-bloque' : 'Bloque'} {index + 1}
                    </span>
                </div>
            )}

            {/* Block Content (HTML Render) */}
            <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none prose-p:leading-[1.8] prose-p:text-foreground/80 font-serif selection:bg-primary/10">
                <div dangerouslySetInnerHTML={{ __html: block.content }} />
            </div>

            <div className="flex flex-wrap items-center gap-8 mt-10 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                {/* Tags Layer */}
                {showTags && block.tags && block.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        {block.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/5 text-emerald-600 border border-emerald-500/10">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Support Data Layer */}
                {showSupport && block.block_resource_links && block.block_resource_links.length > 0 && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-500">
                        {block.block_resource_links.map((link: any) => (
                            <div key={link.id} className="flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-600 hover:bg-indigo-500/10 transition-all cursor-pointer group/link shadow-sm hover:shadow-md">
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{link.resource?.title || 'Referencia Documental'}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Versions Layer */}
                {showVersions && block.block_versions && block.block_versions.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-600 animate-in fade-in slide-in-from-top-1 duration-700">
                        <span className="text-[10px] font-bold uppercase tracking-widest">{block.block_versions.length} Versiones Alternativas</span>
                    </div>
                )}
            </div>
        </div>
    );
}
