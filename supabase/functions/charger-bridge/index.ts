import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Expected JSON payload from charger
    const { charger_id, status, metrics } = await req.json()

    if (!charger_id) {
        throw new Error("Missing charger_id")
    }

    // Upsert into charger_status table
    const { data, error } = await supabase
      .from('charger_status')
      .upsert({
        charger_id: charger_id,
        status: status || 'Unknown',
        power_kw: metrics?.power_kw || 0,
        voltage: metrics?.voltage || 0,
        current: metrics?.current || 0,
        soc: metrics?.soc || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'charger_id' })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
