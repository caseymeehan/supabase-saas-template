CREATE OR REPLACE FUNCTION public.is_storage_limit_not_reached(
    _org_id bigint,
    _bucket_id text
) RETURNS boolean 
    LANGUAGE plpgsql 
    SECURITY DEFINER 
    STABLE  
    SET search_path = ''
    SET statement_timeout = '2s'
    SET lock_timeout = '2s'
AS $$
DECLARE
    current_subscription RECORD;
    current_max_files int;
    current_file_count bigint;
BEGIN
    SELECT *
    INTO current_subscription
    FROM public.paddle_customer_subscriptions pcs
    WHERE pcs.org_id = _org_id
    AND pcs.subscription_status IN ('active', 'trialing')
    ORDER BY pcs.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    SELECT (properties->>'maxFiles')::int
    INTO current_max_files
    FROM public.paddle_product_tier
    WHERE product_id = current_subscription.product_id;

    IF current_max_files IS NULL THEN
        RETURN false;
    END IF;

    IF current_max_files = -1 THEN
        RETURN true;
    END IF;

    SELECT COUNT(*)
    INTO current_file_count
    FROM storage.objects
    WHERE bucket_id = _bucket_id 
    AND (storage.foldername(name))[1] = _org_id::text;

    RETURN current_file_count < current_max_files;
END;
$$;