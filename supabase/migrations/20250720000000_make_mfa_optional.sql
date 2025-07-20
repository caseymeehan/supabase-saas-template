-- Make MFA optional for basic user operations
-- Keep MFA required only for sensitive administrative functions

-- Drop overly restrictive MFA policies for basic user information
DROP POLICY IF EXISTS "MFA required for user information access" ON public.user_information;
DROP POLICY IF EXISTS "MFA required for invite code access" ON public.user_invite_code;
DROP POLICY IF EXISTS "MFA required for user personal access" ON public.user_personal;
DROP POLICY IF EXISTS "MFA required for user notifications access" ON public.user_notifications;

-- Keep MFA requirements for sensitive operations (organization management, API keys)
-- These policies remain in place:
-- - "MFA required for organisation access" ON public.organisation
-- - "MFA required for organisation API key access" ON public.organisation_apikey  
-- - "MFA required for organisation information access" ON public.organisation_information
-- - "MFA required for user organisation access" ON public.user_organisation
-- - "MFA required for factory user access" ON public.factory_user

-- Add optional MFA bonus security policies (these don't block, just add extra access when MFA is enabled)
-- Users with MFA get the same access as without, but this structure allows for future MFA bonuses

-- Note: The existing permissive policies will now work without MFA interference:
-- - "can select own informations" on user_information (from 20250112212644_billing_admin.sql)
-- - Other user-specific permissive policies