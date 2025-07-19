// src/lib/context/GlobalContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/types';

type Organization = Tables<'organisation'>;
type UserOrganisation = Tables<'user_organisation'> & {
    organisation: Organization;
};

type User = {
    email: string;
    id: string;
};

interface GlobalContextType {
    organizations: UserOrganisation[];
    currentOrg: Organization | null;
    setCurrentOrg: (org: Organization) => void;
    loading: boolean;
    user: User | null;  // Add this
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    const [organizations, setOrganizations] = useState<UserOrganisation[]>([]);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);  // Add this

    useEffect(() => {
        async function loadData() {
            try {
                const supabase = await createSPASassClient();
                const client = supabase.getSupabaseClient();

                // Get user data
                const { data: { user } } = await client.auth.getUser();
                if (user) {
                    setUser({
                        email: user.email!,
                        id: user.id
                    });
                } else {
                    throw new Error('User not found');
                }

                // Your existing organizations fetch
                const { data: orgs } = await client
                    .from('user_organisation')
                    .select(`
                        organisation_id,
                        user_id,
                        role,
                        created_at,
                        id,
                        organisation (
                            id,
                            name,
                            uuid,
                            created_at
                        )
                    `)
                    .eq('user_id', user?.id)
                    .returns<UserOrganisation[]>();

                setOrganizations(orgs || []);
                if(!orgs || !orgs.length) {
                    setLoading(false);
                    return;
                }
                if (orgs?.length > 0) {
                    setCurrentOrg(orgs[0].organisation);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    return (
        <GlobalContext.Provider value={{ organizations, currentOrg, setCurrentOrg, loading, user }}>
            {children}
        </GlobalContext.Provider>
    );
}

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error('useGlobal must be used within a GlobalProvider');
    }
    return context;
};