export interface AIContext {
    role: string;
    tone: 'formal' | 'tecnico' | 'casual' | 'legal';
    objective: string;
    customInstructions: string;
}

export interface AIProfile {
    id: string;
    name: string;
    description: string;
    context: AIContext;
    is_active: boolean;
    last_modified: number;
}
