"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {
    Home,
    Settings,
    User,
    Building2,
    Menu,
    X,
    ChevronDown,
    LogOut,
    Key,
    Plus,
    CreditCard
} from 'lucide-react';
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { useCustomerPortal } from '@/hooks/useCustomerPortal'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
    const [isOrgSelectorOpen, setOrgSelectorOpen] = useState(false);
    const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [createOrgError, setCreateOrgError] = useState('');
    const pathname = usePathname();
    const { openCustomerPortal, isLoading } = useCustomerPortal()
    const router = useRouter();


    const { organizations, currentOrg, setCurrentOrg, loading, user } = useGlobal();

    const handleLogout = async () => {
        try {
            const client = await createSPASassClient();
            await client.logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };
    const handleChangePassword = async () => {
        router.push('/app/user-settings')
    };

    const isCurrentOrgAdmin = () => {

        if (!currentOrg || !organizations) return false;
        const org = organizations.find(org => org.organisation.id === currentOrg.id);
        return org?.role === 'ADMIN';
    };

    const handleCreateOrganization = async () => {
        if (!newOrgName.trim()) {
            setCreateOrgError('Organization name is required');
            return;
        }

        try {
            const supabase = await createSPASassClient();
            const { data, error } = await supabase.create_organisation(newOrgName.trim())

            if (error) throw error;

            if (data !== 'SUCCESS') {
                switch (data) {
                    case 'MAX_ORGANISATION_ALLOWED':
                        setCreateOrgError('You have reached the maximum number of organizations allowed');
                        break;
                    case 'SYSTEM_SETTINGS_FALSE':
                        setCreateOrgError('Organization creation is currently disabled');
                        break;
                    default:
                        setCreateOrgError('Failed to create organization');
                }
                return;
            }

            setShowCreateOrgDialog(false);
            setNewOrgName('');
            setOrgSelectorOpen(false);
            window.location.reload();
        } catch (err) {
            console.error('Error creating organization:', err);
            setCreateOrgError('Failed to create organization');
        }
    };

    const getInitials = (email: string) => {
        const parts = email.split('@')[0].split(/[._-]/);
        return parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    };

    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;

    const navigation = [
        { name: 'Homepage', href: '/app', icon: Home },
        { name: 'Example Page', href: '/app/example', icon: Building2 },
        { name: 'Organisation Settings', href: '/app/organisation-settings', icon: Settings },
        { name: 'User Settings', href: '/app/user-settings', icon: User },
    ];

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    return (
        <div className="min-h-screen bg-gray-100">
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out z-30 
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

                <div className="h-16 flex items-center justify-between px-4 border-b">
                    <span className="text-xl font-semibold text-primary-600">{productName}</span>
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="mt-4 px-2 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                    isActive
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <item.icon
                                    className={`mr-3 h-5 w-5 ${
                                        isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                                    }`}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                    {isCurrentOrgAdmin() && (
                        <button
                            onClick={() => openCustomerPortal(currentOrg?.id)}
                            disabled={isLoading || !currentOrg}
                            className={`group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md
                                text-gray-600 hover:bg-gray-50 hover:text-gray-900 
                                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <CreditCard className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                            {isLoading ? 'Loading...' : 'Billing & Subscription'}
                        </button>
                    )}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
                    <div className="relative">
                        <button
                            onClick={() => setOrgSelectorOpen(!isOrgSelectorOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
                        >
                            {loading ? (
                                <span className="text-gray-500">Loading organizations...</span>
                            ) : currentOrg ? (
                                <>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                                            <span className="text-primary-700 text-xs font-medium">
                                                {currentOrg.name.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <span>{currentOrg.name}</span>
                                    </div>
                                </>
                            ) : (
                                <span className="text-gray-500">No organizations</span>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </button>

                        {isOrgSelectorOpen && (
                            <div className="absolute bottom-full mb-2 w-full bg-white border rounded-md shadow-lg divide-y divide-gray-100">
                                {organizations.map((org) => (
                                    <button
                                        key={org.organisation.id}
                                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                                            currentOrg?.id === org.organisation.id ? 'bg-primary-50' : ''
                                        }`}
                                        onClick={() => {
                                            setCurrentOrg(org.organisation);
                                            setOrgSelectorOpen(false);
                                        }}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                                <span className="text-primary-700 font-medium">
                                                    {org.organisation.name.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {org.organisation.name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {org.role.charAt(0).toUpperCase() + org.role.slice(1).toLowerCase()}
                                                </span>
                                            </div>
                                            {currentOrg?.id === org.organisation.id && (
                                                <span className="ml-auto text-primary-600">
                                                    <div className="w-2 h-2 rounded-full bg-primary-600" />
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                                <div className="p-2">
                                    <button
                                        onClick={() => setShowCreateOrgDialog(true)}
                                        className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-md flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create New Organization
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:pl-64">
                <div className="sticky top-0 z-10 flex items-center justify-between h-16 bg-white shadow-sm px-4">
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                    >
                        <Menu className="h-6 w-6"/>
                    </button>

                    <div className="relative ml-auto">
                        <button
                            onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
                            className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-primary-700 font-medium">
                                    {user ? getInitials(user.email) : '??'}
                                </span>
                            </div>
                            <span>{user?.email || 'Loading...'}</span>
                            <ChevronDown className="h-4 w-4"/>
                        </button>

                        {isUserDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border">
                                <div className="p-2 border-b border-gray-100">
                                    <p className="text-xs text-gray-500">Signed in as</p>
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {user?.email}
                                    </p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setUserDropdownOpen(false);
                                            handleChangePassword()
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <Key className="mr-3 h-4 w-4 text-gray-400"/>
                                        Change Password
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setUserDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut className="mr-3 h-4 w-4 text-red-400"/>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <main className="p-4">
                    {children}
                </main>
            </div>

            {showCreateOrgDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium mb-4">Create New Organization</h3>

                        {createOrgError && (
                            <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">
                                {createOrgError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    id="orgName"
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                                    placeholder="Enter organization name"
                                />
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowCreateOrgDialog(false);
                                        setNewOrgName('');
                                        setCreateOrgError('');
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateOrganization}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}