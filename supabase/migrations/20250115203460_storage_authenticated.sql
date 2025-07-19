create policy "Editor can edit all documents flreew_0"
on "storage"."objects"
as permissive
for update
to public
using (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] <> 'null'::text) AND public.is_user_authenticated() AND public.is_minimum_role(auth.uid(), ((storage.foldername(name))[1])::bigint, 'EDITOR'::organisation_role) AND public.is_minimum_subscription_for_org_enabled(((storage.foldername(name))[1])::bigint, 1)));

create policy "Editor can edit all documents flreew_1"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] <> 'null'::text) AND public.is_user_authenticated() AND public.is_minimum_role(auth.uid(), ((storage.foldername(name))[1])::bigint, 'EDITOR'::organisation_role) AND public.is_minimum_subscription_for_org_enabled(((storage.foldername(name))[1])::bigint, 1)));

create policy "Editor can edit all documents flreew_2"
on "storage"."objects"
as permissive
for delete
to public
using (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] <> 'null'::text) AND public.is_user_authenticated() AND public.is_minimum_role(auth.uid(), ((storage.foldername(name))[1])::bigint, 'EDITOR'::organisation_role) AND public.is_minimum_subscription_for_org_enabled(((storage.foldername(name))[1])::bigint, 1)));

create policy "Editor can edit all documents flreew_3"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] <> 'null'::text) AND public.is_user_authenticated() AND public.is_minimum_role(auth.uid(), ((storage.foldername(name))[1])::bigint, 'EDITOR'::organisation_role) AND public.is_minimum_subscription_for_org_enabled(((storage.foldername(name))[1])::bigint, 1) AND public.is_storage_limit_not_reached(((storage.foldername(name))[1])::bigint, bucket_id)));

create policy "can access documents storage - being a viewer flreew_0"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] <> 'null'::text) AND public.is_user_authenticated() AND public.is_minimum_role(auth.uid(), ((storage.foldername(name))[1])::bigint, 'VIEWER'::organisation_role) AND public.is_minimum_subscription_for_org_enabled(((storage.foldername(name))[1])::bigint, 1)));