'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Map, Layout, Zap, FileText, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface RegistryItem {
    category: string;
    feature: string;
    purpose: string;
    location: string;
    status: string;
}

export default function VisualRegistryPage() {
    const [items, setItems] = useState<RegistryItem[]>([]);
    const [verified, setVerified] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetch('/data/visual-registry.json')
            .then(res => res.json())
            .then(data => setItems(data))
            .catch(() => { });

        const stored = localStorage.getItem('visual_verified_checklist');
        if (stored) setVerified(JSON.parse(stored));
    }, []);

    const toggleVerify = (feature: string) => {
        const next = { ...verified, [feature]: !verified[feature] };
        setVerified(next);
        localStorage.setItem('visual_verified_checklist', JSON.stringify(next));
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-12">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-12">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic">Registro Visual de Implementaciones</h1>
                        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-1">Checklist de Validación para el Usuario</p>
                    </div>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Categoría</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Funcionalidad</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Propósito</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Ubicación</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Validar</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Feedback</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                    <td className="p-6">
                                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="p-6 font-bold text-white/90">{item.feature}</td>
                                    <td className="p-6 text-sm text-white/40 leading-relaxed max-w-xs">{item.purpose}</td>
                                    <td className="p-6 text-[10px] font-mono text-cyan-400 capitalize">{item.location}</td>
                                    <td className="p-6 text-center">
                                        <button
                                            onClick={() => toggleVerify(item.feature)}
                                            className={`p-3 rounded-2xl transition-all ${verified[item.feature] ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/20 border border-white/10 hover:border-white/20'}`}
                                        >
                                            <CheckCircle2 className={`w-6 h-6 ${verified[item.feature] ? 'animate-pulse' : ''}`} />
                                        </button>
                                    </td>
                                    <td className="p-6">
                                        <input
                                            type="text"
                                            placeholder="Anotar feedback..."
                                            className="bg-transparent border-b border-white/10 focus:border-primary transition-colors text-sm py-1 outline-none w-full text-white/60 font-medium"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-12 p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Zap className="w-8 h-8 text-indigo-400" />
                        <div>
                            <h3 className="font-bold text-white uppercase tracking-tighter">¿Ves algo que falta o no funciona?</h3>
                            <p className="text-indigo-200/40 text-sm italic">Usa el botón de <strong>Tickets</strong> en el lateral para informarme.</p>
                        </div>
                    </div>
                    <Link href="/admin/tickets" className="px-8 py-3 bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">
                        Ir a Tickets
                    </Link>
                </div>
            </div>
        </div>
    );
}
