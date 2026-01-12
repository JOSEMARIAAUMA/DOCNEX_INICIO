
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    X,
    Maximize2,
    Minimize2,
    Sparkles,
    Bot,
    User,
    BrainCircuit,
    Zap,
    History,
    MessageSquare,
    ChevronRight,
    Wand2,
    Search,
    FileText,
    Cpu,
    Boxes
} from 'lucide-react';
import { useAIContext } from '@/hooks/use-ai-context';
import { SpecializedProfile } from '@/lib/ai/service';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { chatProjectAction } from '@/actions/ai-chat-actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    agent?: string;
    timestamp: number;
};

type InteractionHandle = 'move' | 'n' | 's' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se' | null;

export function GlobalAICompanion() {
    const context = useAIContext();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activeAgent, setActiveAgent] = useState('Analista Base');
    const [profile, setProfile] = useState<SpecializedProfile | undefined>(undefined);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Position and size state
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ w: 420, h: 600 });
    const [isExpanded, setIsExpanded] = useState(true);
    const [initialized, setInitialized] = useState(false);

    // Active interaction refs
    const isInteracting = useRef(false);
    const interactionRef = useRef<{
        handle: InteractionHandle;
        startX: number;
        startY: number;
        startPos: { x: number, y: number };
        startSize: { w: number, h: number };
    }>({
        handle: null,
        startX: 0,
        startY: 0,
        startPos: { x: 0, y: 0 },
        startSize: { w: 0, h: 0 }
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('docnex_ai_companion_v9_config');

        let initialX = window.innerWidth - 460;
        let initialY = window.innerHeight - 680;
        let initialW = 420;
        let initialH = 600;

        if (saved) {
            try {
                const config = JSON.parse(saved);
                initialX = Math.max(0, Math.min(window.innerWidth - 100, config.pos?.x ?? initialX));
                initialY = Math.max(0, Math.min(window.innerHeight - 100, config.pos?.y ?? initialY));
                initialW = config.size?.w ?? initialW;
                initialH = config.size?.h ?? initialH;
                if (config.isOpen !== undefined) setIsOpen(config.isOpen);
                if (config.isExpanded !== undefined) setIsExpanded(config.isExpanded);
            } catch (e) {
                console.error('Config restore error', e);
            }
        }

        setPos({ x: initialX, y: initialY });
        setSize({ w: initialW, h: initialH });
        setInitialized(true);
    }, []);

    // Persistence Save
    useEffect(() => {
        if (!initialized) return;
        const timer = setTimeout(() => {
            localStorage.setItem('docnex_ai_companion_v9_config', JSON.stringify({ pos, size, isOpen, isExpanded }));
        }, 1000);
        return () => clearTimeout(timer);
    }, [pos, size, isOpen, isExpanded, initialized]);

    // Specialist Role Logic
    useEffect(() => {
        if (context.type === 'document') {
            setActiveAgent('Estratega Documental');
            setProfile('legal');
        } else if (context.type === 'library') {
            setActiveAgent('Bibliotecario Normativo');
            setProfile('administrative');
        } else if (context.type === 'project') {
            setActiveAgent('Arquitecto de Proyecto');
            setProfile('architectural');
        } else {
            setActiveAgent('DOCNEX Base');
            setProfile(undefined);
        }
    }, [context.type]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping, showShortcuts]);

    // Interaction Engine
    const startInteraction = useCallback((handle: InteractionHandle, e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        isInteracting.current = true;
        interactionRef.current = {
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startPos: { ...pos },
            startSize: { ...size }
        };

        const onMouseMove = (ev: MouseEvent) => {
            if (!isInteracting.current) return;
            const { handle, startX, startY, startPos, startSize } = interactionRef.current;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            let nx = startPos.x;
            let ny = startPos.y;
            let nw = startSize.w;
            let nh = startSize.h;

            if (handle === 'move') {
                nx = startPos.x + dx;
                ny = startPos.y + dy;
            } else {
                if (handle?.includes('e')) nw = Math.max(320, startSize.w + dx);
                if (handle?.includes('s')) nh = Math.max(250, startSize.h + dy);
                if (handle?.includes('w')) {
                    const diff = startSize.w - dx;
                    if (diff > 320) { nw = diff; nx = startPos.x + dx; }
                }
                if (handle?.includes('n')) {
                    const diff = startSize.h - dy;
                    if (diff > 250) { nh = diff; ny = startPos.y + dy; }
                }
            }

            nx = Math.max(-nw + 50, Math.min(window.innerWidth - 50, nx));
            ny = Math.max(0, Math.min(window.innerHeight - 50, ny));

            setPos({ x: nx, y: ny });
            if (handle !== 'move') setSize({ w: nw, h: nh });
        };

        const onMouseUp = () => {
            isInteracting.current = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        if (handle !== 'move' && handle) {
            const cursorMap: any = { n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };
            document.body.style.cursor = cursorMap[handle] || 'default';
        }
    }, [pos, size]);

    // Chat Communication
    const handleSend = async (customValue?: string) => {
        const textToSearch = customValue || inputValue;
        if (!textToSearch.trim()) return;

        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: textToSearch, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);
        setShowShortcuts(false); // Hide shortcuts when sending manually to keep feed focus

        try {
            const history = messages.map(m => ({ role: m.role === 'user' ? 'user' as const : 'model' as const, parts: m.content }));
            const result = await chatProjectAction(textToSearch, context.projectId || 'global', history, profile);
            if (result.success) {
                const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: result.data || '', agent: activeAgent, timestamp: Date.now() };
                setMessages(prev => [...prev, assistantMsg]);

                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('ai_interaction_logs').insert({
                        user_id: user.id,
                        project_id: context.projectId || null,
                        agent_id: activeAgent.toLowerCase().replace(/\s/g, '_'),
                        event_type: 'chat_omniscient',
                        prompt_used: textToSearch,
                        ai_response: { text: result.data },
                        metrics: { context_type: context.type, profile }
                    });
                }
            }
        } catch (error) {
            console.error('Chat error', error);
        } finally { setIsTyping(false); }
    };

    const quickActions = [
        { label: 'Resumir', icon: FileText, query: 'Haz un resumen ejecutivo de este documento destacando puntos críticos.' },
        { label: 'Check Normativo', icon: Search, query: 'Verifica si este contenido cumple con la normativa vigente.' },
        { label: 'Mejorar Texto', icon: Wand2, query: 'Analiza el estilo y sugiere mejoras técnicas para aumentar la precisión.' }
    ];

    if (!mounted || !initialized) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        key="launcher"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="pointer-events-auto absolute bottom-8 right-8 w-16 h-16 rounded-2xl bg-[#1e1e20] border border-white/10 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-primary group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                        <Bot className="w-8 h-8 relative z-10 group-hover:rotate-12 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1e1e20] animate-pulse" />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            left: pos.x,
                            top: pos.y,
                            width: size.w,
                            height: isExpanded ? size.h : 64,
                            position: 'absolute'
                        }}
                        className="pointer-events-auto bg-[#0d0d0f] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] rounded-3xl flex flex-col overflow-visible select-none"
                    >
                        {/* RESIZE HANDLES */}
                        {isExpanded && (
                            <>
                                <div onMouseDown={(e) => startInteraction('n', e)} className="absolute -top-1 left-4 right-4 h-3 cursor-ns-resize z-[1001]" />
                                <div onMouseDown={(e) => startInteraction('s', e)} className="absolute -bottom-1 left-4 right-4 h-3 cursor-ns-resize z-[1001]" />
                                <div onMouseDown={(e) => startInteraction('w', e)} className="absolute top-4 bottom-4 -left-1 w-3 cursor-ew-resize z-[1001]" />
                                <div onMouseDown={(e) => startInteraction('e', e)} className="absolute top-4 bottom-4 -right-1 w-3 cursor-ew-resize z-[1001]" />
                                <div onMouseDown={(e) => startInteraction('nw', e)} className="absolute -top-1 -left-1 w-6 h-6 cursor-nwse-resize z-[1002]" />
                                <div onMouseDown={(e) => startInteraction('ne', e)} className="absolute -top-1 -right-1 w-6 h-6 cursor-nesw-resize z-[1002]" />
                                <div onMouseDown={(e) => startInteraction('sw', e)} className="absolute -bottom-1 -left-1 w-6 h-6 cursor-nesw-resize z-[1002]" />
                                <div onMouseDown={(e) => startInteraction('se', e)} className="absolute -bottom-1 -right-1 w-10 h-10 cursor-nwse-resize z-[1002] flex items-end justify-end p-2.5 group">
                                    <div className="w-3 h-3 border-r-2 border-b-2 border-white/20 group-hover:border-primary transition-colors" />
                                </div>
                            </>
                        )}

                        {/* TOP BAR */}
                        <div
                            onMouseDown={(e) => startInteraction('move', e)}
                            className="p-5 flex items-center justify-between bg-white/[0.03] border-b border-white/5 cursor-move rounded-t-3xl shrink-0"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                                    <BrainCircuit className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Nexus Cognitive System</span>
                                    <span className="text-sm font-bold text-white flex items-center gap-2">
                                        {activeAgent}
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setIsOpen(false)} title="Minimizar al lanzador" className="p-2.5 hover:bg-white/10 rounded-xl text-white/40 transition-all hover:text-white">
                                    <Minimize2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsOpen(false)} title="Cerrar asistente" className="p-2.5 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-white/40 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="flex flex-col flex-1 overflow-hidden rounded-b-3xl">
                                {/* DYNAMIC CONTEXT HUD */}
                                <div className="px-5 py-3 bg-primary/[0.03] flex items-center justify-between border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <History className="w-3.5 h-3.5 text-white/20" />
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Contexto:</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 uppercase">{context.type}</span>
                                            {context.metadata?.title && (
                                                <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary truncate max-w-[180px]">
                                                    {context.metadata.title}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Cpu className="w-3.5 h-3.5 text-primary/40" />
                                        <span className="text-[9px] font-black text-primary/40 uppercase tracking-tighter">Gemini 2.5 Flash</span>
                                    </div>
                                </div>

                                {/* SCROLLABLE CHAT AREA */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gradient-to-b from-transparent to-black/40">
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-30">
                                            <Zap className="w-12 h-12 text-primary" />
                                            <p className="text-sm font-medium">Asistente Cognitivo Listo</p>
                                        </div>
                                    )}
                                    {messages.map((m) => (
                                        <div key={m.id} className={cn("flex gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                            <div className={cn(
                                                "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl relative",
                                                m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 backdrop-blur-md"
                                            )}>
                                                {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-6 h-6 text-primary" />}
                                                <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
                                            </div>
                                            <div className={cn("max-w-[85%] space-y-2", m.role === 'user' ? "items-end" : "items-start")}>
                                                <div className={cn(
                                                    "p-5 rounded-[2rem] text-[13.5px] leading-relaxed shadow-2xl",
                                                    m.role === 'user'
                                                        ? "bg-primary text-primary-foreground rounded-tr-none font-medium"
                                                        : "bg-white/[0.04] border border-white/5 rounded-tl-none text-white/90 backdrop-blur-lg"
                                                )}>
                                                    {m.role === 'user' ? (
                                                        m.content
                                                    ) : (
                                                        <div className="markdown-content prose prose-invert prose-sm max-w-none">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {m.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                                {m.agent && (
                                                    <div className="px-2 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{m.agent}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* AGENT ACTIVITY INDICATOR */}
                                    {isTyping && (
                                        <div className="flex gap-5">
                                            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                                                <Bot className="w-6 h-6 text-primary animate-pulse" />
                                            </div>
                                            <div className="flex flex-col gap-4">
                                                <div className="bg-white/5 border border-white/5 rounded-[2rem] rounded-tl-none p-6 flex gap-2.5 items-center backdrop-blur-md shadow-2xl">
                                                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* PERSISTENT BAR & INPUT AREA */}
                                <div className="p-8 bg-white/[0.02] border-t border-white/5 shrink-0 rounded-b-3xl space-y-4">
                                    {/* PERSISTENT QUICK ACTIONS */}
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                        <button
                                            onClick={() => setShowShortcuts(!showShortcuts)}
                                            className={cn(
                                                "p-2.5 rounded-xl border transition-all flex backdrop-blur-md shrink-0",
                                                showShortcuts ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 text-white/30 border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <Boxes className="w-4 h-4" />
                                        </button>

                                        <div className="flex gap-2">
                                            {quickActions.map((action) => (
                                                <button
                                                    key={action.label}
                                                    onClick={() => handleSend(action.query)}
                                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/40 transition-all text-left group whitespace-nowrap"
                                                >
                                                    <action.icon className="w-3.5 h-3.5 text-white/30 group-hover:text-primary transition-colors" />
                                                    <span className="text-[10px] font-bold text-white/40 group-hover:text-white transition-colors uppercase tracking-widest">{action.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <textarea
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                            placeholder="Introduce una consulta o instrucción técnica..."
                                            className="w-full bg-[#161618] border border-white/10 rounded-[1.8rem] px-7 py-5 text-[14px] pr-20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 min-h-[60px] max-h-48 resize-none text-white transition-all shadow-2xl placeholder:text-white/15 custom-scrollbar"
                                        />
                                        <button
                                            onClick={() => handleSend()}
                                            disabled={!inputValue.trim() || isTyping}
                                            className="absolute right-3.5 bottom-3.5 w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm group/btn"
                                        >
                                            <Send className="w-4.5 h-4.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--primary-rgb), 0.3); }
            `}</style>
        </div>
    );
}
