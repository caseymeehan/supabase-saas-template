create table "public"."organisation_billing_admin" (
    "org_id" bigint not null,
    "email" text not null
);


alter table "public"."organisation_billing_admin" enable row level security;

CREATE UNIQUE INDEX organisation_billing_admin_pkey ON public.organisation_billing_admin USING btree (org_id);

alter table "public"."organisation_billing_admin" add constraint "organisation_billing_admin_pkey" PRIMARY KEY using index "organisation_billing_admin_pkey";

alter table "public"."organisation_billing_admin" add constraint "organisation_billing_admin_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organisation(id) not valid;

alter table "public"."organisation_billing_admin" validate constraint "organisation_billing_admin_org_id_fkey";

grant delete on table "public"."organisation_billing_admin" to "anon";

grant insert on table "public"."organisation_billing_admin" to "anon";

grant references on table "public"."organisation_billing_admin" to "anon";

grant select on table "public"."organisation_billing_admin" to "anon";

grant trigger on table "public"."organisation_billing_admin" to "anon";

grant truncate on table "public"."organisation_billing_admin" to "anon";

grant update on table "public"."organisation_billing_admin" to "anon";

grant delete on table "public"."organisation_billing_admin" to "authenticated";

grant insert on table "public"."organisation_billing_admin" to "authenticated";

grant references on table "public"."organisation_billing_admin" to "authenticated";

grant select on table "public"."organisation_billing_admin" to "authenticated";

grant trigger on table "public"."organisation_billing_admin" to "authenticated";

grant truncate on table "public"."organisation_billing_admin" to "authenticated";

grant update on table "public"."organisation_billing_admin" to "authenticated";

grant delete on table "public"."organisation_billing_admin" to "service_role";

grant insert on table "public"."organisation_billing_admin" to "service_role";

grant references on table "public"."organisation_billing_admin" to "service_role";

grant select on table "public"."organisation_billing_admin" to "service_role";

grant trigger on table "public"."organisation_billing_admin" to "service_role";

grant truncate on table "public"."organisation_billing_admin" to "service_role";

grant update on table "public"."organisation_billing_admin" to "service_role";

create policy "select own "
on "public"."paddle_customers"
as permissive
for select
to public
using (((auth.jwt() ->> 'email'::text) = email));


create policy "can select own informations"
on "public"."user_information"
as permissive
for select
to public
using ((auth.uid() = user_id));



