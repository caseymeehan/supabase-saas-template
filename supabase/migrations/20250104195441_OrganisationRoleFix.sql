DROP FUNCTION IF EXISTS "public"."get_user_organisation_details"("_organisation_id" bigint);

CREATE OR REPLACE FUNCTION "public"."get_user_organisation_details"("_organisation_id" bigint)
RETURNS TABLE(
    "created_at" timestamp with time zone,
    "user_id" uuid,
    "role" organisation_role,  -- Changed from text to organisation_role
    "email" text
)
LANGUAGE "plpgsql"
STABLE
SET search_path TO ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        uo.created_at,
        uo.user_id,
        uo.role::"organisation_role",  -- Explicitly cast to organisation_role
        ui.email
    FROM public.user_organisation uo
    LEFT JOIN public.user_information ui ON uo.user_id = ui.user_id
    WHERE uo.organisation_id = _organisation_id;
END;
$$;