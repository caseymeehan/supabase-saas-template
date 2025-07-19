import { useState } from 'react';

export function useCustomerPortal() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openCustomerPortal = async (orgId?: number) => {
        if (!orgId) {
            setError('Organization ID is required');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/customer-portal?orgId=${orgId}`);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to open customer portal');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        openCustomerPortal,
        isLoading,
        error
    };
}