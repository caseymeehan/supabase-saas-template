import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CheckoutButton } from '@/components/CheckoutButton';
import { Check } from 'lucide-react';
import LegalDocuments from "@/components/LegalDocuments";
import PricingService from "@/lib/pricing";
import TestModeBanner from "@/components/TestModeBanner";

interface PricingTiersProps {
    billingAdmin: string;
    orgId: number;
}

const PricingTiers: React.FC<PricingTiersProps> = ({ billingAdmin, orgId }) => {
    const tiers = PricingService.getAllTiers();
    const commonFeatures = PricingService.getCommonFeatures();

    const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox';

    return (
        <div className="py-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
                <p className="text-gray-600">Choose the plan that&#39;s right for your business</p>
            </div>


            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
                {tiers.map((tier) => (
                    <Card
                        key={tier.name}
                        className={`relative flex flex-col ${
                            tier.popular ? 'border-primary-500 shadow-lg' : ''
                        }`}
                    >
                        {tier.popular && (
                            <div
                                className="absolute top-0 right-0 -translate-y-1/2 px-3 py-1 bg-primary-500 text-white text-sm rounded-full">
                                Most Popular
                            </div>
                        )}

                        <CardHeader>
                            <CardTitle className="text-2xl">{tier.name}</CardTitle>
                            <CardDescription>{tier.description}</CardDescription>
                        </CardHeader>

                        <CardContent className="flex-grow flex flex-col">
                            <div className="mb-6">
                                <span className="text-4xl font-bold">{PricingService.formatPrice(tier.price)}</span>
                                <span className="text-gray-600 ml-2">/month</span>
                            </div>

                            <ul className="space-y-3 mb-8 flex-grow">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-green-500"/>
                                        <span className="text-gray-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <CheckoutButton
                                priceId={tier.priceId}
                                label={`Subscribe to ${tier.name}`}
                                billing_admin_email={billingAdmin}
                                org_id={orgId}
                            />
                        </CardContent>
                    </Card>
                ))}
            </div>



            <div className="mt-12 text-center">
                <p className="text-gray-600">
                    All plans include: {commonFeatures.join(', ')}
                </p>
            </div>


            {isSandbox && (
                <div className="w-full mt-12 flex justify-center">
                    <div>
                        <TestModeBanner/>
                    </div>
                </div>
            )}

            <LegalDocuments minimalist={false}/>
        </div>
    );
};

export default PricingTiers;