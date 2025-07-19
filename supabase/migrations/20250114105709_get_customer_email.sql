DROP FUNCTION get_customer_id_for_organisation;
CREATE OR REPLACE FUNCTION public.get_customer_email_for_organisation(_organisation_id bigint)
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    _billing_admin_email TEXT;
BEGIN
    IF NOT public.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;

    IF NOT public.is_admin_of(auth.uid(), _organisation_id) THEN
        RETURN 'NOT_ADMIN';
    END IF;

    SELECT email INTO _billing_admin_email
    FROM public.organisation_billing_admin
    WHERE org_id = _organisation_id;

    IF NOT FOUND THEN
        RETURN 'NO_BILLING_ADMIN';
    END IF;

    RETURN _billing_admin_email;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR';
END;
$$;