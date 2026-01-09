#!/usr/bin/env node

/**
 * Backup script to export all documents before database migrations
 * Usage: node scripts/backup-before-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    console.log('💡 Set it in your .env.local file or pass it when running the script:');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key node scripts/backup-before-migration.ts');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createBackup() {
    try {
        console.log('🔄 Starting database backup...');

        // Create backups directory if it doesn't exist
        const backupsDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = path.join(backupsDir, `backup_${timestamp}.json`);

        // Fetch all data
        const { data: workspaces, error: wsError } = await supabase
            .from('workspaces')
            .select('*');

        if (wsError) throw wsError;

        const { data: projects, error: projError } = await supabase
            .from('projects')
            .select('*');

        if (projError) throw projError;

        const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('*');

        if (docsError) throw docsError;

        const { data: blocks, error: blocksError } = await supabase
            .from('document_blocks')
            .select('*')
            .eq('is_deleted', false);

        if (blocksError) throw blocksError;

        const { data: history, error: histError } = await supabase
            .from('document_history')
            .select('*');

        if (histError) throw histError;

        const { data: comments, error: commentsError } = await supabase
            .from('block_comments')
            .select('*');

        if (commentsError) throw commentsError;

        // Create backup object
        const backup = {
            created_at: new Date().toISOString(),
            version: '1.0',
            stats: {
                workspaces: workspaces?.length || 0,
                projects: projects?.length || 0,
                documents: documents?.length || 0,
                blocks: blocks?.length || 0,
                history: history?.length || 0,
                comments: comments?.length || 0,
            },
            data: {
                workspaces,
                projects,
                documents,
                blocks,
                history,
                comments,
            }
        };

        // Write to file
        fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

        console.log('✅ Backup created successfully!');
        console.log(`📁 File: ${filename}`);
        console.log(`📊 Stats:`);
        console.log(`   - Workspaces: ${backup.stats.workspaces}`);
        console.log(`   - Projects: ${backup.stats.projects}`);
        console.log(`   - Documents: ${backup.stats.documents}`);
        console.log(`   - Blocks: ${backup.stats.blocks}`);
        console.log(`   - History entries: ${backup.stats.history}`);
        console.log(`   - Comments: ${backup.stats.comments}`);
        console.log('');
        console.log('To restore this backup, run:');
        console.log(`  node scripts/restore-backup.ts ${filename}`);

        return filename;
    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }
}

// Run backup
createBackup();
