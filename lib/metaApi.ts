import { MetaCredentials, DateRange, DashboardData, Insights, AgeGenderBreakdown, Campaign, AdSet, Ad } from './types'

const BASE = 'https://graph.facebook.com/v21.0'

const INSIGHT_FIELDS = [
  'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'reach',
  'actions', 'cost_per_action_type'
].join(',')

async function apiFetch(path: string, params: Record<string, string>, token: string) {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('access_token', token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || `Meta API error ${res.status}`)
  }
  return res.json()
}

function parseInsights(raw: Record<string, string>): Insights {
  return {
    spend: parseFloat(raw.spend || '0'),
    impressions: parseInt(raw.impressions || '0'),
    clicks: parseInt(raw.clicks || '0'),
    ctr: parseFloat(raw.ctr || '0'),
    cpc: parseFloat(raw.cpc || '0'),
    cpm: parseFloat(raw.cpm || '0'),
    reach: parseInt(raw.reach || '0'),
    actions: raw.actions as unknown as Insights['actions'],
    cost_per_action_type: raw.cost_per_action_type as unknown as Insights['cost_per_action_type'],
  }
}

function parseAgeGender(rows: Record<string, string>[]): AgeGenderBreakdown[] {
  return rows.map(r => ({
    age: r.age,
    gender: r.gender,
    spend: parseFloat(r.spend || '0'),
    impressions: parseInt(r.impressions || '0'),
    clicks: parseInt(r.clicks || '0'),
    ctr: parseFloat(r.ctr || '0'),
    actions: r.actions as unknown as AgeGenderBreakdown['actions'],
  }))
}

function dateRangeParam(range: DateRange) {
  return JSON.stringify({ since: range.since, until: range.until })
}

export async function fetchDashboard(
  creds: MetaCredentials,
  dateRange: DateRange
): Promise<DashboardData> {
  const { accessToken: token, adAccountId } = creds
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  const drParam = dateRangeParam(dateRange)

  // Campaigns
  const campRaw = await apiFetch(`/${actId}/campaigns`, {
    fields: `id,name,status,effective_status,objective,insights.time_range(${drParam}){${INSIGHT_FIELDS}}`,
    limit: '50',
  }, token)

  const campaigns: Campaign[] = await Promise.all(
    (campRaw.data || []).map(async (c: Record<string, unknown>) => {
      const ins = (c.insights as Record<string, unknown[]>)?.data?.[0]
      const agRaw = ins ? await apiFetch(`/${c.id}/insights`, {
        fields: INSIGHT_FIELDS,
        breakdowns: 'age,gender',
        time_range: drParam,
        limit: '200',
      }, token).catch(() => ({ data: [] })) : { data: [] }
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        insights: ins ? parseInsights(ins as Record<string, string>) : undefined,
        ageGenderBreakdown: parseAgeGender(agRaw.data || []),
      }
    })
  )

  // Ad Sets
  const adsetRaw = await apiFetch(`/${actId}/adsets`, {
    fields: `id,name,campaign_id,campaign{name},status,effective_status,daily_budget,lifetime_budget,insights.time_range(${drParam}){${INSIGHT_FIELDS}}`,
    limit: '100',
  }, token)

  const adsets: AdSet[] = await Promise.all(
    (adsetRaw.data || []).map(async (a: Record<string, unknown>) => {
      const ins = (a.insights as Record<string, unknown[]>)?.data?.[0]
      const agRaw = ins ? await apiFetch(`/${a.id}/insights`, {
        fields: INSIGHT_FIELDS,
        breakdowns: 'age,gender',
        time_range: drParam,
        limit: '200',
      }, token).catch(() => ({ data: [] })) : { data: [] }
      const camp = a.campaign as Record<string, string>
      return {
        id: a.id as string,
        name: a.name as string,
        campaign_id: a.campaign_id as string,
        campaign_name: camp?.name || '',
        status: (a.effective_status || a.status) as string,
        daily_budget: a.daily_budget ? parseInt(a.daily_budget as string) : undefined,
        lifetime_budget: a.lifetime_budget ? parseInt(a.lifetime_budget as string) : undefined,
        insights: ins ? parseInsights(ins as Record<string, string>) : undefined,
        ageGenderBreakdown: parseAgeGender(agRaw.data || []),
      }
    })
  )

  // Ads + Creatives
  const adsRaw = await apiFetch(`/${actId}/ads`, {
    fields: `id,name,adset_id,campaign_id,status,creative{id,name,title,body,thumbnail_url,video_id,image_url,effective_object_story_id},insights.time_range(${drParam}){${INSIGHT_FIELDS}}`,
    limit: '100',
  }, token)

  const ads: Ad[] = await Promise.all(
    (adsRaw.data || []).map(async (a: Record<string, unknown>) => {
      const ins = (a.insights as Record<string, unknown[]>)?.data?.[0]
      const cr = a.creative as Record<string, string> | undefined
      const agRaw = ins ? await apiFetch(`/${a.id}/insights`, {
        fields: INSIGHT_FIELDS,
        breakdowns: 'age,gender',
        time_range: drParam,
        limit: '200',
      }, token).catch(() => ({ data: [] })) : { data: [] }
      return {
        id: a.id as string,
        name: a.name as string,
        adset_id: a.adset_id as string,
        campaign_id: a.campaign_id as string,
        status: (a.effective_status || a.status) as string,
        creative: cr ? {
          id: cr.id,
          name: cr.name || '',
          title: cr.title,
          body: cr.body,
          thumbnail_url: cr.thumbnail_url,
          video_id: cr.video_id,
          image_url: cr.image_url,
          type: cr.video_id ? 'VIDEO' : 'IMAGE',
        } : undefined,
        insights: ins ? parseInsights(ins as Record<string, string>) : undefined,
        ageGenderBreakdown: parseAgeGender(agRaw.data || []),
      }
    })
  )

  // Daily insights
  const dailyRaw = await apiFetch(`/${actId}/insights`, {
    fields: `spend,impressions,clicks,ctr,actions`,
    time_range: drParam,
    time_increment: '1',
    level: 'account',
    limit: '90',
  }, token)

  const dailyInsights = (dailyRaw.data || []).map((d: Record<string, unknown>) => {
    const ins = parseInsights(d as Record<string, string>)
    const cv = ins.actions?.find((a: {action_type: string; value: string}) =>
      ['offsite_conversion.fb_pixel_purchase','omni_purchase','lead','complete_registration'].includes(a.action_type)
    )
    return {
      date: d.date_start as string,
      spend: ins.spend,
      impressions: ins.impressions,
      clicks: ins.clicks,
      ctr: ins.ctr,
      cv: cv ? parseInt(cv.value) : 0,
    }
  })

  // Totals
  const totRaw = await apiFetch(`/${actId}/insights`, {
    fields: INSIGHT_FIELDS,
    time_range: drParam,
    level: 'account',
  }, token)
  const totals = totRaw.data?.[0] ? parseInsights(totRaw.data[0]) : {
    spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, reach: 0
  }

  return { campaigns, adsets, ads, totals, dailyInsights, dateRange, fetchedAt: new Date().toISOString() }
}

export function getCvCount(ins?: Insights): number {
  if (!ins?.actions) return 0
  const cv = ins.actions.find(a =>
    ['offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'lead', 'complete_registration'].includes(a.action_type)
  )
  return cv ? parseInt(cv.value) : 0
}

export function getCpa(ins?: Insights): number | null {
  if (!ins?.cost_per_action_type) return null
  const cpa = ins.cost_per_action_type.find(a =>
    ['offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'lead', 'complete_registration'].includes(a.action_type)
  )
  return cpa ? parseFloat(cpa.value) : null
}
