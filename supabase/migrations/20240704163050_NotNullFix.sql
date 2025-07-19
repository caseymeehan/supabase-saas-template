CREATE OR REPLACE FUNCTION public.create_organisation(org_name TEXT)
RETURNS TEXT LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    can_create BOOLEAN;
    org_limit INT;
    user_org_count INT;
    current_user_id UUID;
    new_org_id BIGINT;
BEGIN
    current_user_id := auth.uid();
    if current_user_id is null then
        RETURN 'UNAUTHORISED';
    end if;

    SELECT user_can_create_organisation, organisation_limit
    INTO can_create, org_limit
    FROM public.global_system_settings
    LIMIT 1;


    IF NOT FOUND THEN
        RETURN 'SYSTEM_SETTINGS_ERROR';
    END IF;

    -- If user cannot create organisations, return an error message
    IF NOT can_create THEN
        RETURN 'SYSTEM_SETTINGS_FALSE';
    END IF;

    -- Count the number of organisations associated with the user
    SELECT COUNT(*)
    INTO user_org_count
    FROM public.user_organisation
    WHERE user_id = current_user_id;

    -- Check if user has reached the organisation limit
    IF user_org_count >= org_limit THEN
        RETURN 'MAX_ORGANISATION_ALLOWED';
    END IF;

    -- Create the new organisation
    INSERT INTO public.organisation (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    -- Associate the user with the new organisation
    INSERT INTO public.user_organisation (user_id, organisation_id, role)
    VALUES (current_user_id, new_org_id, 'ADMIN');

    RETURN 'SUCCESS';
END;
$$;