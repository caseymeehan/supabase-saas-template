import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'npm:web-push@3.6.7'
import { sleep } from "https://deno.land/x/sleep/mod.ts"

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const VAPID_PUBLIC_KEY = "BEhOASjwfULQ-IjHnvT6NuaT48s4L0KU0Bg7xHnyQvrvf4oAr4AZVMOhjnbyJMeBUQlWFaLOLX1HZrlWnTPdDEc"
const VAPID_PRIVATE_KEY = "kpHiiCKKjCp6n0UFqPq_U3xvemsKFrtF5g5pdb0vu3Q"
const VAPID_CLAIMS = { "sub": "mailto: <adam.razniewski@gmail.com>" }


Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  let supaUrl = Deno.env.get('SUPABASE_URL') ?? ''
  let supaAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    // This way your row-level-security (RLS) policies are applied.
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  console.log(req.headers.get('Authorization'))
  const { data, error } = await supabaseClient.auth.getUser();
  let myId = data.user.id
  try {
    const { id } = await req.json()
    
    // Get the user's ID from the request (you need to implement authentication)
    const userId = myId
    
    // Fetch the notification data
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    
    // Verify if the notification belongs to the user
    if (data.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    
    // Send the test notification
    let stringified = JSON.stringify({
      notification: {
        title: 'Test Notification',
        body: 'This is a test push notification!',
      }
    })
    console.log(stringified)
    webPush.setVapidDetails(
      "mailto: <adam.razniewski@gmail.com>",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )
    let subscription = data.subscription
    let loaded = JSON.parse(JSON.stringify(subscription))
    console.log(loaded)
    let webtest = await webPush.sendNotification(
      loaded,
      stringified
    )

    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.log(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})






  // const adminSupabaseClient = createClient(
  //   Deno.env.get('SUPABASE_URL') ?? '',
  //   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  // )
