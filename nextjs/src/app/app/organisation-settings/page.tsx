"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGlobal } from '@/lib/context/GlobalContext';
import { createSPASassClient } from '@/lib/supabase/client';
import { Users, Key, CheckCircle, Plus, Trash2, Settings, CreditCard, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {OrganisationRole, OrganisationUser, ApiKey} from "@/lib/supabase/unified";
import PricingTiers from "@/components/pricing";
import PricingService from "@/lib/pricing";


interface SubscriptionStatus {
    subscription_id: string;
    subscription_status: string;
    product_id: string;
    price_id: string;
}

export default function OrganisationSettingsPage() {
    const { currentOrg, user: loggedInUser } = useGlobal();
    const [users, setUsers] = useState<OrganisationUser[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [myRole, setMyRole] = useState<OrganisationRole | null>(null);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
    const [showDeleteApiKeyDialog, setShowDeleteApiKeyDialog] = useState(false);
    const [showBillingAdminDialog, setShowBillingAdminDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState<OrganisationUser | null>(null);
    const [apiKeyToDelete, setApiKeyToDelete] = useState<ApiKey | null>(null);
    const [inviteCode, setInviteCode] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [billingAdmin, setBillingAdmin] = useState('');
    const [newBillingAdmin, setNewBillingAdmin] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
    const [showEditOrgNameDialog, setShowEditOrgNameDialog] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [showDeleteOrgDialog, setShowDeleteOrgDialog] = useState(false);


    const loadData = async () => {
        if (!currentOrg || loading) return;

        try {
            setLoading(true);
            const supabase = await createSPASassClient();
            const { data: userData, error: userError } = await supabase.loadOrganisationDetails(currentOrg.id);

            if (userError) throw userError;
            setUsers(userData);


            // Load subscription status
            const { data: subscriptionData, error: subscriptionError } = await supabase.getSupabaseClient()
                .rpc('get_organisation_subscription_status', {
                    _org_id: currentOrg.id
                });

            if (subscriptionError) throw subscriptionError;
            if (subscriptionData && subscriptionData.length > 0) {
                setSubscriptionStatus(subscriptionData[0]);
            } else {
                setSubscriptionStatus(null);
            }

            // Load billing admin
            const { data: billingAdminData, error: billingError } = await supabase.getSupabaseClient()
                .from('organisation_billing_admin')
                .select('email')
                .eq('org_id', currentOrg.id)
                .single();

            if (billingError) {
                if(billingError.code != "PGRST116") {
                    throw billingError;
                }
            }
            if (billingAdminData) {
                setBillingAdmin(billingAdminData.email);
            }

            // Find my role
            const myUserData = userData.find(u => u.user_id === loggedInUser?.id);
            if(!myUserData) throw new Error('User not found in organization');
            setMyRole(myUserData?.role);

            // Load API keys if admin
            if (myUserData?.role === 'ADMIN') {
                const { data: apiKeyData, error: apiKeyError } = await supabase.getOrganisationApiKeys(currentOrg.id);

                if (apiKeyError) throw apiKeyError;
                setApiKeys(apiKeyData);
            }
        } catch (err) {
            console.error('Error loading organization data:', err);
            setError('Failed to load organization data');
        } finally {
            setLoading(false);
        }
    };



    const handleUpdateOrgName = async () => {
        if (!currentOrg || !newOrgName) return;

        try {
            setLoading(true);
            const supabase = await createSPASassClient();
            const { data, error } = await supabase.updateOrganisationName(currentOrg.id, newOrgName);

            if (error) throw error;

            if (data !== 'SUCCESS') {
                switch (data) {
                    case 'NOT_ADMIN':
                        setError('You must be an admin to update the organization name');
                        break;
                    case 'INVALID_NAME_LENGTH':
                        setError('Organization name must be between 3 and 100 characters');
                        break;
                    case 'NOT_FOUND':
                        setError('Organization not found');
                        break;
                    default:
                        setError('Failed to update organization name');
                }
                return;
            }

            setSuccess('Organization name updated successfully');
            setShowEditOrgNameDialog(false);
            setNewOrgName('');
            window.location.reload(); // Reload to update all references to org name
        } catch (err) {
            console.error('Error updating organization name:', err);
            setError('Failed to update organization name');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentOrg) {
            loadData();
        }
    }, [currentOrg]);

    const handleUpdateBillingAdmin = async () => {
        if (!currentOrg || !newBillingAdmin) return;

        try {
            setLoading(true);
            const supabase = await createSPASassClient();
            const { data, error } = await supabase.getSupabaseClient().rpc(
                'update_organisation_billing_admin',
                {
                    _org_id: currentOrg.id,
                    _new_admin_email: newBillingAdmin
                }
            );

            if (error) throw error;

            if (data !== 'SUCCESS') {
                switch (data) {
                    case 'NOT_ADMIN':
                        setError('You must be an admin to change the billing admin');
                        break;
                    case 'INVALID_ADMIN':
                        setError('The new billing admin must be an organization admin');
                        break;
                    default:
                        setError('Failed to update billing admin');
                }
                return;
            }

            setSuccess('Billing admin updated successfully');
            setShowBillingAdminDialog(false);
            setNewBillingAdmin('');
            loadData();
        } catch (err) {
            console.error('Error updating billing admin:', err);
            setError('Failed to update billing admin');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        if (!inviteCode && !inviteEmail) {
            setError('Please provide either an invite code or email');
            return;
        }
        if (!currentOrg) return;

        try {
            setLoading(true);
            const supabase = await createSPASassClient();

            if (inviteCode) {
                const { data, error } = await supabase.addUserWithCodeToOrganisation(currentOrg.id, inviteCode);

                if (error) throw error;
                if (data !== 'OK') {
                    setError(data);
                    return;
                }
            } else {
                const { data, error } = await supabase.inviteUserByOrganisationAdmin(currentOrg.id, inviteEmail)

                if (error || data.error) throw error || data.error;
            }

            setSuccess('User added successfully');
            setShowInviteDialog(false);
            setInviteCode('');
            setInviteEmail('');
            loadData();
        } catch (err) {
            console.error('Error adding user:', err);
            setError('Failed to add user');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (user: OrganisationUser, newRole: string) => {
        if (!currentOrg) return;
        try {
            setLoading(true);
            const supabase = await createSPASassClient();

            const convertedRole = newRole as OrganisationRole;

            const { data, error } = await supabase.updateUserRoleInOrganisation(currentOrg.id, user.user_id, convertedRole)

            if (error) throw error;

            if (data !== 'OK') {
                setError(data);
                return;
            }

            setSuccess('User role updated successfully');
            loadData();
        } catch (err) {
            console.error('Error updating user role:', err);
            setError('Failed to update user role');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        if (!currentOrg) return;

        try {
            setLoading(true);
            const supabase = await createSPASassClient();

            const { error } = await supabase.getSupabaseClient()
                .from('user_organisation')
                .delete()
                .eq('organisation_id', currentOrg.id)
                .eq('user_id', userToDelete.user_id);

            if (error) throw error;

            setSuccess('User removed successfully');
            setShowDeleteUserDialog(false);
            setUserToDelete(null);
            loadData();
        } catch (err) {
            console.error('Error removing user:', err);
            setError('Failed to remove user');
        } finally {
            setLoading(false);
        }
    };

    const handleAddApiKey = async () => {
        if (!currentOrg) return;
        try {
            setLoading(true);
            const supabase = await createSPASassClient();

            const { error } = await supabase.getSupabaseClient()
                .from('organisation_apikey')
                .insert([{ org_id: currentOrg.id }]);

            if (error) throw error;

            setSuccess('API key added successfully');
            loadData();
        } catch (err) {
            console.error('Error adding API key:', err);
            setError('Failed to add API key');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteApiKey = async () => {
        if (!apiKeyToDelete) return;

        try {
            setLoading(true);
            const supabase = await createSPASassClient();

            const { error } = await supabase.getSupabaseClient()
                .from('organisation_apikey')
                .delete()
                .eq('id', apiKeyToDelete.id);

            if (error) throw error;

            setSuccess('API key removed successfully');
            setShowDeleteApiKeyDialog(false);
            setApiKeyToDelete(null);
            loadData();
        } catch (err) {
            console.error('Error removing API key:', err);
            setError('Failed to remove API key');
        } finally {
            setLoading(false);
        }
    };

    const copyApiKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setSuccess('API key copied to clipboard');
    };

    if (!currentOrg) {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold">Please select an organization first</h1>
            </div>
        );
    }

    const renderSubscriptionStatus = () => {
        if (!subscriptionStatus) {
            return (
                <div className="bg-white border rounded-lg p-6">
                    <div className="flex items-start space-x-4">
                        <Package className="h-5 w-5 text-gray-400 mt-1" />
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">
                                No Active Subscription
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Scroll down and choose a subscription plan to access features for your organization.
                            </p>
                        </div>
                    </div>
                </div>
            );
        } else {
            const statusConfig = {
                active: {
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    label: 'Active'
                },
                trialing: {
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    label: 'Trial'
                },
                paused: {
                    color: 'text-yellow-600',
                    bgColor: 'bg-yellow-50',
                    label: 'Paused'
                },
                canceled: {
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    label: 'Canceled'
                }
            };

            const status = subscriptionStatus.subscription_status as keyof typeof statusConfig;
            const config = statusConfig[status] || statusConfig.canceled;
            const tierName = PricingService.getTierByProductId(subscriptionStatus.product_id)?.name || 'Unknown';

            return (
                <div className="bg-white border rounded-lg p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                            <div className={`${config.bgColor} p-2 rounded-full`}>
                                <Package className={`h-5 w-5 ${config.color}`} />
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {tierName} Plan
                                    </h3>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                                    {config.label}
                                </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    {status === 'active' && 'Your subscription is active and in good standing.'}
                                    {status === 'trialing' && 'Your trial period is currently active.'}
                                    {status === 'paused' && 'Your subscription is temporarily paused.'}
                                    {status === 'canceled' && 'Your subscription has been canceled.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {status === 'active' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.location.href = '#pricing'}
                                >
                                    Manage Plan
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = 'mailto:support@example.com'}
                            >
                                Contact Support
                            </Button>
                        </div>
                    </div>
                </div>
            );

        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
                    {myRole === 'ADMIN' && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setNewOrgName(currentOrg.name);
                                    setShowEditOrgNameDialog(true);
                                }}
                            >
                                <Settings className="h-4 w-4 mr-2"/>
                                Edit Name
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteOrgDialog(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2"/>
                                Delete Organization
                            </Button>
                        </div>
                    )}
                </div>
                <p className="text-muted-foreground">
                    Manage {currentOrg.name}&#39;s users and settings
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle className="h-4 w-4"/>
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            {/* Users Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5"/>
                            Organization Users
                        </CardTitle>
                        <CardDescription>Manage users in your organization</CardDescription>
                    </div>
                    {myRole === 'ADMIN' && (
                        <Button onClick={() => setShowInviteDialog(true)}>
                            <Plus className="h-4 w-4 mr-2"/>
                            Add User
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                {myRole === 'ADMIN' && (
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                )}
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.user_id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {myRole === 'ADMIN' && user.user_id !== loggedInUser?.id ? (
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user, e.target.value)}
                                                className="border rounded px-2 py-1 text-sm"
                                                disabled={loading}
                                            >
                                                <option value="ADMIN">Admin</option>
                                                <option value="EDITOR">Editor</option>
                                                <option value="VIEWER">Viewer</option>
                                            </select>
                                        ) : (
                                            user.role
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    {myRole === 'ADMIN' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {user.role !== 'ADMIN' && user.user_id !== loggedInUser?.id && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setUserToDelete(user);
                                                        setShowDeleteUserDialog(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* API Keys Section - Only visible to admins */}
            {myRole === 'ADMIN' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5"/>
                                API Keys
                            </CardTitle>
                            <CardDescription>Manage API keys for programmatic access</CardDescription>
                        </div>
                        <Button onClick={handleAddApiKey} disabled={loading}>
                            <Plus className="h-4 w-4 mr-2"/>
                            Generate New Key
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Key
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {apiKeys.map((apiKey) => (
                                    <tr key={apiKey.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                                <span className="flex items-center gap-2">
                                                    {`${apiKey.key.substring(0, 10)}...`}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyApiKey(apiKey.key)}
                                                    >
                                                        Copy
                                                    </Button>
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(apiKey.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setApiKeyToDelete(apiKey);
                                                    setShowDeleteApiKeyDialog(true);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}


            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5"/>
                            Subscription Status
                        </CardTitle>
                        <CardDescription>Current subscription plan and status</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderSubscriptionStatus()}
                </CardContent>
            </Card>

            {/* Billing Admin Section - Only visible to admins */}
            {myRole === 'ADMIN' && (
                <>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5"/>
                                    Billing Administration
                                </CardTitle>
                                <CardDescription>Manage billing admin for your organization</CardDescription>
                            </div>
                            <Button onClick={() => setShowBillingAdminDialog(true)} disabled={loading}>
                                <Settings className="h-4 w-4 mr-2"/>
                                Change Billing Admin
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Current Billing Admin</p>
                                            <p className="text-sm text-gray-500">{billingAdmin}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                    <p>The billing admin is responsible for managing subscriptions and payments for the
                                        organization.</p>
                                    <p className="mt-1">Only organization admins can be assigned as billing admins.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {subscriptionStatus == null && (
                        <PricingTiers billingAdmin={billingAdmin} orgId={currentOrg.id}></PricingTiers>
                    )}

                </>

            )}

            {/* Dialogs */}
            {/* Billing Admin Change Dialog */}
            {showBillingAdminDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Change Billing Admin</CardTitle>
                            <CardDescription>
                                Update the billing administrator for {currentOrg?.name}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Alert>
                                    <AlertTriangle className="h-4 w-4 text-yellow-600"/>
                                    <AlertDescription>
                                        <p className="font-medium">Important Notice:</p>
                                        <ul className="list-disc ml-4 mt-2 space-y-1">
                                            <li>The new billing admin must be an organization admin.</li>
                                            <li>This change will affect billing notifications and account access.</li>
                                            <li>If you have active subscriptions, please contact support before making
                                                this change.
                                            </li>
                                            <li>The new billing admin will be responsible for managing all
                                                billing-related tasks.
                                            </li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        New Billing Admin Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newBillingAdmin}
                                        onChange={(e) => setNewBillingAdmin(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        placeholder="Enter admin's email address"
                                    />
                                    <p className="text-sm text-gray-500">
                                        Must be an existing organization admins email address
                                    </p>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowBillingAdminDialog(false);
                                            setNewBillingAdmin('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="default"
                                        onClick={handleUpdateBillingAdmin}
                                        disabled={loading || !newBillingAdmin}
                                    >
                                        {loading ? 'Updating...' : 'Update Billing Admin'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add User Dialog */}
            {showInviteDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Add User</CardTitle>
                            <CardDescription>
                                Add a user by invite code or email address
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Invite Code</label>
                                <input
                                    type="text"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    placeholder="Enter user's invite code"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-300"/>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-white px-2 text-gray-500">Or</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    placeholder="Enter user's email address"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowInviteDialog(false);
                                        setInviteCode('');
                                        setInviteEmail('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleAddUser}
                                    disabled={loading || (!inviteCode && !inviteEmail)}
                                >
                                    Add User
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Delete User Confirmation Dialog */}
            {showDeleteUserDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Remove User</CardTitle>
                            <CardDescription>
                                Are you sure you want to remove this user from the organization?
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-4">
                                This will remove {userToDelete?.email} from {currentOrg.name}.
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowDeleteUserDialog(false);
                                        setUserToDelete(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteUser}
                                    disabled={loading}
                                >
                                    Remove User
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Delete API Key Confirmation Dialog */}
            {showDeleteApiKeyDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Delete API Key</CardTitle>
                            <CardDescription>
                                Are you sure you want to delete this API key?
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-4">
                                This action cannot be undone. Any applications using this key will no longer have
                                access.
                            </p>
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowDeleteApiKeyDialog(false);
                                        setApiKeyToDelete(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteApiKey}
                                    disabled={loading}
                                >
                                    Delete Key
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Edit Organization Name Dialog */}
            {showEditOrgNameDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Edit Organization Name</CardTitle>
                            <CardDescription>
                                Update the name for {currentOrg?.name}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Organization Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        placeholder="Enter new organization name"
                                    />
                                    <p className="text-sm text-gray-500">
                                        Must be between 3 and 100 characters
                                    </p>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowEditOrgNameDialog(false);
                                            setNewOrgName('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="default"
                                        onClick={handleUpdateOrgName}
                                        disabled={loading || !newOrgName || newOrgName === currentOrg?.name}
                                    >
                                        {loading ? 'Updating...' : 'Update Name'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Delete Organization Confirmation Dialog */}
            {showDeleteOrgDialog && (

                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Delete Organization</CardTitle>
                            <CardDescription>
                                Contact Support to Delete {currentOrg?.name}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Alert>
                                    <AlertTriangle className="h-4 w-4 text-yellow-600"/>
                                    <AlertDescription>
                                        <p className="font-medium">Organization Deletion</p>
                                        <p className="mt-2">
                                            To ensure data security and prevent accidental deletions, organization
                                            removal requires assistance from our support team.
                                        </p>
                                    </AlertDescription>
                                </Alert>

                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-sm text-gray-700">
                                        Please contact our support team to assist you with deleting your organization.
                                        They will:
                                    </p>
                                    <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc ml-4">
                                        <li>Verify your identity and ownership</li>
                                        <li>Help you backup any important data</li>
                                        <li>Guide you through the deletion process</li>
                                        {subscriptionStatus && (
                                            <li>Handle any subscription-related matters</li>
                                        )}
                                    </ul>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteOrgDialog(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="default"
                                        onClick={() => window.location.href = 'mailto:support@example.com?subject=Organization%20Deletion%20Request'}
                                    >
                                        Contact Support
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}