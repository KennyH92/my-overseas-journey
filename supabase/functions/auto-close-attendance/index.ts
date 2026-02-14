import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find all checked_in records where check_in_time is more than 16 hours ago
    const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString()

    const { data: staleRecords, error: fetchError } = await supabase
      .from('site_attendance')
      .select('id, check_in_time')
      .eq('status', 'checked_in')
      .lt('check_in_time', sixteenHoursAgo)

    if (fetchError) throw fetchError

    if (!staleRecords || staleRecords.length === 0) {
      return new Response(JSON.stringify({ message: 'No stale records found', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let closedCount = 0
    for (const record of staleRecords) {
      // Set check_out_time to check_in_time + 12h as fallback
      const checkIn = new Date(record.check_in_time)
      const autoCheckOut = new Date(checkIn.getTime() + 12 * 60 * 60 * 1000)

      const { error: updateError } = await supabase
        .from('site_attendance')
        .update({
          status: 'system_auto_closed',
          check_out_time: autoCheckOut.toISOString(),
          auto_closed_at: new Date().toISOString(),
        })
        .eq('id', record.id)

      if (!updateError) closedCount++
    }

    return new Response(
      JSON.stringify({ message: `Auto-closed ${closedCount} stale records`, count: closedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
