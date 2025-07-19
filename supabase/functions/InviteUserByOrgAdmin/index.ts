import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as postgres from 'https://deno.land/x/postgres@v0.19.3/mod.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const databaseUrl = Deno.env.get('SUPABASE_DB_URL')!
const pool = new postgres.Pool(databaseUrl, 3, true)

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
  const { org_id, email } = await req.json()
  console.log(org_id, email)

  const { data, error } = await supabaseClient.auth.getUser();
  console.log(data, error)


  const adminSupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  let { data: isUserAdminOfOrg, error: isUserAdminOfOrgError } = await adminSupabaseClient.from('user_organisation').select('organisation_id').eq('organisation_id', org_id).eq('user_id', data?.user.id).eq("role", "ADMIN")

  if (isUserAdminOfOrgError) {
    return new Response(JSON.stringify({ error: isUserAdminOfOrgError }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  if (isUserAdminOfOrg.length == 0) {
    return new Response(JSON.stringify({ error: 'Not org admin' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }


  try {
    const connection = await pool.connect()
    try {


      const query = 'SELECT * FROM auth.users WHERE email = $1'
      const result = await connection.queryObject(query, [email])
      const alreadyExists = result.rows
      const alreadyExistsError = result.error
      
      if (alreadyExistsError) {
        return new Response(JSON.stringify({ error: alreadyExistsError }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      if (alreadyExists.length > 0) {
        return new Response(JSON.stringify({ error: 'User already exists' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      const { data: userData, error: userError } = await adminSupabaseClient.auth.admin.inviteUserByEmail(email)
      console.log(userData, userError)
      if (userError) {
        return new Response(JSON.stringify({ error: userError }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }


      let {data: orgIdOfJustCreatedUser, error: resultOfOrgRemover } = await supabaseClient.from('user_organisation').select('organisation_id').eq('user_id', userData?.user.id)
      console.log(orgIdOfJustCreatedUser, resultOfOrgRemover)

      let { data: resultOfAdd, error: resultOfAddError } = await adminSupabaseClient.from('user_organisation').insert([{ user_id: userData?.user.id, organisation_id: org_id, role: 'EDITOR' }])
      console.log(resultOfAdd, resultOfAddError)
      if (resultOfAddError) {
        return new Response(JSON.stringify({ error: resultOfAddError }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      return new Response(JSON.stringify({ status: resultOfAdd }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } finally {
      connection.release()
    }
  }
  catch (e) {

    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }


})

