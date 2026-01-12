'use client';

import { motion } from 'framer-motion';
import { Home, Folder, Settings, Command, Library, FlaskConical, Layout, CheckCircle2, Ticket, ChevronRight, ChevronLeft, Rocket } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    isActive?: boolean;
    isExpanded: boolean;
}

function NavItem({ icon: Icon, label, href, isExpanded }: NavItemProps) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.1)]"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
        >
            <Icon className={cn("w-5 h-5 min-w-[20px] transition-transform duration-200", isActive && "scale-110")} />
            {isExpanded && (
                <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                >
                    {label}
                </motion.span>
            )}
            {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-card text-card-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-border shadow-xl transition-opacity">
                    {label}
                </div>
            )}
        </Link>
    );
}

export function Sidebar() {
    const [isExpanded, setIsExpanded] = useState(false);
    const pathname = usePathname();
    const isInDocuments = pathname.startsWith('/documents');

    return (
        <motion.div
            className={cn(
                "h-screen border-r border-border bg-card flex flex-col p-3 z-[60] fixed top-0 left-0 bottom-0",
                "hidden md:flex shadow-xl"
            )}
            initial={{ width: 72 }}
            animate={{ width: isExpanded ? 240 : 72 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 150, damping: 25 }}
        >
            <div className="flex items-center justify-between px-2 mb-8 h-8">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                        <Command className="w-5 h-5 text-primary-foreground" />
                    </div>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-bold text-lg tracking-tight text-foreground whitespace-nowrap"
                        >
                            DOCNEX
                        </motion.div>
                    )}
                </Link>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground transition-colors ml-auto border border-transparent hover:border-border"
                >
                    {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>

            <nav className="flex flex-col gap-1 space-y-1">
                <NavItem icon={Rocket} label="Misión Autopilot" href="/mission-pilot" isExpanded={isExpanded} />
                <NavItem icon={Home} label="Inicio" href="/" isExpanded={isExpanded} />
                <NavItem icon={Folder} label="Documentos" href="/documents" isExpanded={isExpanded} />
                <NavItem icon={FlaskConical} label="Research" href="/research" isExpanded={isExpanded} />
                <NavItem icon={Layout} label="Tablero de Síntesis" href="/synthesis/board" isExpanded={isExpanded} />
                <NavItem icon={Library} label="Librería" href="/library" isExpanded={isExpanded} />
                <div className="h-px bg-white/5 mx-2 my-2" />
                <NavItem icon={CheckCircle2} label="Registro Visual" href="/admin/registry" isExpanded={isExpanded} />
                <NavItem icon={Ticket} label="Tickets" href="/admin/tickets" isExpanded={isExpanded} />
            </nav>

            <div className="mt-auto">
                <NavItem icon={Settings} label="Configuración" href="/settings" isExpanded={isExpanded} />
            </div>
        </motion.div>
    );
}
