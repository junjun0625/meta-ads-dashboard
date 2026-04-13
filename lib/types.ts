export interface MetaCredentials {
  accessToken: string
  adAccountId: string
}
export interface DateRange {
  since: string
  until: string
}
export interface Insights {
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  reach: number
  actions?: { action_type: string; value: string }[]
  cost_per_action_type?: { action_type: string; value: string }[]
}
export interface AgeGenderBreakdown {
  age: string
  gender: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  actions?: { action_type: string; value: string }[]
}
export interface DailyInsight {
  date: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cv: number
}
export interface Campaign {
  id: string
  name: string
  status: string
  objective: string
  insights?: Insights
  ageGenderBreakdown?: AgeGenderBreakdown[]
}
export interface AdSet {
  id: string
  name: string
  campaign_id: string
  campaign_name: string
  status: string
  daily_budget?: number
  lifetime_budget?: number
  insights?: Insights
  ageGenderBreakdown?: AgeGenderBreakdown[]
}
export interface Creative {
  id: string
  name: string
  title?: string
  body?: string
  thumbnail_url?: string
  video_id?: string
  image_url?: string
  type: 'VIDEO' | 'IMAGE' | 'CAROUSEL'
}
export interface Ad {
  id: string
  name: string
  adset_id: string
  campaign_id: string
  status: string
  creative?: Creative
  insights?: Insights
  ageGenderBreakdown?: AgeGenderBreakdown[]
}
export interface DashboardData {
  campaigns: Campaign[]
  adsets: AdSet[]
  ads: Ad[]
  totals: Insights
  dailyInsights: DailyInsight[]
  dateRange: DateRange
  fetchedAt: string
}
export type Period = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom'
export type TabId = 'overview' | 'campaign' | 'adset' | 'creative' | 'compare'
export type CompareMode = 'adset' | 'creative'
export type DemoMetric = 'ctr' | 'cv' | 'cpa' | 'imp'
