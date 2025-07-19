CREATE OR REPLACE FUNCTION public.update_user_role(_organisation_id bigint, _user_id uuid, _new_role public.organisation_role)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    caller_role public.organisation_role;
BEGIN
    SELECT role INTO caller_role
    FROM public.user_organisation
    WHERE user_id = auth.uid()
    AND organisation_id = _organisation_id;

    IF caller_role != 'ADMIN' THEN
        RETURN 'NOT_ADMIN';
    END IF;

    IF _user_id = auth.uid() THEN
        RETURN 'CANNOT_CHANGE_OWN_ROLE';
    END IF;

    UPDATE public.user_organisation
    SET role = _new_role
    WHERE user_id = _user_id
    AND organisation_id = _organisation_id;

    IF NOT FOUND THEN
        RETURN 'USER_NOT_FOUND';
    END IF;

    RETURN 'OK';
END;
$$;
