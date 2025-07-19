CREATE OR REPLACE FUNCTION public.is_minimum_role(
    _user_id uuid,
    _org_id bigint,
    _minimum_role public.organisation_role
) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
AS $$
SELECT EXISTS (
  SELECT 1
  FROM public.user_organisation ut
  WHERE ut.organisation_id = _org_id
  AND ut.user_id = _user_id
  AND CASE
    WHEN _minimum_role = 'VIEWER' THEN ut.role IN ('VIEWER', 'EDITOR', 'ADMIN')
    WHEN _minimum_role = 'EDITOR' THEN ut.role IN ('EDITOR', 'ADMIN')
    WHEN _minimum_role = 'ADMIN' THEN ut.role = 'ADMIN'
  END
);
$$;