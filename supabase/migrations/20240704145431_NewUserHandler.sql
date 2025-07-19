CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        IF l_populate_apikeys THEN
            INSERT INTO public.organisation_apikey (org_id) VALUES (l_org_id);
        END IF;
    END IF;
    return new;
end;
$function$
;