import { NextRequest } from 'next/server';
import { ProcessWebhook } from '@/lib/paddle/process-webhook';
import { getPaddleInstance } from '@/lib/paddle/get-paddle-instance';

const webhookProcessor = new ProcessWebhook();

export async function POST(request: NextRequest) {
    console.log("REQUEST", request)
    const signature = request.headers.get('paddle-signature') || '';
    const rawRequestBody = await request.text();
    const privateKey = process.env['PRIVATE_WEBHOOK_SECRET'] || '';

    let status, eventName;
    console.log(rawRequestBody)
    try {
        if (signature && rawRequestBody) {
            const paddle = getPaddleInstance();
            const eventData = await paddle.webhooks.unmarshal(rawRequestBody, privateKey, signature);
            status = 200;
            eventName = eventData?.eventType ?? 'Unknown event';
            if (eventData) {
                await webhookProcessor.processEvent(eventData);
            }
        } else {
            status = 400;
            console.log('Missing signature from header');
        }
    } catch (e) {
        status = 500;
        console.log(e);
    }
    return Response.json({ status, eventName });
}