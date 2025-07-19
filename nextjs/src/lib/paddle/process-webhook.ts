import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  EventEntity,
  EventName,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent, TransactionCompletedEvent,
} from '@paddle/paddle-node-sdk';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import {Json} from "@/lib/types";

type CustomData = {
  org_id?: number;
}

export class ProcessWebhook {
  async processEvent(eventData: EventEntity) {
    switch (eventData.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await this.updateSubscriptionData(eventData);
        break;
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
        await this.updateCustomerData(eventData);
        break;
      case EventName.TransactionCompleted:
        await this.updateCustomerProducts(eventData);
        break;
    }
    await this.storeEvent(eventData);
  }

  private async updateCustomerProducts(eventData: TransactionCompletedEvent) {
    try{
      const supaClient = await createServerAdminClient()
      for (const item of eventData.data.items) {
        const response = await supaClient.from('paddle_customer_products').insert([{
          product_id: item.price?.productId ?? '',
          customer_id: eventData.data.customerId ?? '',
          by_price_id: item.price?.id ?? '',
        }]);
        console.log(response);
      }

    } catch (e) {
      console.error(e);
    }
  }

  private async storeEvent(eventData: EventEntity) {
    try{
      const supaClient = await createServerAdminClient()
      const realJson = eventData as unknown as Json;
      const response = await supaClient.from('paddle_events').insert([{
        item: realJson,
        type: eventData.eventType
      }]);
      console.log(response);

    } catch (e) {
      console.error(e);
    }
  }

  private async updateSubscriptionData(eventData: SubscriptionCreatedEvent | SubscriptionUpdatedEvent) {

    const org_id = (eventData.data?.customData as CustomData)?.org_id ?? null;
    try {
      const supaClient = await createServerAdminClient()
      const response = await supaClient
        .from('paddle_customer_subscriptions')
        .upsert({
          subscription_id: eventData.data.id,
          subscription_status: eventData.data.status,
          price_id: eventData.data.items[0].price?.id ?? '',
          product_id: eventData.data.items[0].price?.productId ?? '',
          scheduled_change: eventData.data.scheduledChange?.effectiveAt,
          customer_id: eventData.data.customerId,
          org_id: org_id,
        })
        .select();
      console.log(response);
    } catch (e) {
      console.error(e);
    }
  }

  private async updateCustomerData(eventData: CustomerCreatedEvent | CustomerUpdatedEvent) {
    try {
      const supaClient = await createServerAdminClient()
      const response = await supaClient
        .from('paddle_customers')
        .upsert({
          customer_id: eventData.data.id,
          email: eventData.data.email,
          marketing_consent: eventData.data.marketingConsent,
        })
        .select();
      console.log(response);
    } catch (e) {
      console.error(e);
    }
  }
}
