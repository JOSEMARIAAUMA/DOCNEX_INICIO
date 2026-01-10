'use client';

import React from 'react';
import { SemanticLink } from '@docnex/shared';
import { Network, Link as LinkIcon, ExternalLink, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SemanticLinkOverlayProps {
    links: SemanticLink[];
    onLinkClick: (targetBlockId: string) => void;
    className?: string;
}

export function SemanticLinkOverlay({ links, onLinkClick, className }: SemanticLinkOverlayProps) {
    if (links.length === 0) return null;

    return (
        <div className={cn("flex flex-wrap gap-2 mt-4 p-3 bg-muted/20 rounded-xl border border-dashed border-border/50", className)}>
            <div className="flex items-center gap-2 mb-1 w-full">
                <Network className="w-3 h-3 text-primary/60" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Relaciones Semánticas</span>
            </div>
            {links.map((link) => (
                <button
                    key={link.id}
                    onClick={() => link.target_block_id && onLinkClick(link.target_block_id)}
                    className="flex items-center gap-2 px-2 py-1 bg-card hover:bg-primary/10 border border-border rounded-md transition-all group max-w-[200px]"
                >
                    {link.link_type === 'manual_ref' && <LinkIcon className="w-3 h-3 text-blue-500" />}
                    {link.link_type === 'auto_mention' && <ExternalLink className="w-3 h-3 text-emerald-500" />}
                    {link.link_type === 'tag_similarity' && <Quote className="w-3 h-3 text-orange-500" />}

                    <span className="text-[10px] font-medium truncate text-foreground/80 group-hover:text-primary">
                        {link.metadata?.context || 'Ver referencia'}
                    </span>
                </button>
            ))}
        </div>
    );
}
