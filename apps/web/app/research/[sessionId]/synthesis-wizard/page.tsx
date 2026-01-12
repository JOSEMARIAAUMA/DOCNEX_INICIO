'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// API & Types
import { getResearchSession, getDocumentsByIds, Document, ResearchSession } from '@/lib/api';
import { OutlineProposal } from '@/lib/ai/synthesis-schemas';

// Components
import { ScopeStep } from '@/components/research/wizard/ScopeStep';
import { StructureStep } from '@/components/research/wizard/StructureStep';
import { DraftingStep } from '@/components/research/wizard/DraftingStep';
import { ReviewStep } from '@/components/research/wizard/ReviewStep';
import { generateOutlineAction } from '@/app/research/actions';

// Since we cannot import agents (Node.js) into client components, we will need to create Server Actions.
// For now, I'll mock the agent call or assume a server action will be created.

interface SynthesisWizardPageProps {
    params: Promise<{ sessionId: string }>;
}

const STEPS = [
    { id: 'scope', title: 'Alcance' },
    { id: 'structure', title: 'Estructura' },
    { id: 'drafting', title: 'Borrador' },
    { id: 'review', title: 'Revisión' },
];

export default function SynthesisWizardPage({ params }: SynthesisWizardPageProps) {
    const { sessionId } = use(params);
    const router = useRouter();

    // -- State --
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<ResearchSession | null>(null);
    const [availableDocs, setAvailableDocs] = useState<Document[]>([]);

    // Wizard Data
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [outline, setOutline] = useState<OutlineProposal | null>(null);
    const [draftContent, setDraftContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // -- Load Initial Data --
    useEffect(() => {
        async function loadData() {
            try {
                const s = await getResearchSession(sessionId);
                if (s) {
                    setSession(s);
                    if (s.source_document_ids.length > 0) {
                        const docs = await getDocumentsByIds(s.source_document_ids);
                        setAvailableDocs(docs);
                        // Default select all
                        setSelectedDocIds(docs.map(d => d.id));
                    }
                }
            } catch (e) {
                console.error("Failed to load session", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [sessionId]);

    // -- Handlers --

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(c => c + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(c => c - 1);
        } else {
            router.push(`/research/${sessionId}`);
        }
    };

    // Actions (to be connected to Server Actions later)
    const handleGenerateOutline = async () => {
        setIsGenerating(true); // Reuse this state or add separate loading state
        try {
            const proposal = await generateOutlineAction(selectedDocIds);
            if (proposal) {
                setOutline(proposal);
                // Move to next step if needed or just show it
            }
        } catch (err) {
            console.error("Failed to generate outline", err);
            // Show error toast
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStartDrafting = async () => {
        setIsGenerating(true);
        // Start stream here
        setTimeout(() => {
            setDraftContent("This is a simulated generated draft content...");
            setIsGenerating(false);
        }, 2000);
    };

    const handleSaveDocument = async () => {
        console.log("Saving document...");
        router.push(`/research/${sessionId}`);
    };

    if (loading) return <div className="p-8">Cargando asistente...</div>;
    if (!session) return <div className="p-8">Sesión no encontrada</div>;

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="h-16 border-b flex items-center px-6 justify-between bg-card">
                <div className="flex items-center gap-4">
                    <button onClick={handleBack} className="p-2 hover:bg-muted rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg">Asistente de Síntesis</h1>
                        <p className="text-xs text-muted-foreground">{session.name}</p>
                    </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2">
                    {STEPS.map((step, idx) => (
                        <div key={step.id} className="flex items-center">
                            <div className={`
                                px-3 py-1 rounded-full text-sm font-medium transition-colors
                                ${currentStep === idx ? 'bg-primary text-primary-foreground' :
                                    currentStep > idx ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}
                            `}>
                                {idx + 1}. {step.title}
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className="w-8 h-px bg-border mx-2" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="w-20" /> {/* Spacer */}
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
                    {currentStep === 0 && (
                        <ScopeStep
                            availableDocs={availableDocs}
                            selectedDocIds={selectedDocIds}
                            onSelectionChange={setSelectedDocIds}
                        />
                    )}
                    {currentStep === 1 && (
                        <StructureStep
                            outline={outline}
                            isLoading={false} // Todo
                            onOutlineChange={setOutline}
                            onGenerateOutline={handleGenerateOutline}
                        />
                    )}
                    {currentStep === 2 && (
                        <DraftingStep
                            content={draftContent}
                            isGenerating={isGenerating}
                            onStartGeneration={handleStartDrafting}
                        />
                    )}
                    {currentStep === 3 && (
                        <ReviewStep
                            content={draftContent}
                            onSave={handleSaveDocument}
                        />
                    )}
                </div>

                {/* Footer Actions */}
                <footer className="h-20 border-t bg-card px-8 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={loading}
                        className="px-6 py-2 border rounded-lg hover:bg-muted font-medium"
                    >
                        {currentStep === 0 ? 'Cancelar' : 'Atrás'}
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={loading} // Add more disabled conditions
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg hover:opacity-90"
                    >
                        {currentStep === STEPS.length - 1 ? 'Finalizar' : 'Siguiente'}
                    </button>
                </footer>
            </main>
        </div>
    );
}
