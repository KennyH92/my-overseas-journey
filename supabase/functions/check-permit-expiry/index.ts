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

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    // Find foreign employees with work permits expiring within 30 days
    const { data: expiringPermits, error: permitErr } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, work_permit_expiry_date, passport_expiry_date')
      .eq('is_foreign_employee', true)
      .not('work_permit_expiry_date', 'is', null)
      .lte('work_permit_expiry_date', thirtyDaysFromNow)
      .gte('work_permit_expiry_date', today)

    if (permitErr) throw permitErr

    // Find foreign employees with passports expiring within 30 days
    const { data: expiringPassports, error: passportErr } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, passport_expiry_date')
      .eq('is_foreign_employee', true)
      .not('passport_expiry_date', 'is', null)
      .lte('passport_expiry_date', thirtyDaysFromNow)
      .gte('passport_expiry_date', today)

    if (passportErr) throw passportErr

    // Also find already expired ones
    const { data: expiredPermits, error: expiredErr } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, work_permit_expiry_date')
      .eq('is_foreign_employee', true)
      .not('work_permit_expiry_date', 'is', null)
      .lt('work_permit_expiry_date', today)

    if (expiredErr) throw expiredErr

    // Create notices for admins if there are expiring/expired records
    const alerts: string[] = []

    if (expiringPermits && expiringPermits.length > 0) {
      const names = expiringPermits.map(p => `${p.full_name}(${p.employee_id || '-'}): ${p.work_permit_expiry_date}`).join('\n')
      alerts.push(`【工作准证即将过期】以下${expiringPermits.length}名员工的工作准证将在30天内过期：\n${names}`)
    }

    if (expiringPassports && expiringPassports.length > 0) {
      const names = expiringPassports.map(p => `${p.full_name}(${p.employee_id || '-'}): ${p.passport_expiry_date}`).join('\n')
      alerts.push(`【护照即将过期】以下${expiringPassports.length}名员工的护照将在30天内过期：\n${names}`)
    }

    if (expiredPermits && expiredPermits.length > 0) {
      const names = expiredPermits.map(p => `${p.full_name}(${p.employee_id || '-'}): ${p.work_permit_expiry_date}`).join('\n')
      alerts.push(`【工作准证已过期】以下${expiredPermits.length}名员工的工作准证已过期，请立即处理：\n${names}`)
    }

    // Insert a system notice if there are alerts
    if (alerts.length > 0) {
      const noticeContent = alerts.join('\n\n')
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      await supabase.from('notices').insert({
        title: `外籍员工证件到期预警 - ${today}`,
        content: noticeContent,
        priority: 'high',
        status: 'active',
        target_roles: ['admin', 'manager'],
        start_date: new Date().toISOString(),
        end_date: endDate,
      })
    }

    return new Response(
      JSON.stringify({
        message: 'Expiry check completed',
        expiring_permits: expiringPermits?.length || 0,
        expiring_passports: expiringPassports?.length || 0,
        expired_permits: expiredPermits?.length || 0,
        notices_created: alerts.length > 0 ? 1 : 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
