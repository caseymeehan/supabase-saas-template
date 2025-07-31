import { NextResponse } from 'next/server';
import { getPaddleInstance } from '@/lib/paddle/get-paddle-instance';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');

        if (!orgId) {
            return NextResponse.json(
                { error: 'Organization ID is required' },
                { status: 400 }
            );
        }

        const supabase = await createSSRClient();

        // Get billing admin email for the organization
        const { data: billingAdmin, error: billingError } = await supabase
            .from('organisation_billing_admin')
            .select('email')
            .eq('org_id', parseInt(orgId))
            .single();

        if (billingError || !billingAdmin) {
            return NextResponse.json(
                { error: 'Billing admin not found' },
                { status: 404 }
            );
        }

        const billingEmail = billingAdmin.email;

        // Get or create customer
        const paddle = getPaddleInstance();
        const existingCustomer = paddle.customers.list({
            email: [billingEmail],
            status: ["active", "archived"],
        });

        let customerId = '';

        if (existingCustomer.hasMore) {
            const nextCustomerBunch = await existingCustomer.next();
            if (nextCustomerBunch.length > 0) {
                customerId = nextCustomerBunch[0].id;
                if (nextCustomerBunch[0].status === "archived") {
                    await paddle.customers.update(customerId, {
                        status: "active"
                    });
                }
            } else {
                const newCustomer = await paddle.customers.create({
                    email: billingEmail,
                });
                customerId = newCustomer.id;
            }
        } else {
            const newCustomer = await paddle.customers.create({
                email: billingEmail,
            });
            customerId = newCustomer.id;
        }

        const customerPortalSession = await paddle.customerPortalSessions.create(
            customerId, []
        );

        return NextResponse.json({
            url: customerPortalSession.urls.general.overview
        });
    } catch (error) {
        console.error('Error creating customer portal session:', error);
        return NextResponse.json(
            { error: 'Failed to create customer portal session' },
            { status: 500 }
        );
    }
}