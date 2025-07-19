"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGlobal } from '@/lib/context/GlobalContext';
import { createSPASassClient } from '@/lib/supabase/client';
import { Key, User, ShieldAlert, CheckCircle } from 'lucide-react';
import {Tables} from "@/lib/types";
import { MFASetup } from '@/components/MFASetup';
import {generateRandomString} from "@/lib/utils";

export default function UserSettingsPage() {
    const { user } = useGlobal();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [isInviteCodeEnabled, setIsInviteCodeEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [userDetails, setUserDetails] = useState<Tables<'user_information'> | null>(null);

    useEffect(() => {
        if(!user) return;
        fetchUserDetails();
        fetchInviteCode();
    }, [user]);

    const fetchUserDetails = async () => {
        if(!user) {
            console.error('User not found');
            return;
        }
        try {
            const supabase = await createSPASassClient();
            const { data: userInfo, error: userError } = await supabase.getUserInformations(user?.id);

            if (userError) throw userError;
            setUserDetails(userInfo);
        } catch (err) {
            console.error('Error fetching user details:', err);
            setError('Failed to load user details');
        }
    };

    const fetchInviteCode = async () => {
        if (!user) {
            console.error('User not found');
            return;
        }
        try {
            const supabase = await createSPASassClient();
            const { data, error } = await supabase.getUserInviteCode(user?.id);

            if (error) throw error;

            if (data) {
                setInviteCode(data.user_code);
                setIsInviteCodeEnabled(data.enabled);
            }
        } catch (err) {
            console.error('Error fetching invite code:', err);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("New passwords don't match");
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const { error } = await client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccess('Password updated successfully');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: Error | unknown) {
            if (err instanceof Error) {
                console.error('Error updating password:', err);
                setError(err.message);
            } else {
                console.error('Error updating password:', err);
                setError('Failed to update password');
            }
        } finally {
            setLoading(false);
        }
    };

    const rerollInviteCode = async () => {
        if(!user) {
            console.error('User not found');
            return;
        }
        try {
            const supabase = await createSPASassClient();
            const codeToSet = generateRandomString(22);

            const { data, error } = await supabase.getSupabaseClient()
                .from('user_invite_code')
                .update({ user_code: codeToSet })
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setInviteCode(data.user_code);
                setSuccess('Invite code regenerated successfully');
            }
        } catch (err) {
            console.error('Error regenerating invite code:', err);
            setError('Failed to regenerate invite code');
        }
    };

    const toggleInviteCode = async () => {
        if(!user) {
            console.error('User not found');
            return;
        }
        try {
            const supabase = await createSPASassClient();

            const { error } = await supabase.setStatusOfUserInviteCode(user?.id, !isInviteCodeEnabled);

            if (error) throw error;

            setIsInviteCodeEnabled(!isInviteCodeEnabled);
            setSuccess(`Invite code ${!isInviteCodeEnabled ? 'enabled' : 'disabled'} successfully`);
        } catch (err) {
            console.error('Error toggling invite code:', err);
            setError('Failed to toggle invite code');
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">User Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences
                </p>
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

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                User Details
                            </CardTitle>
                            <CardDescription>Your account information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">User ID</label>
                                <p className="mt-1 text-sm">{user?.id}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Email</label>
                                <p className="mt-1 text-sm">{user?.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Account Created</label>
                                <p className="mt-1 text-sm">
                                    {userDetails?.created_at ? new Date(userDetails.created_at).toLocaleString() : 'Loading...'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                Change Password
                            </CardTitle>
                            <CardDescription>Update your account password</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirm-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 text-sm"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                                >
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    <MFASetup
                        onStatusChange={() => {
                            setSuccess('Two-factor authentication settings updated successfully');
                        }}
                    />
                </div>

                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                Organization Invite Code
                            </CardTitle>
                            <CardDescription>
                                Share this code to invite others to your organizations
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                                    <p className="mb-2">
                                        <span className="font-medium text-gray-900">What is an invite code?</span>
                                    </p>
                                    <p className="mb-2">
                                        Your invite code allows other users to join organizations where you are an administrator.
                                        When someone signs up, they can enter your invite code to automatically join your organization.
                                    </p>
                                    <p>
                                        You can enable or disable this code at any time. When disabled, the code cannot be used to join organizations.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Your Invite Code</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            readOnly
                                            className="w-full font-mono bg-gray-50 p-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(inviteCode);
                                                    setSuccess('Code copied to clipboard!');
                                                    setTimeout(() => setSuccess(''), 2000);
                                                }}
                                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                            >
                                                Copy
                                            </button>
                                            <span className="mx-2 text-gray-300">|</span>
                                            <button
                                                onClick={rerollInviteCode}
                                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                            >
                                                Reroll
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Code Status</p>
                                            <p className="text-sm text-gray-500">
                                                {isInviteCodeEnabled
                                                    ? 'Your code is currently active and can be used'
                                                    : 'Your code is currently inactive'}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            isInviteCodeEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {isInviteCodeEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>

                                    <button
                                        onClick={toggleInviteCode}
                                        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                                    >
                                        {isInviteCodeEnabled ? 'Disable Invite Code' : 'Enable Invite Code'}
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}