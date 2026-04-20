'use client'
import { useState, useEffect, useCallback } from 'react'
import { DashboardData, Period, TabId, CompareMode, DemoMetric, DateRange } from '@/lib/types'
import { getCvCount, getCpa } from '@/lib/metaApi'
import { fmtYen, fmtK } from '@/lib/utils'
import { KpiCard } from './KpiCard'
import { AgeGenderView } from './AgeGenderView'
import { CreativeCard } from './CreativeCard'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Goal { value: number; note: string }

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'this_week', label: '今週' },
  { key: 'this_month', label: '今月' },
  { key: 'last_month', label: '先月' },
  { key: 'custom', label: 'カスタム' },
]
const TABS: { key: TabId; label: string }[] = [
  { key: 'overview', label: '概要' },
  { key: 'campaign', label: 'キャンペーン' },
  { key: 'adset', label: '広告セット' },
  { key: 'creative', label: 'クリエイティブ' },
  { key: 'compare', label: '比較分析' },
]

function fmt_date(d: Date) { return d.toISOString().split('T')[0] }
function today() { return fmt_date(new Date()) }
function weekAgo() { const d = new Date(); d.setDate(d.getDate() - 6); return fmt_date(d) }

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMock, setIsMock] = useState(false)
  const [period, setPeriod] = useState<Period>('this_week')
  const [customRange, setCustomRange] = useState<DateRange>({ since: weekAgo(), until: today() })
  const [showCustom, setShowCustom] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const [goals, setGoals] = useState<Record<string, Goal>>({})
  const [accessToken, setAccessToken] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [cmpMode, setCmpMode] = useState<CompareMode>('adset')
  const [demoMetric, setDemoMetric] = useState<DemoMetric>('ctr')
  const [crSort, setCrSort] = useState<'ctr' | 'cv' | 'cpa' | 'imp'>('ctr')
  const [selCreatives, setSelCreatives] = useState<Set<string>>(new Set())
  const [crTypeFilter, setCrTypeFilter] = useState('all')
  const [activeOnly, setActiveOnly] = useState(false)

  const refreshToken = async () => {
    if (!accessToken) return
    setRefreshing(true)
    try {
      const res = await fetch('/api/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setAccessToken(json.accessToken)
      setTokenExpiresAt(json.expiresAt)
      alert('トークンを延長しました。新しいトークンをコピーして保存してください。\n\n' + json.accessToken)
    } catch (e: unknown) {
      alert('延長失敗: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setRefreshing(false)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, adAccountId, period, customRange }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json.data)
      setIsMock(json.mock)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [accessToken, adAccountId, period, customRange])

  useEffect(() => {
    if (period !== 'custom') fetchData()
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, []) // eslint-disable-line

  // Load saved credentials from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('meta_access_token')
    const savedAccountId = localStorage.getItem('meta_ad_account_id')
    if (savedToken) setAccessToken(savedToken)
    if (savedAccountId) setAdAccountId(savedAccountId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoal = (key: string, goal: Goal | null) => {
    setGoals(prev => { const n = { ...prev }; if (goal) n[key] = goal; else delete n[key]; return n })
  }

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
      {loading ? '読み込み中...' : error || ''}
    </div>
  )

  const tots = data.totals
  const totalCv = getCvCount(tots)
  const totalCpa = totalCv > 0 ? tots.spend / totalCv : null

  const kpiDefs = [
    { key: 'spend', label: '消化金額', value: fmtYen(tots.spend), raw: tots.spend, delta: '+12%', up: true },
    { key: 'imp', label: 'IMP', value: fmtK(tots.impressions), raw: tots.impressions, delta: '+8%', up: true },
    { key: 'click', label: 'クリック', value: fmtK(tots.clicks), raw: tots.clicks, delta: '-3%', up: false },
    { key: 'ctr', label: 'CTR', value: tots.ctr.toFixed(2) + '%', raw: tots.ctr, delta: '-0.2pt', up: false },
    { key: 'cpc', label: 'CPC', value: fmtYen(tots.cpc), raw: tots.cpc, delta: '+¥1.2', up: false },
    { key: 'cv', label: 'CV', value: String(totalCv), raw: totalCv, delta: '+19%', up: true },
    { key: 'cpa', label: 'CPA', value: totalCpa ? fmtYen(totalCpa) : '—', raw: totalCpa || 0, delta: '-¥14', up: true },
    { key: 'roas', label: 'ROAS', value: '3.2×', raw: 3.2, delta: '+0.3×', up: true },
  ]

  // グラフデータ：APIの日次データを使用（モックの場合はdailyInsights）
  const trendData = (data.dailyInsights || []).map(d => ({
    day: d.date.slice(5).replace('-', '/'),
    spend: d.spend,
    imp: Math.round(d.impressions / 1000),
    cv: d.cv,
    ctr: parseFloat(d.ctr.toFixed(2)),
  }))

  // フィルタリング
  const filterStatus = (status: string) => !activeOnly || status === 'ACTIVE'

  const filteredCampaigns = data.campaigns.filter(c => filterStatus(c.status))
  const filteredAdsets = data.adsets.filter(a => filterStatus(a.status))

  const allAds = [...data.ads]
    .filter(ad => !activeOnly || ad.status === 'ACTIVE')
    .sort((a, b) => {
      if (crSort === 'cpa') return (getCpa(a.insights) || 9999) - (getCpa(b.insights) || 9999)
      if (crSort === 'ctr') return (b.insights?.ctr || 0) - (a.insights?.ctr || 0)
      if (crSort === 'cv') return getCvCount(b.insights) - getCvCount(a.insights)
      return (b.insights?.impressions || 0) - (a.insights?.impressions || 0)
    })
    .filter(ad => crTypeFilter === 'all' || ad.creative?.type === crTypeFilter)

  const cmpItems = cmpMode === 'adset' ? filteredAdsets : allAds.slice(0, 6)

  // 期間ラベル
  const periodLabel = period === 'custom'
    ? `${customRange.since} ~ ${customRange.until}`
    : PERIODS.find(p => p.key === period)?.label || ''

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 py-5">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium">Meta広告ダッシュボード</h1>
            {isMock && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">デモデータ</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period selector */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => { setPeriod(p.key); if (p.key === 'custom') setShowCustom(true) }}
                  className={`px-3 py-1.5 transition-colors ${period === p.key ? 'bg-gray-100 dark:bg-gray-800 font-medium' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {p.key === 'custom' && period === 'custom' ? periodLabel : p.label}
                </button>
              ))}
            </div>
            {/* Active only toggle */}
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <div onClick={() => setActiveOnly(!activeOnly)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${activeOnly ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${activeOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              配信中のみ
            </label>
            <button onClick={() => setShowSettings(!showSettings)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
              ⚙ API設定
            </button>
            <button onClick={fetchData} disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
              {loading ? '取得中...' : '↻ 更新'}
            </button>
          </div>
        </div>

        {/* Custom date range picker */}
        {showCustom && (
          <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">期間指定</span>
            <input type="date" value={customRange.since}
              onChange={e => setCustomRange(r => ({ ...r, since: e.target.value }))}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900" />
            <span className="text-xs text-gray-400">〜</span>
            <input type="date" value={customRange.until}
              onChange={e => setCustomRange(r => ({ ...r, until: e.target.value }))}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900" />
            <button onClick={() => { setShowCustom(false); fetchData() }}
              className="text-xs px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-80">
              適用
            </button>
            <button onClick={() => setShowCustom(false)}
              className="text-xs text-gray-400 hover:text-gray-600">キャンセル</button>
          </div>
        )}

        {/* API Settings */}
        {showSettings && (
          <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium mb-3 text-gray-700 dark:text-gray-300">Meta Marketing API 接続設定</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">アクセストークン</label>
                <input type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)}
                  placeholder="EAAxxxxxxxx..."
                  className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 font-mono" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">広告アカウントID</label>
                <input type="text" value={adAccountId} onChange={e => setAdAccountId(e.target.value)}
                  placeholder="123456789"
                  className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 font-mono" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => { setShowSettings(false); fetchData() }}
                className="text-xs px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-80">
                接続して更新
              </button>
              <span className="text-[11px] text-gray-400">※ 入力情報はこのブラウザに保存されます</span>
              <button onClick={() => { localStorage.removeItem('meta_access_token'); localStorage.removeItem('meta_ad_account_id'); setAccessToken(''); setAdAccountId('') }}
                className="text-xs text-red-400 hover:text-red-600">クリア</button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={refreshToken} disabled={!accessToken || refreshing}
                className="text-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-40">
                {refreshing ? '延長中...' : '↻ トークンを60日延長'}
              </button>
              {tokenExpiresAt && <span className="text-[11px] text-gray-400">有効期限: {tokenExpiresAt}</span>}
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        )}

        {/* Nav */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs whitespace-nowrap border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-gray-900 dark:border-white font-medium text-gray-900 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
              {kpiDefs.map(({ key: kk, ...rest }) => (
                <KpiCard key={kk} kpiKey={kk} {...rest} goal={goals[kk]} onGoalSave={handleGoal} />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="text-xs text-gray-500 mb-1">消化金額 / IMP（日次）</div>
                <div className="text-[10px] text-gray-400 mb-3">{periodLabel}</div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                      <YAxis yAxisId="l" tick={{ fontSize: 9 }} tickFormatter={v => '¥' + (v/1000).toFixed(0) + 'K'} />
                      <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} tickFormatter={v => v + 'K'} />
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => typeof v === "number" ? "¥" + Math.round(v).toLocaleString() : String(v)} />
                      <Bar yAxisId="l" dataKey="spend" fill="#3266ad" fillOpacity={0.3} radius={[2,2,0,0]} name="消化" />
                      <Line yAxisId="r" type="monotone" dataKey="imp" stroke="#1d9e75" strokeWidth={1.5} dot={{ r: 2 }} name="IMP(K)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="text-xs text-gray-500 mb-1">CV / CTR（日次）</div>
                <div className="text-[10px] text-gray-400 mb-3">{periodLabel}</div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                      <YAxis yAxisId="l" tick={{ fontSize: 9 }} />
                      <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} tickFormatter={v => v + '%'} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="l" dataKey="cv" fill="#1d9e75" fillOpacity={0.3} radius={[2,2,0,0]} name="CV" />
                      <Line yAxisId="r" type="monotone" dataKey="ctr" stroke="#ba7517" strokeWidth={1.5} dot={{ r: 2 }} name="CTR%" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CAMPAIGN */}
        {tab === 'campaign' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['キャンペーン','状態','消化','IMP','CTR','CPC','CV','CPA','前週比','目標達成'].map(h => (
                    <th key={h} className="text-left py-2 px-2 font-medium text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map(c => {
                  const ins = c.insights; const cv = getCvCount(ins); const cpa = getCpa(ins)
                  const g = goals['cv']; const pct = g && cv > 0 ? Math.min(100, Math.round(cv/g.value*100)) : null
                  return (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="py-2 px-2 font-medium">{c.name}</td>
                      <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${c.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{c.status==='ACTIVE'?'配信中':'停止'}</span></td>
                      <td className="py-2 px-2">{ins?fmtYen(ins.spend):'—'}</td>
                      <td className="py-2 px-2">{ins?fmtK(ins.impressions):'—'}</td>
                      <td className="py-2 px-2">{ins?ins.ctr.toFixed(1)+'%':'—'}</td>
                      <td className="py-2 px-2">{ins?fmtYen(ins.cpc):'—'}</td>
                      <td className="py-2 px-2">{cv}</td>
                      <td className="py-2 px-2">{cpa?fmtYen(cpa):'—'}</td>
                      <td className="py-2 px-2 text-green-700 font-medium">+12%</td>
                      <td className="py-2 px-2 min-w-[80px]">{pct!==null?(<div><div className="text-[10px] text-gray-400 mb-1">{pct}%</div><div className="h-1 rounded bg-gray-200 overflow-hidden"><div className="h-full rounded bg-green-500" style={{width:`${pct}%`}}/></div></div>):'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ADSET */}
        {tab === 'adset' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['広告セット','キャンペーン','状態','消化','IMP','CTR','CV','CPA','予算消化率'].map(h => (
                    <th key={h} className="text-left py-2 px-2 font-medium text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAdsets.map(a => {
                  const ins = a.insights; const cv = getCvCount(ins); const cpa = getCpa(ins)
                  const budget = a.daily_budget||a.lifetime_budget
                  const bpct = budget&&ins ? Math.min(100,Math.round(ins.spend/budget*100)) : null
                  return (
                    <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="py-2 px-2 font-medium">{a.name}</td>
                      <td className="py-2 px-2 text-gray-400">{a.campaign_name}</td>
                      <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${a.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{a.status==='ACTIVE'?'配信中':'停止'}</span></td>
                      <td className="py-2 px-2">{ins?fmtYen(ins.spend):'—'}</td>
                      <td className="py-2 px-2">{ins?fmtK(ins.impressions):'—'}</td>
                      <td className="py-2 px-2">{ins?ins.ctr.toFixed(1)+'%':'—'}</td>
                      <td className="py-2 px-2">{cv}</td>
                      <td className="py-2 px-2">{cpa?fmtYen(cpa):'—'}</td>
                      <td className="py-2 px-2 min-w-[80px]">{bpct!==null?(<div><div className="text-[10px] text-gray-400 mb-1">{bpct}%</div><div className="h-1 rounded bg-gray-200 overflow-hidden"><div className="h-full rounded bg-green-500" style={{width:`${bpct}%`}}/></div></div>):'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CREATIVE */}
        {tab === 'creative' && (
          <div>
            <div className="flex gap-2 mb-3 flex-wrap items-center">
              {[
                { label: '並び替え', val: crSort, set: (v: string) => setCrSort(v as typeof crSort), opts: [['ctr','CTR高い順'],['cv','CV多い順'],['cpa','CPA低い順'],['imp','IMP多い順']] },
                { label: 'タイプ', val: crTypeFilter, set: setCrTypeFilter, opts: [['all','すべて'],['VIDEO','動画'],['IMAGE','静止画'],['CAROUSEL','カルーセル']] },
                { label: 'デモグラ指標', val: demoMetric, set: (v: string) => setDemoMetric(v as DemoMetric), opts: [['ctr','CTR'],['cv','CV数'],['imp','IMP']] },
              ].map(ctrl => (
                <div key={ctrl.label} className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">{ctrl.label}</span>
                  <select value={ctrl.val} onChange={e => ctrl.set(e.target.value)}
                    className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900">
                    {ctrl.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-3">カードをクリックすると年齢・性別の内訳が展開します</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {allAds.map((ad, i) => (
                <CreativeCard key={ad.id} ad={ad} rank={i} selected={selCreatives.has(ad.id)}
                  onSelect={() => setSelCreatives(prev => { const n = new Set(prev); n.has(ad.id) ? n.delete(ad.id) : n.add(ad.id); return n })} demoMetric={demoMetric} />
              ))}
            </div>
          </div>
        )}

        {/* COMPARE */}
        {tab === 'compare' && (
          <div>
            <div className="flex gap-2 mb-4 items-center flex-wrap">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
                {(['adset','creative'] as CompareMode[]).map(m => (
                  <button key={m} onClick={() => setCmpMode(m)}
                    className={`px-3 py-1.5 transition-colors ${cmpMode===m?'bg-gray-100 dark:bg-gray-800 font-medium':'text-gray-400 hover:bg-gray-50'}`}>
                    {m==='adset'?'広告セット':'クリエイティブ'}
                  </button>
                ))}
              </div>
              <select value={demoMetric} onChange={e => setDemoMetric(e.target.value as DemoMetric)}
                className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900">
                <option value="ctr">CTR</option><option value="cv">CV数</option><option value="imp">IMP</option>
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
              {kpiDefs.map(({ key: kk, ...rest }) => (
                <KpiCard key={kk} kpiKey={kk} {...rest} goal={goals[kk]} onGoalSave={handleGoal} />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cmpItems.map((item, idx) => {
                const ins = 'insights' in item ? item.insights : undefined
                const cv = getCvCount(ins); const cpa = getCpa(ins)
                const bg = cmpMode==='creative' ? (item as typeof allAds[0]).creative?.thumbnail_url : null
                const colors = ['#1d9e75','#3266ad','#534ab7','#d85a30','#888780','#ba7517']
                return (
                  <div key={item.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {bg ? (
                        <div className="w-8 h-8 rounded-md overflow-hidden shrink-0"><img src={bg} alt="" className="w-full h-full object-cover" /></div>
                      ) : (
                        <div className="w-8 h-8 rounded-md shrink-0" style={{background: colors[idx%6]}} />
                      )}
                      <div>
                        <div className="text-xs font-medium">{item.name}</div>
                        {idx===0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Best</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                      <span>CTR <strong className="text-gray-900 dark:text-white">{ins?ins.ctr.toFixed(1)+'%':'—'}</strong></span>
                      <span>CV <strong className="text-gray-900 dark:text-white">{cv}</strong></span>
                      <span>CPA <strong className="text-gray-900 dark:text-white">{cpa?fmtYen(cpa):'—'}</strong></span>
                      <span>IMP <strong className="text-gray-900 dark:text-white">{ins?fmtK(ins.impressions):'—'}</strong></span>
                    </div>
                    {item.ageGenderBreakdown && item.ageGenderBreakdown.length>0 ? (
                      <AgeGenderView breakdown={item.ageGenderBreakdown} metric={demoMetric} />
                    ) : (
                      <div className="text-xs text-gray-300 text-center py-4">デモグラデータなし</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-4 text-[10px] text-gray-300 text-right">
          取得: {new Date(data.fetchedAt).toLocaleString('ja-JP')} · {periodLabel}
          {isMock && ' · デモデータ'}
        </div>
      </div>
    </div>
  )
}
