'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/UiButton";
import { Beaker, Loader2, CheckCircle2 } from "lucide-react";
import {
    createProject,
    createDocument,
    createBlock,
    createSubBlock,
    createBlockComment,
    createSemanticLink,
    getActiveProject,
    getWorkspaces,
    createResource
} from '@/lib/api';

export default function ComplexityDemoGenerator() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const generateDemo = async () => {
        setStatus('loading');
        try {
            // 1. Get Workspace
            const workspaces = await getWorkspaces();
            const wsId = workspaces[0]?.id;
            if (!wsId) throw new Error("No workspace found");

            // 2. Create Project
            const project = await createProject(wsId, "URBAN REGENERATION 2026", "Mature project masterplan for historical district restoration.");
            if (!project) throw new Error("Failed to create project");

            // 3. Create Document
            const doc = await createDocument(project.id, "Plan Estratégico de Intervención");
            if (!doc) throw new Error("Failed to create document");

            // 4. Create Blocks & Sub-blocks
            // Block 1: Intro
            const b1 = await createBlock(doc.id, "Análisis de la situación actual del centro histórico de Sevilla.", 0, "01. CONTEXTO ANALÍTICO");

            // Sub-blocks for B1
            if (b1) {
                await createSubBlock(doc.id, b1.id, "Estudio demográfico 2020-2025.", 0, "1.1 Demografía");
                const b12 = await createSubBlock(doc.id, b1.id, "Mapa de degradación de fachadas en el barrio del Arenal.", 1, "1.2 Estado Edificatorio");

                // Note for B12
                if (b12) {
                    await createBlockComment(b12.id, "degradación", "La IA detecta una correlación del 85% entre humedad y fallo estructural en esta zona.", 'ai_instruction');
                    await createBlockComment(b12.id, "Arenal", "Revisar permisos con la Gerencia de Urbanismo.", 'review');
                }
            }

            // Block 2: Proposition
            const b2 = await createBlock(doc.id, "Propuesta de peatonalización y zonas verdes de baja emisión.", 1, "02. PROPUESTA TÉCNICA");
            if (b2) {
                const b21 = await createSubBlock(doc.id, b2.id, "Cálculo de reducción de CO2 por metro cuadrado.", 0, "2.1 Impacto Ambiental");

                // AI Note for B2
                await createBlockComment(b2.id, "peatonalización", "Sugerencia: Integrar sistemas de drenaje urbano sostenible (SUDS) en el subsuelo.", 'ai_instruction');
            }

            // Block 3: Resources & Links
            const b3 = await createBlock(doc.id, "Referencias legales y normativas aplicables (PGOU).", 2, "03. MARCO NORMATIVO");

            // Create a Resource
            const res = await createResource(project.id, "Normativa PGOU Sevilla 2025", "pdf", {}, doc.id);

            // Create Semantic Links
            if (b1 && b2) {
                await createSemanticLink({
                    source_block_id: b1.id,
                    target_block_id: b2.id,
                    target_document_id: doc.id,
                    link_type: 'semantic_similarity',
                    metadata: { confidence: 0.92, context: 'El análisis de degradación justifica la intervención de peatonalización.' }
                });
            }

            setStatus('success');
            setTimeout(() => setStatus('idle'), 5000);
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Beaker className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Acelerador de Madurez (Demo)</h3>
                        <p className="text-xs text-muted-foreground">Genera un proyecto complejo con jerarquías, nexos y notas de IA.</p>
                    </div>
                </div>
                <Button
                    onClick={generateDemo}
                    disabled={status === 'loading' || status === 'success'}
                    variant={status === 'success' ? 'outline' : 'default'}
                    className="min-w-[140px]"
                >
                    {status === 'loading' ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</>
                    ) : status === 'success' ? (
                        <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Listo</>
                    ) : (
                        "Generar Escenario"
                    )}
                </Button>
            </div>
            {status === 'success' && (
                <div className="text-[10px] text-green-500 font-medium animate-in fade-in slide-in-from-top-1">
                    Proyecto "URBAN REGENERATION 2026" creado con éxito. Ve a Proyectos para verlo.
                </div>
            )}
        </div>
    );
}
