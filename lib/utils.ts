import { Period, DateRange } from './types'

export function periodToDateRange(period: Period): DateRange {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  switch (period) {
    case 'today': {
      const s = fmt(now)
      return { since: s, until: s }
    }
    case 'this_week': {
      const day = now.getDay()
      const mon = new Date(now)
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      return { since: fmt(mon), until: fmt(now) }
    }
    case 'this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { since: fmt(s), until: fmt(now) }
    }
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      return { since: fmt(s), until: fmt(e) }
    }
  }
}

export function prevPeriodDateRange(range: DateRange): DateRange {
  const s = new Date(range.since)
  const e = new Date(range.until)
  const diff = e.getTime() - s.getTime()
  const ps = new Date(s.getTime() - diff - 86400000)
  const pe = new Date(s.getTime() - 86400000)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { since: fmt(ps), until: fmt(pe) }
}

export function fmtYen(v: number) {
  return '¥' + Math.round(v).toLocaleString('ja-JP')
}

export function fmtK(v: number) {
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
  return String(Math.round(v))
}

// ---- MOCK DATA (used when no credentials are set) ----
import { DashboardData } from './types'

const AGES = ['13-17', '18-24', '25-34', '35-44', '45+']

function mockAgeGender(baseCtr: number, baseImp: number) {
  const maleCtrs = [0.6, 1.8, baseCtr, baseCtr * 0.75, baseCtr * 0.5].map(v => parseFloat(v.toFixed(2)))
  const femaleCtrs = [0.5, 1.5, baseCtr * 0.85, baseCtr * 0.65, baseCtr * 0.4].map(v => parseFloat(v.toFixed(2)))
  const rows = []
  for (let i = 0; i < AGES.length; i++) {
    rows.push({ age: AGES[i], gender: 'male', spend: baseImp * 0.0002 * (i + 1), impressions: Math.round(baseImp * [0.03, 0.18, 0.32, 0.28, 0.19][i]), clicks: Math.round(baseImp * [0.03, 0.18, 0.32, 0.28, 0.19][i] * maleCtrs[i] / 100), ctr: maleCtrs[i], actions: [{ action_type: 'lead', value: String(Math.round([0, 3, 8, 5, 2][i])) }] })
    rows.push({ age: AGES[i], gender: 'female', spend: baseImp * 0.00015 * (i + 1), impressions: Math.round(baseImp * [0.02, 0.14, 0.24, 0.20, 0.15][i]), clicks: Math.round(baseImp * [0.02, 0.14, 0.24, 0.20, 0.15][i] * femaleCtrs[i] / 100), ctr: femaleCtrs[i], actions: [{ action_type: 'lead', value: String(Math.round([0, 2, 5, 3, 1][i])) }] })
  }
  return rows
}

export const MOCK_DATA: DashboardData = {
  dateRange: { since: '2026-04-01', until: '2026-04-06' },
  fetchedAt: new Date().toISOString(),
  totals: { spend: 48320, impressions: 182000, clicks: 2841, ctr: 1.56, cpc: 17.0, cpm: 265, reach: 142000, actions: [{ action_type: 'lead', value: '134' }] },
  campaigns: [
    { id: 'c1', name: '春季集客キャンペーン', status: 'ACTIVE', objective: 'LEAD_GENERATION', insights: { spend: 28400, impressions: 108000, clicks: 1944, ctr: 1.8, cpc: 14.6, cpm: 263, reach: 84000, actions: [{ action_type: 'lead', value: '82' }], cost_per_action_type: [{ action_type: 'lead', value: '346' }] }, ageGenderBreakdown: mockAgeGender(2.4, 108000) },
    { id: 'c2', name: 'ブランド認知拡大', status: 'ACTIVE', objective: 'BRAND_AWARENESS', insights: { spend: 12100, impressions: 52000, clicks: 624, ctr: 1.2, cpc: 19.4, cpm: 233, reach: 41000, actions: [{ action_type: 'lead', value: '31' }], cost_per_action_type: [{ action_type: 'lead', value: '390' }] }, ageGenderBreakdown: mockAgeGender(1.5, 52000) },
    { id: 'c3', name: 'リターゲティング', status: 'PAUSED', objective: 'CONVERSIONS', insights: { spend: 5820, impressions: 18000, clicks: 378, ctr: 2.1, cpc: 15.4, cpm: 323, reach: 12000, actions: [{ action_type: 'lead', value: '21' }], cost_per_action_type: [{ action_type: 'lead', value: '277' }] }, ageGenderBreakdown: mockAgeGender(2.8, 18000) },
    { id: 'c4', name: '新規顧客獲得', status: 'ACTIVE', objective: 'LEAD_GENERATION', insights: { spend: 2000, impressions: 4000, clicks: 36, ctr: 0.9, cpc: 55.6, cpm: 500, reach: 3200, actions: [], cost_per_action_type: [] }, ageGenderBreakdown: mockAgeGender(0.9, 4000) },
  ],
  adsets: [
    { id: 'a1', name: '類似オーディエンス_1%', campaign_id: 'c1', campaign_name: '春季集客', status: 'ACTIVE', daily_budget: 20000, insights: { spend: 14200, impressions: 54000, clicks: 1080, ctr: 2.0, cpc: 13.1, cpm: 263, reach: 42000, actions: [{ action_type: 'lead', value: '48' }], cost_per_action_type: [{ action_type: 'lead', value: '296' }] }, ageGenderBreakdown: mockAgeGender(2.0, 54000) },
    { id: 'a2', name: 'フィットネス興味関心', campaign_id: 'c1', campaign_name: '春季集客', status: 'ACTIVE', daily_budget: 20000, insights: { spend: 9800, impressions: 38000, clicks: 608, ctr: 1.6, cpc: 16.1, cpm: 258, reach: 29000, actions: [{ action_type: 'lead', value: '24' }], cost_per_action_type: [{ action_type: 'lead', value: '408' }] }, ageGenderBreakdown: mockAgeGender(1.6, 38000) },
    { id: 'a3', name: 'リマーケティング180日', campaign_id: 'c3', campaign_name: 'リターゲティング', status: 'PAUSED', lifetime_budget: 100000, insights: { spend: 5820, impressions: 18000, clicks: 378, ctr: 2.1, cpc: 15.4, cpm: 323, reach: 12000, actions: [{ action_type: 'lead', value: '21' }], cost_per_action_type: [{ action_type: 'lead', value: '277' }] }, ageGenderBreakdown: mockAgeGender(2.8, 18000) },
    { id: 'a4', name: '年齢層ターゲ_25-34', campaign_id: 'c2', campaign_name: 'ブランド認知', status: 'ACTIVE', daily_budget: 10000, insights: { spend: 5000, impressions: 22000, clicks: 286, ctr: 1.3, cpc: 17.5, cpm: 227, reach: 17000, actions: [{ action_type: 'lead', value: '13' }], cost_per_action_type: [{ action_type: 'lead', value: '385' }] }, ageGenderBreakdown: mockAgeGender(1.3, 22000) },
  ],
  ads: [
    { id: 'ad1', name: '動画_A_春キャンペーン', adset_id: 'a1', campaign_id: 'c1', status: 'ACTIVE', creative: { id: 'cr1', name: '動画_A_春', thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=70', video_id: 'v001', type: 'VIDEO' }, insights: { spend: 14000, impressions: 42000, clicks: 1008, ctr: 2.4, cpc: 13.9, cpm: 333, reach: 33000, actions: [{ action_type: 'lead', value: '52' }], cost_per_action_type: [{ action_type: 'lead', value: '268' }] }, ageGenderBreakdown: mockAgeGender(2.4, 42000) },
    { id: 'ad2', name: '静止画_B_人物フィーチャー', adset_id: 'a1', campaign_id: 'c1', status: 'ACTIVE', creative: { id: 'cr2', name: '静止画_B_人物', thumbnail_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=70', type: 'IMAGE' }, insights: { spend: 12000, impressions: 38000, clicks: 684, ctr: 1.8, cpc: 17.5, cpm: 316, reach: 30000, actions: [{ action_type: 'lead', value: '38' }], cost_per_action_type: [{ action_type: 'lead', value: '316' }] }, ageGenderBreakdown: mockAgeGender(1.8, 38000) },
    { id: 'ad3', name: 'カルーセル_C_施術メニュー', adset_id: 'a2', campaign_id: 'c1', status: 'ACTIVE', creative: { id: 'cr3', name: 'カルーセル_C', thumbnail_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=70', type: 'CAROUSEL' }, insights: { spend: 9500, impressions: 31000, clicks: 465, ctr: 1.5, cpc: 20.4, cpm: 306, reach: 24000, actions: [{ action_type: 'lead', value: '26' }], cost_per_action_type: [{ action_type: 'lead', value: '365' }] }, ageGenderBreakdown: mockAgeGender(1.5, 31000) },
    { id: 'ad4', name: '動画_D_商品クローズアップ', adset_id: 'a2', campaign_id: 'c1', status: 'ACTIVE', creative: { id: 'cr4', name: '動画_D', thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=70', video_id: 'v002', type: 'VIDEO' }, insights: { spend: 7000, impressions: 22000, clicks: 242, ctr: 1.1, cpc: 28.9, cpm: 318, reach: 17000, actions: [{ action_type: 'lead', value: '16' }], cost_per_action_type: [{ action_type: 'lead', value: '438' }] }, ageGenderBreakdown: mockAgeGender(1.1, 22000) },
    { id: 'ad5', name: '静止画_E_テキスト訴求', adset_id: 'a3', campaign_id: 'c3', status: 'PAUSED', creative: { id: 'cr5', name: '静止画_E', thumbnail_url: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=400&q=70', type: 'IMAGE' }, insights: { spend: 5800, impressions: 18000, clicks: 162, ctr: 0.9, cpc: 35.8, cpm: 322, reach: 14000, actions: [{ action_type: 'lead', value: '12' }], cost_per_action_type: [{ action_type: 'lead', value: '483' }] }, ageGenderBreakdown: mockAgeGender(0.9, 18000) },
    { id: 'ad6', name: '動画_F_お客様の声', adset_id: 'a4', campaign_id: 'c2', status: 'ACTIVE', creative: { id: 'cr6', name: '動画_F_証言', thumbnail_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=70', video_id: 'v003', type: 'VIDEO' }, insights: { spend: 5200, impressions: 14000, clicks: 196, ctr: 1.4, cpc: 26.5, cpm: 371, reach: 11000, actions: [{ action_type: 'lead', value: '18' }], cost_per_action_type: [{ action_type: 'lead', value: '289' }] }, ageGenderBreakdown: mockAgeGender(1.4, 14000) },
  ],
}
