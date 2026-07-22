import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FCM_PROJECT_ID = 'mybolucompras'
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const TRIP_TIMEZONE = 'America/Argentina/Buenos_Aires'

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const signingInput = `${header}.${claims}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${base64url(new Uint8Array(signatureBuffer))}`
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(json)}`)
  return json.access_token
}

async function sendFcm(accessToken: string, token: string, title: string, body: string, data: Record<string, string>) {
  const fcmPayload = {
    message: {
      token,
      notification: { title, body },
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: 'default',
          color: '#6366F1',
          sound: 'default',
          notification_priority: 'PRIORITY_HIGH',
          default_vibrate_timings: true,
        },
      },
      data,
    },
  }
  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(fcmPayload),
  })
  const result = await res.json()
  if (!res.ok) console.error('[FCM] Error sending to token:', JSON.stringify(result))
}

function todayInTimezone(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TRIP_TIMEZONE }).format(new Date())
}

function buildResumen(actividades: { hora: string | null; titulo: string }[]): string {
  const items = actividades.map(a => a.hora ? `${a.hora.slice(0, 5)} ${a.titulo}` : a.titulo)
  const shown = items.slice(0, 3)
  const rest = items.length - shown.length
  return rest > 0 ? `${shown.join(', ')} y ${rest} más` : shown.join(', ')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT secret not configured')
  const sa = JSON.parse(raw)
  const accessToken = await getAccessToken(sa.client_email, sa.private_key)

  const today = todayInTimezone()

  const { data: viajes, error: viajesError } = await supabase
    .from('viajes')
    .select('id, titulo, emoji')
    .eq('estado', 'activo')
    .lte('fecha_desde', today)
    .gte('fecha_hasta', today)

  if (viajesError) {
    console.error('[DailySummary] Error fetching viajes:', viajesError.message)
    return new Response(JSON.stringify({ error: viajesError.message }), { status: 500 })
  }

  let sentCount = 0

  for (const viaje of viajes ?? []) {
    try {
      const { data: actividades, error: actError } = await supabase
        .from('viaje_actividades')
        .select('hora, titulo')
        .eq('viaje_id', viaje.id)
        .eq('fecha', today)
        .order('hora', { ascending: true, nullsFirst: false })

      if (actError) throw actError
      if (!actividades || actividades.length === 0) continue

      const { data: participantes, error: partError } = await supabase
        .from('viaje_participantes')
        .select('user_id')
        .eq('viaje_id', viaje.id)

      if (partError) throw partError
      const userIds = (participantes ?? []).map(p => p.user_id)
      if (userIds.length === 0) continue

      const { data: perfiles, error: perfilesError } = await supabase
        .from('profiles')
        .select('id, fcm_token')
        .in('id', userIds)
        .not('fcm_token', 'is', null)

      if (perfilesError) throw perfilesError

      const title = `📅 ${viaje.emoji} ${viaje.titulo} — Hoy`
      const body = buildResumen(actividades)

      for (const perfil of perfiles ?? []) {
        await sendFcm(accessToken, perfil.fcm_token, title, body, {
          type: 'viaje_resumen_dia',
          viajeId: viaje.id,
        })
        sentCount++
      }
    } catch (err) {
      console.error(`[DailySummary] Error processing viaje ${viaje.id}:`, err?.message ?? err)
    }
  }

  return new Response(JSON.stringify({ success: true, viajesProcesados: (viajes ?? []).length, notificacionesEnviadas: sentCount }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
