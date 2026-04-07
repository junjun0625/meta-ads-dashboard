import { NextRequest, NextResponse } from 'next/server'
import { fetchDashboard } from '@/lib/metaApi'
import { MOCK_DATA, periodToDateRange } from '@/lib/utils'
import { Period } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { accessToken, adAccountId, period } = body as {
      accessToken?: string
      adAccountId?: string
      period: Period
    }

    if (!accessToken || !adAccountId) {
      return NextResponse.json({ data: MOCK_DATA, mock: true })
    }

    const dateRange = periodToDateRange(period)
    const data = await fetchDashboard({ accessToken, adAccountId }, dateRange)
    return NextResponse.json({ data, mock: false })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
