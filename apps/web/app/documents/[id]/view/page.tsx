import { supabase } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import { DocumentFullViewer } from '@/components/viewer/DocumentFullViewer';

export default async function FullViewPage({ params }: { params: { id: string } }) {
    // Basic session check if needed, but since helpers are missing, we use standard client
    // For now we just fetch the document.
    const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', (await params).id)
        .single();

    if (error || !document) {
        redirect('/documents');
    }

    return (
        <main className="min-h-screen bg-background">
            <DocumentFullViewer document={document} />
        </main>
    );
}
