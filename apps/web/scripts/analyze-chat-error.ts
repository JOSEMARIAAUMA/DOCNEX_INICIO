
import * as dotenv from 'dotenv';
import path from 'path';
import { aiService } from '@/lib/ai/service';

// Manually load env since we are running a script
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testChat() {
    console.log("🔍 Testing AI Service Chat...");

    try {
        const response = await aiService.chatProject(
            "Hola, ¿cómo estás?",
            "dummy-project-id" // Passing a dummy ID might cause Supabase empty returns, but shouldn't crash if handled gracefully
        );
        console.log("✅ Chat Success:", response);
    } catch (error) {
        console.error("❌ Chat Failed:");
        console.error(error);
    }
}

testChat().catch(console.error);
