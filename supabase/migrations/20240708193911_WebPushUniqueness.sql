ALTER TABLE "public"."user_notifications" DROP CONSTRAINT IF EXISTS "user_notifications_subscription_key";
DROP INDEX IF EXISTS "user_notifications_subscription_key";

CREATE UNIQUE INDEX user_notifications_user_subscription_key ON public.user_notifications USING btree (user_id, subscription);

ALTER TABLE "public"."user_notifications" ADD CONSTRAINT "user_notifications_user_subscription_key" UNIQUE USING INDEX "user_notifications_user_subscription_key";