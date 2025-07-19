CREATE OR REPLACE FUNCTION public.get_customer_id_for_organisation(_organisation_id bigint)
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    _billing_admin_email TEXT;
    _customer_id TEXT;
BEGIN
    -- Check if the caller is authenticated
    IF NOT public.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;

    -- Check if the caller is an admin of the organization
    IF NOT public.is_admin_of(auth.uid(), _organisation_id) THEN
        RETURN 'NOT_ADMIN';
    END IF;

    -- Get the billing admin's email
    SELECT email INTO _billing_admin_email
    FROM public.organisation_billing_admin
    WHERE org_id = _organisation_id;

    IF NOT FOUND THEN
        RETURN 'NO_BILLING_ADMIN';
    END IF;

    -- Look up the customer_id from paddle_customers
    SELECT customer_id INTO _customer_id
    FROM public.paddle_customers
    WHERE email = _billing_admin_email;

    IF NOT FOUND THEN
        RETURN 'NO_CUSTOMER';
    END IF;

    RETURN _customer_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR';
END;
$$;