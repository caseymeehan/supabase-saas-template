create policy "can delete organisation which is admin of"
on "public"."organisation"
as permissive
for delete
to public
using (public.is_admin_of(auth.uid(), id));



