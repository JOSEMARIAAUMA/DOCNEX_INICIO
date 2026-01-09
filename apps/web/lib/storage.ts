import { supabase } from './supabase/client';

const BUCKET_NAME = 'resources';

export interface UploadResult {
    path: string;
    url: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(projectId: string, file: File): Promise<UploadResult> {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${projectId}/${timestamp}_${safeName}`;

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return {
        path,
        url: urlData.publicUrl
    };
}

/**
 * Get a signed URL for a file (for private buckets)
 */
export async function getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
    return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

    if (error) throw error;
}

/**
 * Get file metadata
 */
export function getFileMetadata(file: File) {
    return {
        mime_type: file.type,
        file_size: file.size,
        name: file.name
    };
}
