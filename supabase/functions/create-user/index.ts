
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user making the request is authenticated and has super_admin role
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if the authenticated user has super_admin role
    const { data: hasRole, error: roleError } = await supabaseAdmin.rpc('is_super_admin', { user_id: user.id })
    if (roleError || !hasRole) {
      throw new Error('Insufficient permissions. Only super admins can create users.')
    }

    // Parse the request body
    const { email, password, firstName, lastName, role } = await req.json()

    if (!email || !password || !firstName || !lastName || !role) {
      throw new Error('Missing required fields')
    }

    // Create the user using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    if (!newUser.user) {
      throw new Error('User creation failed')
    }

    // Assign the role to the new user
    const { error: roleAssignError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: role });

    if (roleAssignError) {
      console.error('Failed to assign role:', roleAssignError);
      // Don't throw here as user is already created, just log the error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: `User created successfully with role: ${role}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
