"use client";
import React, { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useGlobal } from '@/lib/context/GlobalContext';
import { FileUp, File, Trash2, CheckCircle, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { createSPASassClient } from '@/lib/supabase/client';
import { FileObject, StorageError } from '@supabase/storage-js';
import { PostgrestError } from '@supabase/supabase-js';

interface DocumentWithUrl extends FileObject {
    url: string;
}

interface StorageErrorWithStatus extends StorageError {
    statusCode?: number | string;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

const DocumentSharing: React.FC = () => {
    const { currentOrg, organizations } = useGlobal();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [uploading, setUploading] = useState<boolean>(false);
    const [documents, setDocuments] = useState<DocumentWithUrl[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const userRole = organizations.find(org => org.organisation.id === currentOrg?.id)?.role;

    const canUpload = userRole === 'ADMIN' || userRole === 'EDITOR';
    const canDelete = userRole === 'ADMIN';

    useEffect(() => {
        if (currentOrg) {
            loadDocuments();
        }
    }, [currentOrg]);

    const handleOpen = async (doc: DocumentWithUrl): Promise<void> => {
        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const { data, error } = await client.storage
                .from('documents')
                .createSignedUrl(doc.url, 60 * 5, { download: false });

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl);
            }
        } catch (err) {
            handleError(err);
        }
    };

    const handleDownload = async (doc: DocumentWithUrl): Promise<void> => {
        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const { data, error } = await client.storage
                .from('documents')
                .createSignedUrl(doc.url, 60 * 5, { download: true });

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl);
            }
        } catch (err) {
            handleError(err);
        }
    };

    const handleError = (err: unknown): void => {
        console.error('Error:', err);
        const storageError = err as StorageErrorWithStatus;
        const postgrestError = err as PostgrestError;

        if (storageError.statusCode === 403 || storageError.statusCode == "403") {
            setError('Permission denied. Please contact the organization admin. Do you have an active license?');
        } else if (postgrestError.code === '42501') { // PostgreSQL permission denied
            setError('You do not have permission to perform this action.');
        } else if (storageError.message) {
            console.log(storageError);
            setError(storageError.message);
        } else {
            setError('An unexpected error occurred. Please try again.');
        }
    };

    const loadDocuments = async (): Promise<void> => {
        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const { data, error } = await client
                .storage
                .from('documents')
                .list(`${currentOrg!.id}/`);

            if (error) throw error;

            if (!data) {
                setDocuments([]);
                return;
            }

            const documentsWithUrls: DocumentWithUrl[] = data.map((file) => ({
                ...file,
                url: `${currentOrg!.id}/${file.name}`
            }));

            setDocuments(documentsWithUrls);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    const validateFiles = (files: File[]): boolean => {
        // Check total number of files
        if (files.length > MAX_FILES) {
            setError(`You can only upload up to ${MAX_FILES} files at once.`);
            return false;
        }

        // Check file sizes
        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE_MB * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            setError(`Files must be smaller than ${MAX_FILE_SIZE_MB}MB. Please remove: ${
                oversizedFiles.map(f => f.name).join(', ')
            }`);
            return false;
        }

        return true;
    };

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>): void => {
        if (!canUpload) {
            setError('You do not have permission to upload files.');
            return;
        }

        const files = event.target.files;
        if (!files) return;

        const pdfs = Array.from(files).filter(file => file.type === 'application/pdf');
        const nonPdfs = Array.from(files).filter(file => file.type !== 'application/pdf');

        if (nonPdfs.length > 0) {
            setError('Only PDF files are allowed. Non-PDF files were ignored.');
        }

        if (!validateFiles(pdfs)) {
            event.target.value = '';
            return;
        }

        setSelectedFiles(prev => [...prev, ...pdfs]);
        event.target.value = '';
    };

    const removeFile = (index: number): void => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async (): Promise<void> => {
        if (!canUpload) {
            setError('You do not have permission to upload files.');
            return;
        }

        if (selectedFiles.length === 0) {
            setError('Please select at least one PDF file to upload');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            for (const file of selectedFiles) {
                const fileName = `${currentOrg!.id}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await client
                    .storage
                    .from('documents')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;
            }

            setSuccess(`Successfully uploaded ${selectedFiles.length} file(s)`);
            setSelectedFiles([]);
            await loadDocuments();
        } catch (err) {
            handleError(err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileName: string): Promise<void> => {
        if (!canDelete) {
            setError('Only administrators can delete files.');
            return;
        }

        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const { error } = await client
                .storage
                .from('documents')
                .remove([`${currentOrg!.id}/${fileName}`]);

            if (error) throw error;

            setSuccess('File deleted successfully');
            await loadDocuments();
        } catch (err) {
            handleError(err);
        }
    };

    if (!currentOrg) {
        return (
            <div className="p-4">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Please select an organization to upload files.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }


    return (
        <div className="space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">PDF Document Sharing</h1>
                <p className="text-muted-foreground">
                    Upload and share PDF documents within {currentOrg.name}
                </p>
                {!canUpload && documents.length > 0 && (
                    <p className="text-sm text-gray-500">
                        You have view-only access to documents.
                    </p>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            {canUpload && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload PDFs</CardTitle>
                        <CardDescription>
                            Select PDF files to share with your organization
                            (Max {MAX_FILE_SIZE_MB}MB per file, up to {MAX_FILES} files)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <FileUp className="h-12 w-12 text-gray-400" />
                                <div className="text-center">
                                    <p className="text-sm text-gray-600">
                                        Drag and drop your PDF files here, or
                                    </p>
                                    <label className="mt-2 inline-block">
                                        <span className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 cursor-pointer">
                                            Browse Files
                                        </span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf"
                                            multiple
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-medium">Selected Files</h3>
                                <div className="divide-y divide-gray-200 rounded-md border border-gray-200">
                                    {selectedFiles.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-4"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <File className="h-6 w-6 text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="text-gray-400 hover:text-gray-500"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="flex items-center gap-2"
                                    >
                                        {uploading ? 'Uploading...' : 'Upload Files'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Shared Documents</CardTitle>
                    <CardDescription>
                        PDF documents shared within your organization
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <File className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p>No documents have been shared yet</p>
                            {canUpload && (
                                <p className="text-sm">
                                    Upload your first PDF to get started
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between py-4">
                                    <div className="flex items-center space-x-3">
                                        <File className="h-6 w-6 text-gray-400" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {doc.name.split('/').pop()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleOpen(doc)}
                                            className="p-2 text-gray-400 hover:text-gray-500"
                                            title="Open in new tab"
                                        >
                                            <ExternalLink className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDownload(doc)}
                                            className="p-2 text-gray-400 hover:text-gray-500"
                                            title="Download"
                                        >
                                            <Download className="h-5 w-5" />
                                        </button>
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(doc.name)}
                                                className="p-2 text-gray-400 hover:text-red-500"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DocumentSharing;