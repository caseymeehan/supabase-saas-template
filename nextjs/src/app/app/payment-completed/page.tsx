"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PaymentCompletedPage() {
    const [showCheck, setShowCheck] = useState(false);

    useEffect(() => {
        setShowCheck(true);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                    <div className="text-center space-y-6">
                        <div className="relative mx-auto h-24 w-24">
                            <svg
                                viewBox="0 0 100 100"
                                className="w-full h-full"
                            >
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="4"
                                    strokeDasharray="283"
                                    strokeDashoffset={showCheck ? "0" : "283"}
                                    style={{
                                        transition: "stroke-dashoffset 0.6s ease-out"
                                    }}
                                />

                                <path
                                    d="M30 50 L45 65 L70 35"
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray="75"
                                    strokeDashoffset={showCheck ? "0" : "75"}
                                    style={{
                                        transition: "stroke-dashoffset 0.3s ease-out 0.6s"
                                    }}
                                />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Payment Successful!
                            </h1>
                            <p className="text-gray-600">
                                Thank you for your purchase. Your license will be activated shortly.
                            </p>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                            <p>Please note:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>License activation may take a few minutes</li>
                                <li>You&#39;ll receive a confirmation email shortly</li>
                                <li>Contact support if you need immediate assistance</li>
                            </ul>
                        </div>

                        <Link
                            href="/app/organisation-settings"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
                        >
                            Return to Dashboard
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}