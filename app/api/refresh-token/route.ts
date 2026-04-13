import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()
    if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 400 })

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    if (!appId || !appSecret) {
      return NextResponse.json({ error: 'META_APP_ID or META_APP_SECRET not configured' }, { status: 500 })
    }

    const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', appId)
    url.searchParams.set('client_secret', appSecret)
    url.searchParams.set('fb_exchange_token', accessToken)

    const res = await fetch(url.toString())
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    const debugUrl = new URL('https://graph.facebook.com/v21.0/debug_token')
    debugUrl.searchParams.set('input_token', data.access_token)
    debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`)
    const debugRes = await fetch(debugUrl.toString())
    const debugData = await debugRes.json()
    const expiresAt = debugData.data?.expires_at
      ? new Date(debugData.data.expires_at * 1000).toLocaleDateString('ja-JP')
      : null

    return NextResponse.json({ accessToken: data.access_token, expiresAt })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
