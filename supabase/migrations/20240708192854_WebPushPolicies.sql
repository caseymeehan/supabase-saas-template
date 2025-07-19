alter table "public"."user_notifications" enable row level security;

create policy "can update own notifications"
on "public"."user_notifications"
as permissive
for all
to public
using ((auth.uid() = user_id));



