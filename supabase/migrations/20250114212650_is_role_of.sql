CREATE OR REPLACE FUNCTION public.is_role_of(
    _user_id uuid,
    _org_id bigint,
    _role public.organisation_role
) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
AS $$
SELECT EXISTS (
  SELECT 1
  FROM public.user_organisation ut
  WHERE ut.organisation_id = _org_id
  AND ut.user_id = _user_id
  AND ut.role = _role
);
$$;