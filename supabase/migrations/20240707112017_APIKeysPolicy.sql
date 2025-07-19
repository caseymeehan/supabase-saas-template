DROP POLICY "can get api keys of organisation when is member" ON "public"."organisation_apikey";

CREATE POLICY "can get api keys of organisation when is admin" ON "public"."organisation_apikey" FOR SELECT USING ("public"."is_admin_of"("auth"."uid"(), "org_id"));
CREATE POLICY "can insert api keys of organisation when is admin" ON "public"."organisation_apikey" FOR INSERT WITH CHECK ("public"."is_admin_of"("auth"."uid"(), "org_id"));