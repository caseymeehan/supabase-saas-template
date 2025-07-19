set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_organisation_billing_admin(_org_id bigint, _new_admin_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.is_admin_of((select auth.uid()), _org_id) THEN
    RETURN 'NOT_ADMIN';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM public.user_organisation uo
    JOIN public.user_information ui ON ui.user_id = uo.user_id
    WHERE uo.organisation_id = _org_id
    AND uo.role = 'ADMIN'
    AND ui.email = _new_admin_email
    AND uo.user_id != (select auth.uid())
  ) THEN
    RETURN 'INVALID_ADMIN';
  END IF;

  UPDATE public.organisation_billing_admin
  SET email = _new_admin_email
  WHERE org_id = _org_id;

  IF FOUND THEN
    RETURN 'SUCCESS';
  ELSE
    RETURN 'NOT_FOUND';
  END IF;
END;
$function$
;

create policy "can select billing admin"
on "public"."organisation_billing_admin"
as permissive
for select
to public
using (public.is_admin_of(auth.uid(), org_id));



