CREATE OR REPLACE FUNCTION public.is_minimum_subscription_for_org_enabled(
    _org_id bigint,
    _minimum_tier_level int
) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
    current_subscription RECORD;
    current_tier_level int;
BEGIN
    SELECT * INTO current_subscription
    FROM public.paddle_customer_subscriptions pcs
    WHERE pcs.org_id = _org_id
    AND pcs.subscription_status IN ('active', 'trialing')
    ORDER BY pcs.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    SELECT tier_level INTO current_tier_level
    FROM public.paddle_product_tier
    WHERE product_id = current_subscription.product_id;

    IF current_tier_level IS NULL THEN
        RETURN false;
    END IF;

    RETURN current_tier_level >= _minimum_tier_level;
END;
$$;