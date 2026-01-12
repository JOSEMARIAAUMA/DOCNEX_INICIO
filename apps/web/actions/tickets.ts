'use server';

import { promises as fs } from 'fs';
import path from 'path';

const TICKETS_FILE = path.join(process.cwd(), 'apps/web/data/ai-tickets.json');

export interface AITicket {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'waiting' | 'resolved';
    revag: string;
    created_at: string;
}

export async function getTickets(): Promise<AITicket[]> {
    try {
        const data = await fs.readFile(TICKETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

export async function saveTickets(tickets: AITicket[]) {
    await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

export async function createTicket(title: string, description: string) {
    const tickets = await getTickets();
    const newTicket: AITicket = {
        id: Math.random().toString(36).substring(7),
        title,
        description,
        status: 'pending',
        revag: '',
        created_at: new Date().toISOString()
    };
    tickets.push(newTicket);
    await saveTickets(tickets);
    return newTicket;
}

export async function updateTicket(id: string, updates: Partial<AITicket>) {
    const tickets = await getTickets();
    const idx = tickets.findIndex(t => t.id === id);
    if (idx !== -1) {
        tickets[idx] = { ...tickets[idx], ...updates };
        await saveTickets(tickets);
    }
}
