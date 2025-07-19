CREATE OR REPLACE FUNCTION public.get_organisation_subscription_status(_org_id BIGINT)
RETURNS TABLE (
    subscription_id TEXT,
    subscription_status TEXT,
    product_id TEXT,
    price_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.user_organisation
        WHERE user_id = auth.uid()
        AND organisation_id = _org_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;

    RETURN QUERY
    SELECT
        pcs.subscription_id,
        pcs.subscription_status,
        pcs.product_id,
        pcs.price_id
    FROM public.paddle_customer_subscriptions pcs
    WHERE pcs.org_id = _org_id
    AND pcs.subscription_status IN ('active', 'trialing')
    ORDER BY pcs.created_at DESC
    LIMIT 1;
END;
$$;