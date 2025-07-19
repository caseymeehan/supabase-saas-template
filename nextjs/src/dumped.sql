

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "administrative";


ALTER SCHEMA "administrative" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."organisation_role" AS ENUM (
    'ADMIN',
    'EDITOR',
    'VIEWER'
);


ALTER TYPE "public"."organisation_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "administrative"."custom_access_token"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "administrative"."custom_access_token"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_with_code"("_organisation_id" bigint, "_code" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    _user_id UUID;
BEGIN
    IF NOT auth.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;

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

    RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
    RETURN 'NOK';
END;
$$;


ALTER FUNCTION "public"."add_user_with_code"("_organisation_id" bigint, "_code" "text") OWNER TO "postgres";


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
    IF NOT auth.is_user_authenticated() THEN
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


ALTER FUNCTION "public"."create_organisation"("org_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."do_i_have_password_set"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_encrypted_password TEXT;
BEGIN
    IF NOT auth.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;
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


ALTER FUNCTION "public"."do_i_have_password_set"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_authorization_key"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."generate_authorization_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_random_apikey"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."generate_random_apikey"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_random_string"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."generate_random_string"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_auth_users"("p_limit" integer, "p_offset" integer) RETURNS SETOF "auth"."users"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
BEGIN
    IF NOT auth.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;
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


ALTER FUNCTION "public"."get_all_auth_users"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_email_for_organisation"("_organisation_id" bigint) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    _billing_admin_email TEXT;
BEGIN
    IF NOT auth.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;

    IF NOT auth.is_admin_of(auth.uid(), _organisation_id) THEN
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


ALTER FUNCTION "public"."get_customer_email_for_organisation"("_organisation_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organisation_subscription_status"("_org_id" bigint) RETURNS TABLE("subscription_id" "text", "subscription_status" "text", "product_id" "text", "price_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT auth.is_user_authenticated() THEN
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


ALTER FUNCTION "public"."get_organisation_subscription_status"("_org_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_email"("p_email" character varying) RETURNS SETOF "auth"."users"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
BEGIN
    IF NOT auth.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;
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


ALTER FUNCTION "public"."get_user_by_email"("p_email" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organisation_details"("_organisation_id" bigint) RETURNS TABLE("created_at" timestamp with time zone, "user_id" "uuid", "role" "public"."organisation_role", "email" "text")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
BEGIN
    IF NOT auth.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;
    RETURN QUERY
    SELECT
        uo.created_at,
        uo.user_id,
        uo.role,
        ui.email
    FROM public.user_organisation uo
    LEFT JOIN public.user_information ui ON uo.user_id = ui.user_id
    WHERE uo.organisation_id = _organisation_id;
END;
$$;


ALTER FUNCTION "public"."get_user_organisation_details"("_organisation_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organisation_billing_admin"("_org_id" bigint, "_new_admin_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT auth.is_user_authenticated() THEN
    RAISE EXCEPTION 'MFA authentication required';
  END IF;
  IF NOT auth.is_admin_of((select auth.uid()), _org_id) THEN
    RETURN 'NOT_ADMIN';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM public.user_organisation uo
    JOIN public.user_information ui ON ui.user_id = uo.user_id
    WHERE uo.organisation_id = _org_id
    AND uo.role = 'ADMIN'
    AND ui.email = _new_admin_email
    AND uo.user_id != (select auth.uid())
  ) THEN
    RETURN 'INVALID_ADMIN';
  END IF;

  UPDATE public.organisation_billing_admin
  SET email = _new_admin_email
  WHERE org_id = _org_id;

  IF FOUND THEN
    RETURN 'SUCCESS';
  ELSE
    RETURN 'NOT_FOUND';
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_organisation_billing_admin"("_org_id" bigint, "_new_admin_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organisation_name"("_org_id" bigint, "_new_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    IF NOT auth.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;

    IF NOT auth.is_admin_of(auth.uid(), _org_id) THEN
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


ALTER FUNCTION "public"."update_organisation_name"("_org_id" bigint, "_new_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_role"("_organisation_id" bigint, "_user_id" "uuid", "_new_role" "public"."organisation_role") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    caller_role public.organisation_role;
BEGIN
    IF NOT auth.is_user_authenticated() THEN
        RAISE EXCEPTION 'MFA authentication required';
    END IF;
    SELECT role INTO caller_role
    FROM public.user_organisation
    WHERE user_id = auth.uid()
    AND organisation_id = _organisation_id;

    IF caller_role != 'ADMIN' THEN
        RETURN 'NOT_ADMIN';
    END IF;

    IF _user_id = auth.uid() THEN
        RETURN 'CANNOT_CHANGE_OWN_ROLE';
    END IF;

    UPDATE public.user_organisation
    SET role = _new_role
    WHERE user_id = _user_id
    AND organisation_id = _organisation_id;

    IF NOT FOUND THEN
        RETURN 'USER_NOT_FOUND';
    END IF;

    RETURN 'OK';
END;
$$;


ALTER FUNCTION "public"."update_user_role"("_organisation_id" bigint, "_user_id" "uuid", "_new_role" "public"."organisation_role") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."factory_user" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'EDITOR'::"text" NOT NULL
);


ALTER TABLE "public"."factory_user" OWNER TO "postgres";


ALTER TABLE "public"."factory_user" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."factory_user_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."global_system_settings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "register_enabled" boolean DEFAULT true NOT NULL,
    "populate_apikeys" boolean DEFAULT true NOT NULL,
    "populate_organisation" boolean DEFAULT true NOT NULL,
    "user_can_create_organisation" boolean DEFAULT true NOT NULL,
    "organisation_limit" integer DEFAULT 3 NOT NULL
);


ALTER TABLE "public"."global_system_settings" OWNER TO "postgres";


ALTER TABLE "public"."global_system_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."global_system_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."organisation" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "organisation_name_check" CHECK ((("length"("name") >= 3) AND ("length"("name") < 100)))
);


ALTER TABLE "public"."organisation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organisation_apikey" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" bigint,
    "key" "text" DEFAULT "public"."generate_random_apikey"() NOT NULL
);


ALTER TABLE "public"."organisation_apikey" OWNER TO "postgres";


ALTER TABLE "public"."organisation_apikey" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."organisation_apikey_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."organisation_billing_admin" (
    "org_id" bigint NOT NULL,
    "email" "text" NOT NULL
);


ALTER TABLE "public"."organisation_billing_admin" OWNER TO "postgres";


ALTER TABLE "public"."organisation" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."organisation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."organisation_information" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" bigint,
    "note" "text"
);


ALTER TABLE "public"."organisation_information" OWNER TO "postgres";


ALTER TABLE "public"."organisation_information" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."organisation_information_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."paddle_customer_products" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_id" "text" NOT NULL,
    "product_id" "text" NOT NULL,
    "by_price_id" "text" NOT NULL
);


ALTER TABLE "public"."paddle_customer_products" OWNER TO "postgres";


ALTER TABLE "public"."paddle_customer_products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."paddle_customer_products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."paddle_customer_subscriptions" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subscription_id" "text" NOT NULL,
    "subscription_status" "text" NOT NULL,
    "price_id" "text",
    "product_id" "text",
    "scheduled_change" "text",
    "customer_id" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" bigint
);


ALTER TABLE "public"."paddle_customer_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paddle_customers" (
    "customer_id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "marketing_consent" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."paddle_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paddle_events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "item" "jsonb" NOT NULL,
    "type" "text" NOT NULL
);


ALTER TABLE "public"."paddle_events" OWNER TO "postgres";


ALTER TABLE "public"."paddle_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."paddle_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."paddle_product_tier" (
    "id" bigint NOT NULL,
    "product_id" "text" NOT NULL,
    "tier_level" smallint NOT NULL,
    "properties" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."paddle_product_tier" OWNER TO "postgres";


ALTER TABLE "public"."paddle_product_tier" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."paddle_product_tier_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_information" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL
);


ALTER TABLE "public"."user_information" OWNER TO "postgres";


ALTER TABLE "public"."user_information" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_information_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_invite_code" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "user_code" "text" DEFAULT "public"."generate_random_string"() NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."user_invite_code" OWNER TO "postgres";


ALTER TABLE "public"."user_invite_code" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_invite_code_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subscription" "jsonb" NOT NULL
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


ALTER TABLE "public"."user_notifications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_organisation" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organisation_id" bigint NOT NULL,
    "role" "public"."organisation_role" NOT NULL
);


ALTER TABLE "public"."user_organisation" OWNER TO "postgres";


ALTER TABLE "public"."user_organisation" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_organisation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_personal" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "language" "text"
);


ALTER TABLE "public"."user_personal" OWNER TO "postgres";


ALTER TABLE ONLY "public"."factory_user"
    ADD CONSTRAINT "factory_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_system_settings"
    ADD CONSTRAINT "global_system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisation_apikey"
    ADD CONSTRAINT "organisation_apikey_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."organisation_apikey"
    ADD CONSTRAINT "organisation_apikey_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisation_billing_admin"
    ADD CONSTRAINT "organisation_billing_admin_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organisation_information"
    ADD CONSTRAINT "organisation_information_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisation"
    ADD CONSTRAINT "organisation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisation"
    ADD CONSTRAINT "organisation_uuid_key" UNIQUE ("uuid");



ALTER TABLE ONLY "public"."paddle_customer_products"
    ADD CONSTRAINT "paddle_customer_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paddle_customer_subscriptions"
    ADD CONSTRAINT "paddle_customer_subscriptions_pkey" PRIMARY KEY ("subscription_id");



ALTER TABLE ONLY "public"."paddle_customers"
    ADD CONSTRAINT "paddle_customers_pkey" PRIMARY KEY ("customer_id");



ALTER TABLE ONLY "public"."paddle_events"
    ADD CONSTRAINT "paddle_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paddle_product_tier"
    ADD CONSTRAINT "paddle_product_tier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paddle_product_tier"
    ADD CONSTRAINT "paddle_product_tier_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."user_information"
    ADD CONSTRAINT "user_information_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invite_code"
    ADD CONSTRAINT "user_invite_code_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invite_code"
    ADD CONSTRAINT "user_invite_code_user_code_key" UNIQUE ("user_code");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_subscription_key" UNIQUE ("user_id", "subscription");



ALTER TABLE ONLY "public"."user_organisation"
    ADD CONSTRAINT "user_organisation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_personal"
    ADD CONSTRAINT "user_personal_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."organisation_billing_admin"
    ADD CONSTRAINT "organisation_billing_admin_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisation"("id");



ALTER TABLE ONLY "public"."paddle_customer_products"
    ADD CONSTRAINT "paddle_customer_products_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."paddle_customers"("customer_id");



ALTER TABLE ONLY "public"."paddle_customer_subscriptions"
    ADD CONSTRAINT "paddle_customer_subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."paddle_customers"("customer_id");



ALTER TABLE ONLY "public"."factory_user"
    ADD CONSTRAINT "public_factory_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organisation_apikey"
    ADD CONSTRAINT "public_organisation_apikey_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisation"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organisation_information"
    ADD CONSTRAINT "public_organisation_information_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisation"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_information"
    ADD CONSTRAINT "public_user_information_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invite_code"
    ADD CONSTRAINT "public_user_invite_code_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organisation"
    ADD CONSTRAINT "public_user_organisation_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organisation"
    ADD CONSTRAINT "public_user_organisation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_personal"
    ADD CONSTRAINT "public_user_personal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Enable read access for own users" ON "public"."factory_user" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Factory users can check everyone codes" ON "public"."user_invite_code" FOR SELECT USING (("auth"."uid"() IN ( SELECT "factory_user"."user_id"
   FROM "public"."factory_user"
  WHERE ("auth"."uid"() = "factory_user"."user_id"))));



CREATE POLICY "Factory users can edit everything" ON "public"."organisation" USING (("auth"."uid"() IN ( SELECT "factory_user"."user_id"
   FROM "public"."factory_user"
  WHERE ("auth"."uid"() = "factory_user"."user_id"))));



CREATE POLICY "Factory users can edit everything" ON "public"."organisation_apikey" USING (("auth"."uid"() IN ( SELECT "factory_user"."user_id"
   FROM "public"."factory_user"
  WHERE ("auth"."uid"() = "factory_user"."user_id"))));



CREATE POLICY "Factory users can edit everything" ON "public"."organisation_information" USING (("auth"."uid"() IN ( SELECT "factory_user"."user_id"
   FROM "public"."factory_user"
  WHERE ("auth"."uid"() = "factory_user"."user_id"))));



CREATE POLICY "Factory users can edit everything" ON "public"."user_information" USING (("auth"."uid"() IN ( SELECT "factory_user"."user_id"
   FROM "public"."factory_user"
  WHERE ("auth"."uid"() = "factory_user"."user_id"))));



CREATE POLICY "Factory users can edit everything" ON "public"."user_organisation" USING (("auth"."uid"() IN ( SELECT "factory_user"."user_id"
   FROM "public"."factory_user"
  WHERE ("auth"."uid"() = "factory_user"."user_id"))));



CREATE POLICY "Factory users can update everything" ON "public"."user_invite_code" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "factory_user"."user_id"
   FROM "public"."factory_user"
  WHERE ("auth"."uid"() = "factory_user"."user_id"))));



CREATE POLICY "MFA required for factory user access" ON "public"."factory_user" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "MFA required for invite code access" ON "public"."user_invite_code" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "MFA required for organisation API key access" ON "public"."organisation_apikey" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "MFA required for organisation access" ON "public"."organisation" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "MFA required for organisation information access" ON "public"."organisation_information" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "MFA required for user information access" ON "public"."user_information" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "MFA required for user notifications access" ON "public"."user_notifications" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "MFA required for user organisation access" ON "public"."user_organisation" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "MFA required for user personal access" ON "public"."user_personal" AS RESTRICTIVE TO "authenticated" USING ("auth"."is_user_authenticated"());



CREATE POLICY "Select own code" ON "public"."user_invite_code" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users that are in same org can retrieve other user informations" ON "public"."user_information" FOR SELECT USING ("auth"."user_is_in_organisation_of_one_of_mine"("auth"."uid"(), "user_id"));



CREATE POLICY "can delete api keys of organisation when is admin" ON "public"."organisation_apikey" FOR DELETE USING ("auth"."is_admin_of"("auth"."uid"(), "org_id"));



CREATE POLICY "can delete organisation which is admin of" ON "public"."organisation" FOR DELETE USING ("auth"."is_admin_of"("auth"."uid"(), "id"));



CREATE POLICY "can delete user if admin of organisation" ON "public"."user_organisation" FOR DELETE USING ("auth"."is_admin_of"("auth"."uid"(), "organisation_id"));



CREATE POLICY "can get api keys of organisation when is admin" ON "public"."organisation_apikey" FOR SELECT USING ("auth"."is_admin_of"("auth"."uid"(), "org_id"));



CREATE POLICY "can get users of organisation when is member" ON "public"."user_organisation" FOR SELECT USING ("auth"."is_member_of"("auth"."uid"(), "organisation_id"));



CREATE POLICY "can insert api keys of organisation when is admin" ON "public"."organisation_apikey" FOR INSERT WITH CHECK ("auth"."is_admin_of"("auth"."uid"(), "org_id"));



CREATE POLICY "can select billing admin" ON "public"."organisation_billing_admin" FOR SELECT USING ("auth"."is_admin_of"("auth"."uid"(), "org_id"));



CREATE POLICY "can select own informations" ON "public"."user_information" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "can update api keys of organisation when is admin" ON "public"."organisation_apikey" FOR UPDATE USING ("auth"."is_admin_of"("auth"."uid"(), "org_id"));



CREATE POLICY "can update own notifications" ON "public"."user_notifications" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."factory_user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."global_system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organisation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organisation_apikey" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organisation_billing_admin" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organisation_information" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paddle_customer_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paddle_customer_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paddle_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paddle_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paddle_product_tier" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select my organisations" ON "public"."organisation" FOR SELECT USING ("auth"."is_member_of"("auth"."uid"(), "id"));



CREATE POLICY "select own " ON "public"."paddle_customers" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = "email"));



CREATE POLICY "update own code" ON "public"."user_invite_code" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "update own informations" ON "public"."user_personal" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_information" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invite_code" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_organisation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_personal" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "administrative" TO "supabase_auth_admin";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "administrative"."custom_access_token"("event" "jsonb") TO "supabase_auth_admin";




















































































































































































REVOKE ALL ON FUNCTION "public"."add_user_with_code"("_organisation_id" bigint, "_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_user_with_code"("_organisation_id" bigint, "_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_with_code"("_organisation_id" bigint, "_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_organisation"("org_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_organisation"("org_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organisation"("org_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."do_i_have_password_set"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."do_i_have_password_set"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."do_i_have_password_set"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_authorization_key"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_authorization_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_authorization_key"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_random_apikey"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_random_apikey"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_random_apikey"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_random_string"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_random_string"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_random_string"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_all_auth_users"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_all_auth_users"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_auth_users"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_email_for_organisation"("_organisation_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_email_for_organisation"("_organisation_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organisation_subscription_status"("_org_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organisation_subscription_status"("_org_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_by_email"("p_email" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_by_email"("p_email" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("p_email" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organisation_details"("_organisation_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organisation_details"("_organisation_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organisation_billing_admin"("_org_id" bigint, "_new_admin_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organisation_billing_admin"("_org_id" bigint, "_new_admin_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organisation_name"("_org_id" bigint, "_new_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organisation_name"("_org_id" bigint, "_new_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_role"("_organisation_id" bigint, "_user_id" "uuid", "_new_role" "public"."organisation_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_role"("_organisation_id" bigint, "_user_id" "uuid", "_new_role" "public"."organisation_role") TO "service_role";


















GRANT ALL ON TABLE "public"."factory_user" TO "anon";
GRANT ALL ON TABLE "public"."factory_user" TO "authenticated";
GRANT ALL ON TABLE "public"."factory_user" TO "service_role";
GRANT ALL ON TABLE "public"."factory_user" TO "supabase_auth_admin";



GRANT ALL ON SEQUENCE "public"."factory_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."factory_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."factory_user_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."global_system_settings" TO "anon";
GRANT ALL ON TABLE "public"."global_system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."global_system_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."global_system_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."global_system_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."global_system_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."organisation" TO "anon";
GRANT ALL ON TABLE "public"."organisation" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation" TO "service_role";



GRANT ALL ON TABLE "public"."organisation_apikey" TO "anon";
GRANT ALL ON TABLE "public"."organisation_apikey" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation_apikey" TO "service_role";



GRANT ALL ON SEQUENCE "public"."organisation_apikey_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organisation_apikey_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organisation_apikey_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."organisation_billing_admin" TO "anon";
GRANT ALL ON TABLE "public"."organisation_billing_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation_billing_admin" TO "service_role";



GRANT ALL ON SEQUENCE "public"."organisation_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organisation_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organisation_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."organisation_information" TO "anon";
GRANT ALL ON TABLE "public"."organisation_information" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation_information" TO "service_role";



GRANT ALL ON SEQUENCE "public"."organisation_information_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organisation_information_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organisation_information_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."paddle_customer_products" TO "anon";
GRANT ALL ON TABLE "public"."paddle_customer_products" TO "authenticated";
GRANT ALL ON TABLE "public"."paddle_customer_products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."paddle_customer_products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."paddle_customer_products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."paddle_customer_products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."paddle_customer_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."paddle_customer_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."paddle_customer_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."paddle_customers" TO "anon";
GRANT ALL ON TABLE "public"."paddle_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."paddle_customers" TO "service_role";



GRANT ALL ON TABLE "public"."paddle_events" TO "anon";
GRANT ALL ON TABLE "public"."paddle_events" TO "authenticated";
GRANT ALL ON TABLE "public"."paddle_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."paddle_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."paddle_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."paddle_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."paddle_product_tier" TO "anon";
GRANT ALL ON TABLE "public"."paddle_product_tier" TO "authenticated";
GRANT ALL ON TABLE "public"."paddle_product_tier" TO "service_role";



GRANT ALL ON SEQUENCE "public"."paddle_product_tier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."paddle_product_tier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."paddle_product_tier_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_information" TO "anon";
GRANT ALL ON TABLE "public"."user_information" TO "authenticated";
GRANT ALL ON TABLE "public"."user_information" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_information_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_information_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_information_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_invite_code" TO "anon";
GRANT ALL ON TABLE "public"."user_invite_code" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invite_code" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_invite_code_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_invite_code_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_invite_code_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_organisation" TO "anon";
GRANT ALL ON TABLE "public"."user_organisation" TO "authenticated";
GRANT ALL ON TABLE "public"."user_organisation" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_organisation_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_organisation_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_organisation_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_personal" TO "anon";
GRANT ALL ON TABLE "public"."user_personal" TO "authenticated";
GRANT ALL ON TABLE "public"."user_personal" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
