'use client';

import React, { useState, useEffect } from 'react';
import { Rocket, Brain, Layers, ShieldCheck, FileText, ChevronRight, MessageSquare, Send, Sparkles, AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
    getWorkspaces, createProject, createDocument
} from '@/lib/api';
import {
    generateScaffoldAction,
    runResearchAnalysis,
    runDocumentAuditAction,
    exportDocumentAction,
    structureDocumentWithLibrarian,
    batchImportBlocks
} from '@/actions/ai';

// --- Types ---

type MissionPhase = 'briefing' | 'ingestion' | 'structure' | 'intelligence' | 'synthesis';

interface AgentLog {
    id: string;
    agent: 'Anfitrión' | 'Librarian' | 'Scaffold' | 'Researcher' | 'Auditor' | 'Executive';
    message: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

// --- Main Application ---

export default function MissionPilotPage() {
    const [currentPhase, setCurrentPhase] = useState<MissionPhase>('briefing');
    const [missionData, setMissionData] = useState({
        goal: '',
        projectId: '',
        workspaceId: '',
        mainDocumentId: '',
        files: [] as { id: string, name: string }[],
        structure: [] as any[],
        insights: [],
        audit: []
    });
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [isThinking, setIsThinking] = useState(false);

    // Logs update helper
    const addLog = (agent: AgentLog['agent'], message: string, type: AgentLog['type'] = 'info') => {
        const newLog: AgentLog = {
            id: Math.random().toString(36).substring(7),
            agent,
            message,
            timestamp: new Date().toLocaleTimeString(),
            type
        };
        setLogs(prev => [newLog, ...prev]);
    };

    useEffect(() => {
        addLog('Anfitrión', '¡Hola! Soy tu asistente de misión. Estoy listo para guiarte en este viaje. ¿Empezamos?', 'info');
    }, []);

    const phases: { id: MissionPhase; label: string; icon: any }[] = [
        { id: 'briefing', label: 'Briefing', icon: MessageSquare },
        { id: 'ingestion', label: 'Ingesta', icon: Layers },
        { id: 'structure', icon: Brain, label: 'Estructura' },
        { id: 'intelligence', icon: ShieldCheck, label: 'Inteligencia' },
        { id: 'synthesis', icon: FileText, label: 'Síntesis' },
    ];

    const onStartBriefing = async (goal: string) => {
        setIsThinking(true);
        try {
            const workspaces = await getWorkspaces();
            const wsId = workspaces[0]?.id;

            if (!wsId) {
                addLog('Anfitrión', 'Vaya, parece que no tienes un espacio de trabajo configurado.', 'error');
                return;
            }

            addLog('Anfitrión', 'Estoy configurando tu nuevo expediente...', 'info');
            const project = await createProject(wsId, goal.slice(0, 40) + '...', goal);

            if (!project) throw new Error("Error al inicializar el proyecto.");

            setMissionData({
                ...missionData,
                goal,
                projectId: project.id,
                workspaceId: wsId
            });

            addLog('Anfitrión', `¡Listo! He creado el expediente "${project.name}".`, 'success');
            setCurrentPhase('ingestion');
        } catch (e: any) {
            addLog('Anfitrión', `Hubo un pequeño contratiempo: ${e.message}`, 'error');
        } finally {
            setIsThinking(false);
        }
    };

    const onCompleteIngestion = async (texts: string[]) => {
        setIsThinking(true);
        try {
            const docIds: string[] = [];
            for (let i = 0; i < texts.length; i++) {
                const text = texts[i];
                const title = `Documento Ingestado ${i + 1}`;
                addLog('Librarian', `Procesando "${title}"...`, 'info');

                const doc = await createDocument(missionData.projectId, title);
                if (!doc) throw new Error(`Error al crear documento ${i + 1}`);
                docIds.push(doc.id);

                const res = await structureDocumentWithLibrarian(text, missionData.projectId);
                if (!res.success || !res.blocks) throw new Error(res.error || "Fallo en segmentación");

                addLog('Librarian', `Mapeando ${res.blocks.length} bloques...`, 'info');
                await batchImportBlocks(missionData.projectId, doc.id, res.blocks, res.links || []);
                addLog('Librarian', `"${title}" ingestado con éxito.`, 'success');
            }

            setMissionData({
                ...missionData,
                mainDocumentId: docIds[0],
                files: texts.map((t, idx) => ({ id: docIds[idx], name: `Doc ${idx + 1}` }))
            });

            addLog('Anfitrión', 'Todo el material está en la base de conocimientos. ¿Miramos la estructura?', 'success');
            setCurrentPhase('structure');
        } catch (e: any) {
            addLog('Anfitrión', `Error en ingesta: ${e.message}`, 'error');
        } finally {
            setIsThinking(false);
        }
    };

    const onCompleteStructure = async (structure: any) => {
        setIsThinking(true);
        try {
            addLog('Scaffold', `Persistiendo estructura de ${structure.length} secciones...`, 'info');

            // Persist as blocks in the main document
            await batchImportBlocks(
                missionData.projectId,
                missionData.mainDocumentId,
                structure.map((s: any, idx: number) => ({
                    title: s.title,
                    content: s.description || 'Contenido pendiente de desarrollo por los agentes.',
                    target: 'section',
                    order_index: idx
                })),
                []
            );

            setMissionData({ ...missionData, structure });
            addLog('Anfitrión', 'La estructura se ha guardado en el documento real. Turno de los expertos técnicos.', 'success');
            setCurrentPhase('intelligence');
        } catch (e: any) {
            addLog('Anfitrión', `Error al persistir estructura: ${e.message}`, 'error');
        } finally {
            setIsThinking(false);
        }
    };

    const onCompleteIntelligence = async (insights: any, audit: any) => {
        setIsThinking(true);
        try {
            setMissionData({ ...missionData, insights, audit });
            addLog('Anfitrión', 'Análisis profundo finalizado. Listos para la síntesis.', 'success');
            setCurrentPhase('synthesis');
        } catch (e: any) {
            addLog('Anfitrión', `Error: ${e.message}`, 'error');
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-md flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Rocket className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter italic">Misión Autopilot</h1>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Centro de Control de Misiones DOCNEX</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {phases.map((p, idx) => {
                        const Icon = p.icon;
                        const active = p.id === currentPhase;
                        const past = phases.findIndex(x => x.id === currentPhase) > idx;

                        return (
                            <React.Fragment key={p.id}>
                                <div className={cn(
                                    "flex flex-col items-center gap-1 transition-all duration-500",
                                    active ? "opacity-100 scale-110" : "opacity-30"
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border-2",
                                        active ? "border-primary bg-primary/10" : past ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10"
                                    )}>
                                        <Icon className={cn("w-5 h-5", active ? "text-primary" : past ? "text-emerald-400" : "text-white")} />
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-tighter">{p.label}</span>
                                </div>
                                {idx < phases.length - 1 && (
                                    <div className={cn("w-8 h-px mb-4", past ? "bg-emerald-500/30" : "bg-white/10")} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Sistema Online</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center">
                    <div className="w-full max-w-4xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentPhase}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="min-h-[60vh] flex flex-col justify-center"
                            >
                                {currentPhase === 'briefing' && <PhaseBriefing onStart={onStartBriefing} />}
                                {currentPhase === 'ingestion' && <PhaseIngestion goal={missionData.goal} onComplete={onCompleteIngestion} addLog={addLog} />}
                                {currentPhase === 'structure' && <PhaseStructure missionData={missionData} onComplete={onCompleteStructure} addLog={addLog} setIsThinking={setIsThinking} />}
                                {currentPhase === 'intelligence' && <PhaseIntelligence missionData={missionData} onComplete={onCompleteIntelligence} addLog={addLog} setIsThinking={setIsThinking} />}
                                {currentPhase === 'synthesis' && <PhaseSynthesis missionData={missionData} addLog={addLog} setIsThinking={setIsThinking} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="w-96 border-l border-white/5 bg-white/[0.01] flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-white/60">Intelligence Feed</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {isThinking && (
                            <div className="flex gap-3 items-start animate-pulse">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                                <div className="flex-1 pt-1">
                                    <div className="h-2 w-24 bg-white/10 rounded mb-2" />
                                    <div className="h-3 w-48 bg-white/10 rounded" />
                                </div>
                            </div>
                        )}
                        {logs.map(log => (
                            <div key={log.id} className="flex gap-3 items-start group">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                                    log.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20" :
                                        log.type === 'warning' ? "bg-amber-500/10 border-amber-500/20" :
                                            "bg-white/5 border-white/10 group-hover:border-primary/30"
                                )}>
                                    <Brain className={cn("w-4 h-4", log.type === 'success' ? "text-emerald-400" : log.type === 'warning' ? "text-amber-400" : "text-white/40")} />
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-white/30">{log.agent}</span>
                                        <span className="text-[8px] font-mono text-white/20">{log.timestamp}</span>
                                    </div>
                                    <p className="text-xs text-white/70 leading-relaxed italic">"{log.message}"</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-white/5 space-y-2 bg-[#080808]">
                        {missionData.projectId && (
                            <>
                                <Link
                                    href="/documents"
                                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 hover:text-primary transition-all group border border-white/5"
                                >
                                    <span>Ver en Workspace</span>
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                {missionData.mainDocumentId && (
                                    <Link
                                        href={`/documents/${missionData.mainDocumentId}`}
                                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 hover:text-emerald-400 transition-all group border border-white/5"
                                    >
                                        <span>Abrir Editor Real</span>
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                )}
                            </>
                        )}
                        <div className="p-3 opacity-20 text-[8px] font-bold text-center uppercase tracking-[0.3em]">
                            Acceso Total a la Cocina
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Phase Components ---

function PhaseBriefing({ onStart }: { onStart: (goal: string) => void }) {
    const [goal, setGoal] = useState('');
    return (
        <div className="space-y-12">
            <div className="space-y-4">
                <span className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-black uppercase tracking-widest text-primary">
                    FASE 01: DEFINICIÓN DE MISIÓN
                </span>
                <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">¿Qué quieres <br /> <span className="text-primary">lograr</span> hoy?</h1>
                <p className="text-xl text-white/40 max-w-2xl font-medium">Describe tu objetivo profesional. El equipo de agentes orquestará el resto.</p>
            </div>

            <div className="relative group">
                <textarea
                    autoFocus
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    className="w-full h-48 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 text-2xl font-medium outline-none focus:border-primary focus:bg-white/[0.05] transition-all resize-none group-hover:border-white/20"
                    placeholder="Ej: Informe comparativo sobre el impacto de la nueva Ley de Vivienda..."
                />
                <button
                    onClick={() => goal && onStart(goal)}
                    disabled={!goal}
                    className="absolute bottom-6 right-6 p-6 bg-primary text-white rounded-[2rem] shadow-2xl shadow-primary/40 hover:scale-105 transition-transform group/btn disabled:opacity-50 disabled:grayscale"
                >
                    <div className="flex items-center gap-3">
                        <span className="font-black uppercase tracking-widest text-xs">Iniciar Misión</span>
                        <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    </div>
                </button>
            </div>
        </div>
    );
}

function PhaseIngestion({ goal, onComplete, addLog }: any) {
    const [files, setFiles] = useState<string[]>([]);

    // Auto-populate with some sample text for testing deep integration if no files
    useEffect(() => {
        if (files.length === 0) {
            // Simulated doc content
            const simulatedText = `Contexto para: ${goal}\n\nEste documento contiene el análisis base para la misión. Se han identificado varios puntos clave relacionados con la normativa y el mercado actual.`;
            // For now, we allow the user to click to "add" this simulated doc
        }
    }, [goal]);

    const addFile = (f: string) => {
        setFiles(prev => [...prev, f]);
        addLog('Librarian', `Procesando: ${f}...`, 'success');
    };

    return (
        <div className="space-y-12">
            <div className="space-y-4">
                <span className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-black uppercase tracking-widest text-emerald-400">
                    FASE 02: INGESTA INTELIGENTE
                </span>
                <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">Alimenta al <br /> <span className="text-emerald-400">Librarian Agent</span></h1>
                <p className="text-xl text-white/40 max-w-2xl font-medium italic">"Facilítame toda la información. Yo me encargo de procesarlo todo."</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div
                    onClick={() => addFile(`Material_${Math.floor(Math.random() * 100)}.pdf`)}
                    className="border-2 border-dashed border-white/10 rounded-[3rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] transition-all cursor-pointer group"
                >
                    <Plus className="w-10 h-10 text-white/20 group-hover:text-emerald-400" />
                    <h3 className="font-bold uppercase tracking-widest text-sm">Añadir Fuentes</h3>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 flex flex-col h-64 overflow-y-auto">
                    {files.map(f => (
                        <div key={f} className="p-3 bg-white/5 border border-white/10 rounded-2xl mb-2 flex items-center justify-between">
                            <span className="text-xs">{f}</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={() => onComplete(files.length > 0 ? files : [`Contenido base para ${goal}`])}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
            >
                Confirmar e Ir a Estructura
            </button>
        </div>
    );
}

function PhaseStructure({ missionData, onComplete, addLog, setIsThinking }: any) {
    const [structure, setStructure] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const generate = async () => {
        setLoading(true);
        setIsThinking(true);
        addLog('Scaffold', 'Diseñando arquitectura jerárquica...', 'info');
        try {
            const res = await generateScaffoldAction({ title: 'Misión Autopilot', description: missionData.goal });
            if (res.success && res.structure) {
                setStructure(res.structure);
                addLog('Scaffold', 'Estructura generada con éxito.', 'success');
            }
        } catch (e: any) {
            addLog('Scaffold', `Error: ${e.message}`, 'error');
        } finally {
            setLoading(false);
            setIsThinking(false);
        }
    };

    return (
        <div className="space-y-12">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">Esqueleto <br /> <span className="text-blue-400">Estratégico</span></h1>
            <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 min-h-[300px] flex flex-col items-center justify-center">
                {structure.length === 0 ? (
                    <button onClick={generate} className="px-8 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs">
                        {loading ? 'Pensando...' : 'Generar Propuesta'}
                    </button>
                ) : (
                    <div className="w-full space-y-4">
                        {structure.map((s, i) => (
                            <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl font-bold">{s.title}</div>
                        ))}
                        <button onClick={() => onComplete(structure)} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs">Continuar</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function PhaseIntelligence({ missionData, onComplete, addLog, setIsThinking }: any) {
    const [running, setRunning] = useState(false);

    const run = async () => {
        setRunning(true);
        setIsThinking(true);
        try {
            // Use the structure/goal as "content" for analysis if blocks are not yet fetched
            const dummyContent = `Objetivo de Misión: ${missionData.goal}\nEstructura Propuesta: ${missionData.structure.map((s: any) => s.title).join(', ')}`;

            addLog('Researcher', 'Analizando datos y normativas vigentes...', 'info');
            const resInsights = await runResearchAnalysis(dummyContent, missionData.projectId);
            addLog('Researcher', `Análisis completado: ${resInsights?.insights?.length || 0} hallazgos semánticos.`, 'success');

            addLog('Auditor', 'Auditando riesgos y coherencia estructural...', 'info');
            const resAudit = await runDocumentAuditAction(dummyContent, missionData.structure, missionData.goal);
            addLog('Auditor', `Auditoría finalizada: ${resAudit?.findings?.length || 0} advertencias de cumplimiento.`, 'success');

            onComplete(resInsights?.insights || [], resAudit?.findings || []);
        } catch (e: any) {
            addLog('Anfitrión', `Error en inteligencia: ${e.message}`, 'error');
            setRunning(false);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="space-y-12 text-center">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">Cerebro <br /> <span className="text-rose-400">Multidisciplinar</span></h1>
            <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 flex flex-col items-center justify-center gap-8">
                {!running ? (
                    <button onClick={run} className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs">Ejecutar Inteligencia</button>
                ) : (
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <Brain className="w-16 h-16 text-rose-400" />
                        <span className="font-black uppercase tracking-widest text-xs">Analizando...</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function PhaseSynthesis({ missionData, addLog, setIsThinking }: any) {
    const [result, setResult] = useState<string | null>(null);

    const finish = async () => {
        setIsThinking(true);
        addLog('Executive', 'Compilando informe final estratégico...', 'info');
        try {
            const res = await exportDocumentAction(
                { title: 'Informe Final de Misión', description: missionData.goal },
                missionData.structure,
                missionData.insights,
                missionData.audit
            );

            if (res.success && res.synthesizedContent) {
                // Persist the final report as a new document
                const finalDoc = await createDocument(missionData.projectId, 'SÍNTESIS EJECUTIVA FINAL');
                if (finalDoc) {
                    await batchImportBlocks(missionData.projectId, finalDoc.id, [
                        { title: 'Resumen Ejecutivo', content: res.synthesizedContent, target: 'main_content', order_index: 0 }
                    ], []);
                }

                setResult(res.synthesizedContent);
                addLog('Executive', 'Misión completada. El informe final ha sido persistido en el expediente.', 'success');
            }
        } catch (e: any) {
            addLog('Executive', `Error: ${e.message}`, 'error');
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="space-y-12">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">Producto <br /> <span className="text-primary">Final</span></h1>
            <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 min-h-[400px] flex flex-col items-center justify-center">
                {!result ? (
                    <button onClick={finish} className="px-12 py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs">Generar Informe</button>
                ) : (
                    <div className="w-full space-y-6">
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] max-h-[300px] overflow-y-auto italic text-white/60">
                            {result.slice(0, 500)}...
                        </div>
                        <Link href="/documents" className="block w-full text-center py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs">Ir a Mis Documentos</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
