CREATE OR REPLACE FUNCTION "public"."update_organisation_name"("_org_id" bigint, "_new_name" text) RETURNS text
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    IF NOT public.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;

    IF NOT public.is_admin_of(auth.uid(), _org_id) THEN
        RETURN 'NOT_ADMIN';
    END IF;

    IF length(_new_name) < 3 OR length(_new_name) > 100 THEN
        RETURN 'INVALID_NAME_LENGTH';
    END IF;

    UPDATE public.organisation
    SET name = _new_name
    WHERE id = _org_id;

    IF NOT FOUND THEN
        RETURN 'NOT_FOUND';
    END IF;

    RETURN 'SUCCESS';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR';
END;
$$;