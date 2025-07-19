CREATE UNIQUE INDEX user_notifications_id_key ON public.user_notifications USING btree (id);

CREATE UNIQUE INDEX user_notifications_pkey ON public.user_notifications USING btree (id);

CREATE UNIQUE INDEX user_notifications_subscription_key ON public.user_notifications USING btree (subscription);

alter table "public"."user_notifications" add constraint "user_notifications_pkey" PRIMARY KEY using index "user_notifications_pkey";

alter table "public"."user_notifications" add constraint "user_notifications_id_key" UNIQUE using index "user_notifications_id_key";

alter table "public"."user_notifications" add constraint "user_notifications_subscription_key" UNIQUE using index "user_notifications_subscription_key";


