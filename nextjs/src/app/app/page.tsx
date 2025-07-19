"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, AlertCircle, FileText, HardDrive, ChevronRight } from 'lucide-react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { createSPASassClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface DocumentMetadata {
    name: string;
    size: number;
    created_at: string;
}

interface DailyMetric {
    date: string;
    uploads: number;
    totalSize: number;
}

interface DashboardMetrics {
    totalMembers: number;
    totalDocuments: number;
    totalStorageUsed: number;
    averageFileSize: number;
}

export default function DashboardContent() {
    const { currentOrg, user } = useGlobal();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        totalMembers: 0,
        totalDocuments: 0,
        totalStorageUsed: 0,
        averageFileSize: 0
    });
    const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
    const [uploadTrends, setUploadTrends] = useState<DailyMetric[]>([]);

    useEffect(() => {
        if (currentOrg) {
            loadDashboardData();
        }
    }, [currentOrg]);

    const aggregateUploadTrends = (docs: DocumentMetadata[]): DailyMetric[] => {
        // Get last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }).reverse();

        // Create a map for quick lookup
        const uploadsByDate = new Map<string, { uploads: number; totalSize: number }>();

        // Initialize all dates with zero values
        last7Days.forEach(date => {
            uploadsByDate.set(date, { uploads: 0, totalSize: 0 });
        });

        // Aggregate document data
        docs.forEach(doc => {
            const docDate = new Date(doc.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            if (uploadsByDate.has(docDate)) {
                const current = uploadsByDate.get(docDate)!;
                uploadsByDate.set(docDate, {
                    uploads: current.uploads + 1,
                    totalSize: current.totalSize + doc.size
                });
            }
        });

        // Convert to array format for charts
        return last7Days.map(date => {
            const metrics = uploadsByDate.get(date)!;
            return {
                date,
                uploads: metrics.uploads,
                totalSize: metrics.totalSize
            };
        });
    };

    const loadDashboardData = async () => {
        if (!currentOrg) return;

        try {
            setLoading(true);
            const supabase = await createSPASassClient();

            // Load organization members
            const { data: members, error: membersError } = await supabase.loadOrganisationDetails(currentOrg.id);
            if (membersError) throw membersError;

            // Load storage data
            const { data: files, error: filesError } = await supabase
                .getSupabaseClient()
                .storage
                .from('documents')
                .list(`${currentOrg.id}/`);
            if (filesError) throw filesError;

            const docs = files?.map(file => ({
                name: file.name,
                size: file.metadata?.size || 0,
                created_at: file.created_at
            })) || [];

            setDocuments(docs);

            // Calculate trending data
            const trends = aggregateUploadTrends(docs);
            setUploadTrends(trends);

            // Calculate metrics
            const totalStorage = docs.reduce((acc, doc) => acc + doc.size, 0);
            const avgFileSize = docs.length > 0 ? totalStorage / docs.length : 0;

            setMetrics({
                totalMembers: members.length,
                totalDocuments: docs.length,
                totalStorageUsed: totalStorage,
                averageFileSize: avgFileSize
            });

        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Welcome back, {user?.email?.split('@')[0]}</h1>
                    <p className="text-gray-600">Here&#39;s what&#39;s happening in {currentOrg?.name}</p>
                </div>
                <Link
                    href="/app/organisation-settings"
                    className="flex items-center text-primary-600 hover:text-primary-700"
                >
                    Organization Settings
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Team Members</p>
                                <p className="text-2xl font-bold mt-1">{metrics.totalMembers}</p>
                            </div>
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Storage</p>
                                <p className="text-2xl font-bold mt-1">{formatBytes(metrics.totalStorageUsed)}</p>
                            </div>
                            <HardDrive className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">PDFs Shared</p>
                                <p className="text-2xl font-bold mt-1">{metrics.totalDocuments}</p>
                            </div>
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Avg. File Size</p>
                                <p className="text-2xl font-bold mt-1">{formatBytes(metrics.averageFileSize)}</p>
                            </div>
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Activity</CardTitle>
                        <CardDescription>Number of PDFs uploaded per day</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={uploadTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="uploads"
                                        name="Uploads"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        animationDuration={750}
                                        animationBegin={0}
                                        animationEasing="ease-out"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Storage Growth</CardTitle>
                        <CardDescription>Daily storage consumption</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={uploadTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={(value) => formatBytes(value)} />
                                    <Tooltip formatter={(value) => formatBytes(value as number)} />
                                    <Bar
                                        dataKey="totalSize"
                                        name="Storage Used"
                                        fill="#3b82f6"
                                        animationDuration={750}
                                        animationBegin={0}
                                        animationEasing="ease-out"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Documents</CardTitle>
                    <CardDescription>Latest PDF uploads</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="divide-y">
                        {documents.slice(0, 5).map((doc, index) => (
                            <div key={index} className="py-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <FileText className="h-6 w-6 text-gray-400" />
                                    <div>
                                        <p className="font-medium">{doc.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatBytes(doc.size)} • {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}