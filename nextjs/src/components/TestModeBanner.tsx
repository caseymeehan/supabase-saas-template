import React from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';

const TestModeBanner = () => {
    const testCardDetails = [
        { label: 'Card Number', value: '4242 4242 4242 4242' },
        { label: 'Name', value: 'Adam Testerro' },
        { label: 'CVV', value: '100' },
        { label: 'Expiration', value: '03/26' }
    ];

    return (
        <div >
            <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <AlertTitle className="text-blue-700 font-semibold ml-2">
                    Test Mode Active
                </AlertTitle>
            </Alert>

            <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="h-6 w-6 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Test Card Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {testCardDetails.map(({ label, value }) => (
                        <div key={label} className="flex flex-col">
                            <span className="text-sm text-gray-600">{label}</span>
                            <span className="font-mono text-base font-medium text-gray-800">
                {value}
              </span>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                        Use these credentials to test the payment system. No real charges will be made.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TestModeBanner;