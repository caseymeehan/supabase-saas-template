import { createSSRClient } from '@/lib/supabase/server';

export async function getCustomerId() {
    const supabase = await createSSRClient();
    const user = await supabase.auth.getUser();
    if (user.data.user?.email) {
        const customersData = await supabase
            .from('paddle_customers')
            .select('customer_id,email')
            .eq('email', user.data.user?.email)
            .single();
        if (customersData?.data?.customer_id) {
            return customersData?.data?.customer_id as string;
        }
    }
    return '';
}

export async function getUserEmail() {
    const supabase = await createSSRClient();
    const user = await supabase.auth.getUser();
    return user.data.user?.email;
}