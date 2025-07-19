CREATE OR REPLACE FUNCTION public.create_organisation(org_name TEXT)
RETURNS TEXT LANGUAGE plpgsql
SECURITY DEFINER set search_path = ''
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




CREATE OR REPLACE FUNCTION "public"."get_user_by_email"("p_email" character varying) RETURNS SETOF "auth"."users"
    LANGUAGE "plpgsql" SECURITY DEFINER set search_path = ''
    AS $_$
BEGIN
  -- Check if the invoking user is listed in the factory_user table
  IF EXISTS (
    SELECT 1
    FROM public.factory_user
    WHERE public.factory_user.user_id = auth.uid()
  ) THEN
    -- Use dynamic SQL to apply LIMIT and OFFSET
    RETURN QUERY EXECUTE 
    'SELECT * FROM auth.users WHERE email = $1 ORDER BY id'
    USING p_email;
  ELSE
    -- Raise an exception for users not authorized to access this information
    RAISE EXCEPTION 'You are not authorized to access this information.';
  END IF;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."get_all_auth_users"("p_limit" integer, "p_offset" integer) RETURNS SETOF "auth"."users"
    LANGUAGE "plpgsql" SECURITY DEFINER set search_path = ''
    AS $_$
BEGIN
  -- Check if the invoking user is listed in the factory_user table
  IF EXISTS (
    SELECT 1
    FROM public.factory_user
    WHERE public.factory_user.user_id = auth.uid()
  ) THEN
    -- Use dynamic SQL to apply LIMIT and OFFSET
    RETURN QUERY EXECUTE 
    'SELECT * FROM auth.users ORDER BY id LIMIT $1 OFFSET $2'
    USING p_limit, p_offset;
  ELSE
    -- Raise an exception for users not authorized to access this information
    RAISE EXCEPTION 'You are not authorized to access this information.';
  END IF;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."do_i_have_password_set"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER set search_path = ''
    AS $$
DECLARE
    user_encrypted_password TEXT;
BEGIN
    SELECT encrypted_password INTO user_encrypted_password
    FROM auth.users
    WHERE id = auth.uid(); 
    IF user_encrypted_password IS NOT NULL AND user_encrypted_password != '' THEN
        RETURN TRUE;  
    ELSE
        RETURN FALSE;  
    END IF;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."add_user_with_code"("_organisation_id" bigint, "_code" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER set search_path = ''
    AS $$
DECLARE
    _user_id UUID;
BEGIN
    -- Check if the caller is an admin of the organisation
    IF NOT EXISTS (
        SELECT 1 FROM public.user_organisation
        WHERE user_id = auth.uid() AND organisation_id = _organisation_id AND role = 'ADMIN'
    ) THEN

        IF NOT EXISTS(
          SELECT 1 FROM factory_user WHERE user_id = auth.uid()
        ) THEN

          RETURN 'Caller is not an admin of the organisation.';
        END IF;
    END IF;
    
    -- Check if the code is valid, enabled, and find the associated user_id
    SELECT user_id INTO _user_id FROM public.user_invite_code
    WHERE user_code = _code AND enabled = TRUE;
    
    IF _user_id IS NULL THEN
        RETURN 'Invalid code or code not enabled.';
    END IF;
    
    -- Check if the user is already part of the organisation
    IF EXISTS (
        SELECT 1 FROM public.user_organisation
        WHERE user_id = _user_id AND organisation_id = _organisation_id
    ) THEN
        RETURN 'User is already a member of the organisation.';
    END IF;
    
    -- Add the user to the organisation
    INSERT INTO public.user_organisation (user_id, organisation_id, role)
    VALUES (_user_id, _organisation_id, 'EDITOR');
    
    RETURN 'OK'; -- Indicates success
EXCEPTION WHEN OTHERS THEN
    -- Optional: handle specific exceptions or log errors
    RETURN 'NOK';
END;
$$;



CREATE OR REPLACE FUNCTION "administrative"."custom_access_token"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER set search_path = ''
    AS $$
  declare
    claims jsonb;
    factoryrole text;
  begin
    select r.role into factoryrole from public.factory_user r where r.user_id = (event->>'user_id')::uuid;
    
    if factoryrole is not null then
      claims := event->'claims';
      if jsonb_typeof(claims->'user_metadata') is null then
        claims := jsonb_set(claims, '{user_metadata}', '{}');
      end if;

      claims := jsonb_set(claims, '{user_metadata, factoryrole}', to_jsonb(factoryrole));

      event := jsonb_set(event, '{claims}', claims);
    end if;

    return event;
  end;
$$;



CREATE OR REPLACE FUNCTION "public"."generate_random_string"() RETURNS "text"
    LANGUAGE "plpgsql" set search_path = ''
    AS $$
DECLARE
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT := 0;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(characters, floor(random()*62)::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."generate_authorization_key"() RETURNS "text"
    LANGUAGE "plpgsql" set search_path = ''
    AS $$
DECLARE
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT := 0;
BEGIN
  FOR i IN 1..64 LOOP
    result := result || substr(characters, floor(random()*62)::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."generate_random_apikey"() RETURNS "text"
    LANGUAGE "plpgsql" set search_path = ''
    AS $$
DECLARE
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT := 0;
BEGIN
  FOR i IN 1..64 LOOP
    result := result || substr(characters, floor(random()*62)::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS get_user_id_by_email_admin_only("text");


CREATE OR REPLACE FUNCTION "public"."get_user_organisation_details"("_organisation_id" bigint) RETURNS TABLE("created_at" timestamp with time zone, "user_id" "uuid", "role" "text", "email" "text")
    LANGUAGE "plpgsql" STABLE  set search_path = ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT uo.created_at, uo.user_id, uo.role, ui.email
    FROM public.user_organisation uo
    LEFT JOIN public.user_information ui ON uo.user_id = ui.user_id
    WHERE uo.organisation_id = _organisation_id;
END;
$$;