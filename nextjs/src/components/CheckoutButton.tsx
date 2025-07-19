/* eslint-disable  @typescript-eslint/no-unused-vars */
'use client';

import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { Environments, initializePaddle } from '@paddle/paddle-js';
import { useState } from 'react';

interface CheckoutButtonProps {
    priceId: string;
    label: string;
    billing_admin_email: string;
    org_id: number;
}

export function CheckoutButton({ priceId, label, billing_admin_email, org_id }: CheckoutButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);

        try {
            const paddle = await initializePaddle({
                token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
                environment: process.env.NEXT_PUBLIC_PADDLE_ENV as Environments,
                checkout: {
                    settings: {
                        theme: 'light',
                    },
                },
            });

            if (!paddle) {
                throw new Error('Failed to initialize Paddle');
            }

            paddle.Checkout.open({
                items: [{priceId, quantity: 1}],
                customer: {
                    email: billing_admin_email
                },
                customData: {
                    org_id: org_id
                },
                settings: {
                    allowLogout: false,
                    successUrl: `${window.location.origin}/app/payment-completed`
                }
            });
        } catch (error) {
            console.error('Checkout error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={loading}
        >
            <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {loading ? 'Processing...' : label}
            </>
        </Button>
    );
}