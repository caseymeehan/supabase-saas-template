CREATE OR REPLACE FUNCTION public.is_user_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT array[(select auth.jwt()->>'aal')] <@ (
    SELECT
      CASE
        WHEN count(id) > 0 THEN array['aal2']
        ELSE array['aal1', 'aal2']
      END as aal
    FROM auth.mfa_factors
    WHERE (auth.uid() = user_id)
    AND status = 'verified'
  );
$$;

CREATE POLICY "MFA required for factory user access"
ON public.factory_user
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());

CREATE POLICY "MFA required for invite code access"
ON public.user_invite_code
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());

CREATE POLICY "MFA required for organisation access"
ON public.organisation
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());

CREATE POLICY "MFA required for organisation API key access"
ON public.organisation_apikey
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());

CREATE POLICY "MFA required for organisation information access"
ON public.organisation_information
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());

CREATE POLICY "MFA required for user information access"
ON public.user_information
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());

CREATE POLICY "MFA required for user organisation access"
ON public.user_organisation
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());

CREATE POLICY "MFA required for user personal access"
ON public.user_personal
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());

CREATE POLICY "MFA required for user notifications access"
ON public.user_notifications
AS RESTRICTIVE
TO authenticated
USING (public.is_user_authenticated());