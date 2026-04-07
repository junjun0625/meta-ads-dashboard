'use client'
import { useState, useEffect, useCallback } from 'react'
import { DashboardData, Period, TabId, CompareMode, DemoMetric } from '@/lib/types'
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
]
const TABS: { key: TabId; label: string }[] = [
  { key: 'overview', label: '概要' },
  { key: 'campaign', label: 'キャンペーン' },
  { key: 'adset', label: '広告セット' },
  { key: 'creative', label: 'クリエイティブ' },
  { key: 'compare', label: '比較分析' },
]

const MOCK_TREND = [
  { day: '4/1', spend: 5200, imp: 18, cv: 12, ctr: 1.4 },
  { day: '4/2', spend: 6100, imp: 21, cv: 14, ctr: 1.5 },
  { day: '4/3', spend: 7800, imp: 27, cv: 19, ctr: 1.6 },
  { day: '4/4', spend: 5400, imp: 19, cv: 11, ctr: 1.3 },
  { day: '4/5', spend: 8200, imp: 29, cv: 22, ctr: 1.7 },
  { day: '4/6', spend: 7100, imp: 25, cv: 18, ctr: 1.6 },
  { day: '4/7', spend: 8520, imp: 30, cv: 24, ctr: 1.8 },
]

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMock, setIsMock] = useState(false)
  const [period, setPeriod] = useState<Period>('this_week')
  const [tab, setTab] = useState<TabId>('overview')
  const [goals, setGoals] = useState<Record<string, Goal>>({})
  const [accessToken, setAccessToken] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [cmpMode, setCmpMode] = useState<CompareMode>('adset')
  const [demoMetric, setDemoMetric] = useState<DemoMetric>('ctr')
  const [crSort, setCrSort] = useState<'ctr' | 'cv' | 'cpa' | 'imp'>('ctr')
  const [selCreative, setSelCreative] = useState<string | null>(null)
  const [crTypeFilter, setCrTypeFilter] = useState('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, adAccountId, period }),
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
  }, [accessToken, adAccountId, period])

  useEffect(() => { fetchData() }, [fetchData])

  const handleGoal = (key: string, goal: Goal | null) => {
    setGoals(prev => {
      const next = { ...prev }
      if (goal) next[key] = goal
      else delete next[key]
      return next
    })
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

  const allAds = [...data.ads].sort((a, b) => {
    if (crSort === 'cpa') return (getCpa(a.insights) || 9999) - (getCpa(b.insights) || 9999)
    if (crSort === 'ctr') return (b.insights?.ctr || 0) - (a.insights?.ctr || 0)
    if (crSort === 'cv') return getCvCount(b.insights) - getCvCount(a.insights)
    return (b.insights?.impressions || 0) - (a.insights?.impressions || 0)
  }).filter(ad => {
    if (crTypeFilter === 'all') return true
    return ad.creative?.type === crTypeFilter
  })

  const cmpItems = cmpMode === 'adset' ? data.adsets : allAds.slice(0, 6)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 py-5">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium">Meta広告ダッシュボード</h1>
            {isMock && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                デモデータ
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 transition-colors ${period === p.key ? 'bg-gray-100 dark:bg-gray-800 font-medium' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {p.label}
                </button>
              ))}
            </div>
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

        {/* Settings panel */}
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
                  placeholder="act_123456789"
                  className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 font-mono" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => { setShowSettings(false); fetchData() }}
                className="text-xs px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-80">
                接続して更新
              </button>
              <span className="text-[11px] text-gray-400">※ トークンはブラウザのメモリにのみ保持されます</span>
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
              {kpiDefs.map(({ key: kk, ...rest }) => <KpiCard key={kk} kpiKey={kk} {...rest} goal={goals[kk]} onGoalSave={handleGoal} />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { title: '消化金額 / IMP（日次）', bars: [{ k: 'spend', name: '消化', color: '#3266ad', axis: 'l', fmt: (v: number) => '¥' + (v/1000).toFixed(0) + 'K' }], lines: [{ k: 'imp', name: 'IMP(K)', color: '#1d9e75', axis: 'r', fmt: (v: number) => v + 'K' }] },
                { title: 'CV / CTR（日次）', bars: [{ k: 'cv', name: 'CV', color: '#1d9e75', axis: 'l', fmt: (v: number) => String(v) }], lines: [{ k: 'ctr', name: 'CTR%', color: '#ba7517', axis: 'r', fmt: (v: number) => v + '%' }] },
              ].map(chart => (
                <div key={chart.title} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                  <div className="text-xs text-gray-500 mb-3">{chart.title}</div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={MOCK_TREND}>
                        <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                        <YAxis yAxisId="l" tick={{ fontSize: 9 }} tickFormatter={chart.bars[0].fmt} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} tickFormatter={chart.lines[0].fmt} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        {chart.bars.map(b => <Bar key={b.k} yAxisId="l" dataKey={b.k} fill={b.color} fillOpacity={0.3} radius={[2,2,0,0]} name={b.name} />)}
                        {chart.lines.map(l => <Line key={l.k} yAxisId="r" type="monotone" dataKey={l.k} stroke={l.color} strokeWidth={1.5} dot={{ r: 2 }} name={l.name} />)}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
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
                {data.campaigns.map(c => {
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
                {data.adsets.map(a => {
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
                <CreativeCard key={ad.id} ad={ad} rank={i} selected={selCreative===ad.id}
                  onSelect={() => setSelCreative(selCreative===ad.id ? null : ad.id)} demoMetric={demoMetric} />
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
              {kpiDefs.map(({ key: kk, ...rest }) => <KpiCard key={kk} kpiKey={kk} {...rest} goal={goals[kk]} onGoalSave={handleGoal} />)}
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
                        <div className="w-8 h-8 rounded-md overflow-hidden shrink-0">
                          <img src={bg} alt="" className="w-full h-full object-cover" />
                        </div>
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
          取得: {new Date(data.fetchedAt).toLocaleString('ja-JP')}
          {isMock && ' · デモデータ（API設定でリアルデータに切替）'}
        </div>
      </div>
    </div>
  )
}
