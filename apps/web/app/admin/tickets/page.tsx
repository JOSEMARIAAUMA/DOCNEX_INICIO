'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Ticket, Search, Filter, MessageSquare, CheckCircle, Clock, Pause, AlertCircle, ChevronLeft, Send, Zap } from 'lucide-react';
import { getTickets, createTicket, updateTicket, AITicket } from '@/actions/tickets';
import Link from 'next/link';

export default function TicketsPage() {
    const [tickets, setTickets] = useState<AITicket[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const load = () => getTickets().then(setTickets);
    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;
        await createTicket(title, description);
        setTitle('');
        setDescription('');
        setIsCreating(false);
        load();
    };

    const toggleStatus = async (id: string, current: string) => {
        const next = current === 'resolved' ? 'pending' : 'resolved';
        await updateTicket(id, { status: next as any });
        load();
    };

    const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

    const statusIcons = {
        pending: <AlertCircle className="w-4 h-4 text-rose-400" />,
        in_progress: <Clock className="w-4 h-4 text-blue-400 animate-spin-slow" />,
        waiting: <Pause className="w-4 h-4 text-amber-400" />,
        resolved: <CheckCircle className="w-4 h-4 text-emerald-400" />
    };

    const statusLabels = {
        pending: 'Pendiente',
        in_progress: 'En Proceso',
        waiting: 'En Espera',
        resolved: 'Resuelto'
    };

    return (
        <div className="min-h-screen bg-[#080808] text-white p-12">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Módulo de Tickets Técnicos</h1>
                            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-1">Comunicación Directa con Antigravity</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Ticket
                    </button>
                </div>

                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    {['all', 'pending', 'in_progress', 'waiting', 'resolved'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter === f ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}
                        >
                            {f === 'all' ? 'Todos los Tickets' : statusLabels[f as keyof typeof statusLabels]}
                        </button>
                    ))}
                </div>

                {isCreating && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-xl shadow-2xl">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6">Crear Nuevo Ticket</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <input
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-primary"
                                    placeholder="Título breve del problema..."
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    autoFocus
                                />
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-primary h-32 resize-none"
                                    placeholder="Explica qué sucede o qué necesitas que Antigravity refine..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        Enviar a Antigravity
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    {filtered.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
                            <Ticket className="w-16 h-16 text-white/5 mx-auto mb-4" />
                            <p className="text-white/20 font-medium uppercase tracking-widest text-xs">No hay tickets bajo este filtro</p>
                        </div>
                    ) : (
                        filtered.map(ticket => (
                            <div key={ticket.id} className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] hover:border-white/10 transition-all flex items-start gap-8">
                                <button
                                    onClick={() => toggleStatus(ticket.id, ticket.status)}
                                    className={`mt-1 p-4 rounded-[1.5rem] transition-all flex-shrink-0 border ${ticket.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/20 border-white/10 hover:border-white/20'}`}
                                >
                                    <CheckCircle className="w-8 h-8" />
                                </button>
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                            {statusIcons[ticket.status]}
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {statusLabels[ticket.status]}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-white/20 font-mono">#{ticket.id} • {new Date(ticket.created_at).toLocaleString()}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{ticket.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed mb-6">{ticket.description}</p>

                                    {ticket.revag && (
                                        <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl relative">
                                            <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">
                                                <Zap className="w-3 h-3" />
                                                Reporte RevAG
                                            </div>
                                            <p className="text-indigo-200/80 text-sm leading-relaxed italic">"{ticket.revag}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <style jsx global>{\`
                @keyframes spin-slow {
                    from {transform: rotate(0deg); }
                to {transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            \`}</style>
        </div>
    );
}
