import {SupabaseClient} from "@supabase/supabase-js";
import {Database} from "@/lib/types";

export enum ClientType {
    SERVER = 'server',
    SPA = 'spa'
}


export type OrganisationRole = Database["public"]["Enums"]["organisation_role"]
export type OrganisationUsers = Database["public"]["Functions"]["get_user_organisation_details"]["Returns"]
export type OrganisationUser = OrganisationUsers[number]
export type ApiKey = Database["public"]["Tables"]["organisation_apikey"]["Row"]


export class SassClient {
    private client: SupabaseClient<Database>;
    private clientType: ClientType;

    constructor(client: SupabaseClient, clientType: ClientType) {
        this.client = client;
        this.clientType = clientType;

    }

    async loginEmail(email: string, password: string) {
        return this.client.auth.signInWithPassword({
            email: email,
            password: password
        });
    }

    async registerEmail(email: string, password: string) {
        return this.client.auth.signUp({
            email: email,
            password: password
        });
    }

    async exchangeCodeForSession(code: string) {
        return this.client.auth.exchangeCodeForSession(code);
    }

    async resendVerificationEmail(email: string) {
        return this.client.auth.resend({
            email: email,
            type: 'signup'
        })
    }

    async logout() {
        const { error } = await this.client.auth.signOut({
            scope: 'local'
        });
        if (error) throw error;
        if(this.clientType === ClientType.SPA) {
            window.location.href = '/auth/login';
        }
    }

    async updateUserRoleInOrganisation(orgId: number, userId: string, role: OrganisationRole) {
        console.log('update_user_role', {
            _organisation_id: orgId,
            _user_id: userId,
            _new_role: role
        })
        return this.client.rpc('update_user_role', {
            _organisation_id: orgId,
            _user_id: userId,
            _new_role: role
        });
    }

    async loadOrganisationDetails(orgId: number) {
        return this.client.rpc('get_user_organisation_details', {
            _organisation_id: orgId
        });
    }

    async getOrganisationApiKeys(orgId: number) {
        return this.client.from('organisation_apikey').select('*').eq('org_id', orgId);
    }

    async addUserWithCodeToOrganisation(orgId: number, code: string) {
        return this.client.rpc('add_user_with_code', {
            _organisation_id: orgId,
            _code: code
        });
    }

    async inviteUserByOrganisationAdmin(orgId: number, email: string) {
        return this.client.functions.invoke('InviteUserByOrgAdmin', {
                body: {
                    org_id: orgId,
                    email: email
                }
            });
    }

    async getUserInformations(user_id: string) {
        return this.client
            .from('user_information')
            .select('*')
            .eq('user_id', user_id)
            .single();
    }

    async getUserInviteCode(user_id: string) {
        return this.client
            .from('user_invite_code')
            .select('*')
            .eq('user_id', user_id)
            .single();
    }

    async setStatusOfUserInviteCode(user_id: string, status: boolean) {
        return this.client.from('user_invite_code')
            .update({ enabled: status })
            .eq('user_id', user_id);
    }

    async create_organisation(org_name: string) {
        return this.client.rpc('create_organisation', {
            org_name: org_name
        });
    }


    async updateOrganisationName(orgId: number, newName: string) {
        return this.client.rpc('update_organisation_name', {
            _org_id: orgId,
            _new_name: newName
        });
    }


    getSupabaseClient() {
        return this.client;
    }


}
