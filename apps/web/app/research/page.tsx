'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, FlaskConical, Home } from 'lucide-react';
import Link from 'next/link';
import ResearchDashboard from '@/components/research/ResearchDashboard';
import { listResearchSessions, listProjects, ResearchSession, Project } from '@/lib/api';

export default function ResearchPage() {
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [sessionsData, projectsData] = await Promise.all([
                listResearchSessions(),
                listProjects()
            ]);
            setSessions(sessionsData);
            setProjects(projectsData);
        } catch (err) {
            console.error('Error fetching research data:', err);
            setError('Error al cargar los datos de investigación');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm"
            >
                <div className="px-6 py-4">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Link
                            href="/"
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <Home className="w-4 h-4" />
                            <span>Workspace</span>
                        </Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-foreground font-medium">Research</span>
                    </nav>

                    {/* Title */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                            <FlaskConical className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">
                                Centro de Investigación
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Gestiona y sintetiza tus materiales de investigación
                            </p>
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                        />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <p className="text-destructive">{error}</p>
                        <button
                            onClick={fetchData}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : (
                    <ResearchDashboard
                        sessions={sessions}
                        projects={projects}
                        onRefresh={fetchData}
                    />
                )}
            </main>
        </div>
    );
}
