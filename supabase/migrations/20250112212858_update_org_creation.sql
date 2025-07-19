CREATE OR REPLACE FUNCTION "public"."create_organisation"("org_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    can_create BOOLEAN;
    org_limit INT;
    user_org_count INT;
    current_user_id UUID;
    new_org_id BIGINT;
BEGIN
    IF NOT public.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;
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


    -- Assign organisation billing admin
    INSERT INTO public.organisation_billing_admin (org_id, email)
    VALUES (new_org_id, (auth.jwt() ->> 'email')::TEXT);


    -- Associate the user with the new organisation
    INSERT INTO public.user_organisation (user_id, organisation_id, role)
    VALUES (current_user_id, new_org_id, 'ADMIN');

    RETURN 'SUCCESS';
END;
$$;



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    l_register_enabled BOOLEAN := true;
    l_populate_apikeys BOOLEAN := true;
    l_populate_organisation BOOLEAN := true;
    l_org_id INTEGER;
begin
    SELECT register_enabled, populate_apikeys, populate_organisation
    INTO l_register_enabled, l_populate_apikeys, l_populate_organisation
    FROM public.global_system_settings
    LIMIT 1;
    IF NOT FOUND THEN
        l_register_enabled := true;
        l_populate_apikeys := true;
        l_populate_organisation := true;
    END IF;

    insert into public.user_invite_code (user_id) values (new.id);
    insert into public.user_information (user_id, email) values (new.id, new.email);

    IF l_populate_organisation THEN
        INSERT INTO public.organisation (name) VALUES ('default') RETURNING id INTO l_org_id;
        INSERT INTO public.user_organisation (user_id, organisation_id, role) VALUES (new.id, l_org_id, 'ADMIN');
        INSERT INTO public.organisation_billing_admin (org_id, email) VALUES (l_org_id, new.email);
        IF l_populate_apikeys THEN
            INSERT INTO public.organisation_apikey (org_id) VALUES (l_org_id);
        END IF;
    END IF;
    return new;
end;
$$;