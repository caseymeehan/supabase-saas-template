import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    // This way your row-level-security (RLS) policies are applied.
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  const { data, error } = await supabaseClient.auth.getUser();

  let token = req.headers.get('Authorization')?.split('Bearer ')[1]
  let dataPart = token?.split('.')[1]
  let dataPartString = atob(dataPart ?? '')
  let dataPartJson = JSON.parse(dataPartString)

  let isFactory = dataPartJson.user_metadata && dataPartJson.user_metadata.factoryrole !== undefined

  if(!isFactory) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  const adminSupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const asJson = await req.json()
  console.log(asJson)

  const { data: userData, error: userError } = await adminSupabaseClient.auth.admin.inviteUserByEmail(asJson.email)

  if (userError) {
    return new Response(JSON.stringify({ error: userError }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } 

  

  return new Response(JSON.stringify({ userData }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })

})

