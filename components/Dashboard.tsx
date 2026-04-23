'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardData, Period, TabId, CompareMode, DemoMetric, DateRange } from '@/lib/types'
import { getCvCount, getCpa } from '@/lib/metaApi'
import { fmtYen, fmtK } from '@/lib/utils'
import { KpiCard } from './KpiCard'
import { AgeGenderView } from './AgeGenderView'
import { CreativeCard } from './CreativeCard'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Goal { value: number; note: string }
type ColKey = 'name'|'status'|'spend'|'imp'|'reach'|'click'|'ctr'|'cpc'|'cpm'|'cv'|'cpa'|'budget_pct'|'wow'
interface ColDef { key: ColKey; label: string; width: string }
const ALL_COLS: ColDef[] = [
  {key:'name',label:'名前',width:'22%'},{key:'status',label:'状態',width:'8%'},
  {key:'spend',label:'消化',width:'9%'},{key:'imp',label:'IMP',width:'7%'},
  {key:'reach',label:'リーチ',width:'7%'},{key:'click',label:'クリック',width:'7%'},
  {key:'ctr',label:'CTR',width:'6%'},{key:'cpc',label:'CPC',width:'7%'},
  {key:'cpm',label:'CPM',width:'7%'},{key:'cv',label:'CV',width:'5%'},
  {key:'cpa',label:'CPA',width:'8%'},{key:'budget_pct',label:'予算消化率',width:'9%'},
  {key:'wow',label:'前週比',width:'8%'},
]
const PRESET_COLS: Record<string,ColKey[]> = {
  '運用':['name','status','spend','ctr','cv','cpa','wow'],
  'PM報告':['name','status','spend','imp','cv','cpa','budget_pct'],
  '詳細':['name','status','spend','imp','reach','click','ctr','cpc','cv','cpa'],
}
const METRIC_TIPS: Record<string,string> = {
  'IMP':'インプレッション数。広告が表示された回数。',
  'CTR':'クリック率。インプレッション中クリックされた割合。',
  'CPC':'クリック単価。1クリックあたりのコスト。',
  'CPM':'1,000インプレッションあたりのコスト。',
  'CPA':'コンバージョン単価。CV1件あたりのコスト。',
}
type ShortcutKey = Period | 'last7' | 'last14' | 'last30'
const PERIOD_BTNS: {key: ShortcutKey; label: string}[] = [
  {key:'today',label:'今日'},{key:'this_week',label:'今週'},
  {key:'last7',label:'直近7日'},{key:'last14',label:'直近14日'},
  {key:'last30',label:'直近30日'},{key:'this_month',label:'今月'},
  {key:'last_month',label:'先月'},{key:'custom',label:'カスタム'},
]
const TABS: {key: TabId; label: string}[] = [
  {key:'overview',label:'概要'},{key:'campaign',label:'キャンペーン'},
  {key:'adset',label:'広告セット'},{key:'creative',label:'クリエイティブ'},
  {key:'compare',label:'比較分析'},
]
function fmtD(d: Date) { return d.toISOString().split('T')[0] }
function daysAgo(n: number) { const d=new Date(); d.setDate(d.getDate()-n); return fmtD(d) }
function todayStr() { return fmtD(new Date()) }
function shortcutToRange(key: string): DateRange|null {
  if (key==='last7')  return {since:daysAgo(6), until:todayStr()}
  if (key==='last14') return {since:daysAgo(13),until:todayStr()}
  if (key==='last30') return {since:daysAgo(29),until:todayStr()}
  return null
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({active,payload,label}: any) {
  if (!active||!payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="font-medium mb-1.5 text-gray-700 dark:text-gray-300">{label}</p>
      {payload.map((p: {name:string;value:number;color:string},i:number)=>(
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{background:p.color}}/>
          <span className="text-gray-500">{p.name}</span>
          <span className="font-medium ml-auto">
            {p.name.includes('消化')?fmtYen(p.value):p.name.includes('%')?p.value.toFixed(2)+'%':p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
export default function Dashboard() {
  const [data,setData]               = useState<DashboardData|null>(null)
  const [loading,setLoading]         = useState(false)
  const [error,setError]             = useState('')
  const [isMock,setIsMock]           = useState(false)
  const [period,setPeriod]           = useState<Period>('this_week')
  const [shortcut,setShortcut]       = useState<string>('this_week')
  const [customRange,setCustomRange] = useState<DateRange>({since:daysAgo(6),until:todayStr()})
  const [showCustom,setShowCustom]   = useState(false)
  const [tab,setTab]                 = useState<TabId>('overview')
  const tabScrollRef                 = useRef<Record<string,number>>({})
  const [goals,setGoals]             = useState<Record<string,Goal>>({})
  const [accessToken,setAccessToken] = useState('')
  const [adAccountId,setAdAccountId] = useState('')
  const [tokenExpiresAt,setTokenExpiresAt] = useState<string|null>(null)
  const [refreshing,setRefreshing]   = useState(false)
  const [showSettings,setShowSettings] = useState(false)
  const [cmpMode,setCmpMode]         = useState<CompareMode>('adset')
  const [demoMetric,setDemoMetric]   = useState<DemoMetric>('ctr')
  const [crSort,setCrSort]           = useState<'ctr'|'cv'|'cpa'|'imp'>('ctr')
  const [selCreatives,setSelCreatives] = useState<Set<string>>(new Set())
  const [crTypeFilter,setCrTypeFilter] = useState('all')
  const [activeOnly,setActiveOnly]   = useState(false)
  const [preset,setPreset]           = useState('運用')
  const [activeCols,setActiveCols]   = useState<ColKey[]>(PRESET_COLS['運用'])
  const [showColPicker,setShowColPicker] = useState(false)
  const [drillCampaign,setDrillCampaign] = useState<string|null>(null)
  const [drillAdset,setDrillAdset]       = useState<string|null>(null)

  const [credLoaded, setCredLoaded] = useState(false)
  useEffect(()=>{
    const t=localStorage.getItem('meta_access_token')
    const a=localStorage.getItem('meta_ad_account_id')
    if(t) setAccessToken(t)
    if(a) setAdAccountId(a)
    setCredLoaded(true)
  },[]) // eslint-disable-line

  const refreshToken = async () => {
    if (!accessToken) return
    setRefreshing(true)
    try {
      const res=await fetch('/api/refresh-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken})})
      const json=await res.json()
      if(json.error) throw new Error(json.error)
      setAccessToken(json.accessToken)
      localStorage.setItem('meta_access_token',json.accessToken)
      setTokenExpiresAt(json.expiresAt)
      alert('延長しました。有効期限: '+json.expiresAt)
    } catch(e:unknown){ alert('延長失敗: '+(e instanceof Error?e.message:String(e))) }
    finally{ setRefreshing(false) }
  }

  const fetchData = useCallback(async (range?: DateRange) => {
    setLoading(true); setError('')
    const dr = range || shortcutToRange(shortcut) || customRange
    try {
      const res=await fetch('/api/meta',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({accessToken,adAccountId,period,customRange:dr})})
      const json=await res.json()
      if(json.error) throw new Error(json.error)
      setData(json.data); setIsMock(json.mock)
    } catch(e:unknown){ setError(e instanceof Error?e.message:'エラーが発生しました') }
    finally{ setLoading(false) }
  },[accessToken,adAccountId,period,customRange,shortcut])

  useEffect(()=>{ if(credLoaded) fetchData() },[credLoaded]) // eslint-disable-line

  const switchTab = (t: TabId) => {
    tabScrollRef.current[tab]=window.scrollY
    setTab(t)
    setTimeout(()=>window.scrollTo(0,tabScrollRef.current[t]||0),0)
  }
  const handleGoal=(key:string,goal:Goal|null)=>{
    setGoals(prev=>{const n={...prev}; if(goal) n[key]=goal; else delete n[key]; return n})
  }
  const applyPreset=(p:string)=>{ setPreset(p); setActiveCols(PRESET_COLS[p]||PRESET_COLS['運用']) }
  const toggleCol=(k:ColKey)=>{
    setActiveCols(prev=>prev.includes(k)?prev.filter(c=>c!==k):[...prev,k])
    setPreset('カスタム')
  }

  // トークン切れ等のエラー時はAPI設定パネルを表示
  if (!data) return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {loading ? (
          <div className="text-center text-gray-400 text-sm">データを取得中...</div>
        ) : (
          <div>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>
            )}
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium mb-4">Meta Marketing API 接続設定</div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">アクセストークン</label>
                  <input type="password" value={accessToken} onChange={e=>setAccessToken(e.target.value)} placeholder="EAAxxxxxxxx..."
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 font-mono"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">広告アカウントID</label>
                  <input type="text" value={adAccountId} onChange={e=>setAdAccountId(e.target.value)} placeholder="123456789"
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 font-mono"/>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={()=>{localStorage.setItem('meta_access_token',accessToken);localStorage.setItem('meta_ad_account_id',adAccountId);fetchData()}}
                  className="text-xs px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium">接続して更新</button>
                <span className="text-[11px] text-gray-400">※ 接続時に自動保存されます</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const tots=data.totals
  const totalCv=getCvCount(tots)
  const totalCpa=totalCv>0?tots.spend/totalCv:null
  const kpiDefs=[
    {key:'spend',label:'消化金額',value:fmtYen(tots.spend),raw:tots.spend,delta:'+12%',up:true},
    {key:'imp',label:'IMP',value:fmtK(tots.impressions),raw:tots.impressions,delta:'+8%',up:true},
    {key:'click',label:'クリック',value:fmtK(tots.clicks),raw:tots.clicks,delta:'-3%',up:false},
    {key:'ctr',label:'CTR',value:tots.ctr.toFixed(2)+'%',raw:tots.ctr,delta:'-0.2pt',up:false},
    {key:'cpc',label:'CPC',value:fmtYen(tots.cpc),raw:tots.cpc,delta:'+¥1.2',up:false},
    {key:'cv',label:'CV',value:String(totalCv),raw:totalCv,delta:'+19%',up:true},
    {key:'cpa',label:'CPA',value:totalCpa?fmtYen(totalCpa):'—',raw:totalCpa||0,delta:'-¥14',up:true},
    {key:'roas',label:'ROAS',value:'3.2×',raw:3.2,delta:'+0.3×',up:true},
  ]
  const trendData=(data.dailyInsights||[]).map(d=>({
    day:d.date.slice(5).replace('-','/'),
    '消化(¥)':Math.round(d.spend),
    'IMP(K)':Math.round(d.impressions/1000),
    'CV':d.cv,
    'CTR%':parseFloat(d.ctr.toFixed(2)),
  }))
  const filterStatus=(s:string)=>!activeOnly||s==='ACTIVE'
  const filteredCampaigns=data.campaigns.filter(c=>filterStatus(c.status))
  const filteredAdsets=data.adsets.filter(a=>{
    if(!filterStatus(a.status)) return false
    if(drillCampaign&&a.campaign_id!==drillCampaign) return false
    return true
  })
  const allAds=[...data.ads].filter(ad=>{
    if(!filterStatus(ad.status)) return false
    if(drillAdset&&ad.adset_id!==drillAdset) return false
    if(drillCampaign&&ad.campaign_id!==drillCampaign) return false
    if(crTypeFilter!=='all'&&ad.creative?.type!==crTypeFilter) return false
    return true
  }).sort((a,b)=>{
    if(crSort==='cpa') return (getCpa(a.insights)||9999)-(getCpa(b.insights)||9999)
    if(crSort==='ctr') return (b.insights?.ctr||0)-(a.insights?.ctr||0)
    if(crSort==='cv')  return getCvCount(b.insights)-getCvCount(a.insights)
    return (b.insights?.impressions||0)-(a.insights?.impressions||0)
  })
  const cmpItems=cmpMode==='adset'?filteredAdsets:allAds.slice(0,8)
  const periodLabel=shortcut==='custom'?`${customRange.since} ~ ${customRange.until}`:PERIOD_BTNS.find(p=>p.key===shortcut)?.label||''
  const colors=['#1d9e75','#3266ad','#534ab7','#d85a30','#888780','#ba7517','#185fa5','#854f0b']

  type AnyRow={id:string;name:string;status:string;insights?:{spend:number;impressions:number;clicks:number;ctr:number;cpc:number;cpm:number;reach:number};campaign_id?:string;daily_budget?:number;lifetime_budget?:number}
  const cell=(col:ColKey,row:AnyRow,isAdset=false)=>{
    const ins=row.insights; const cv=getCvCount(ins); const cpa=getCpa(ins)
    switch(col){
      case 'name':   return <td key={col} className="py-2 px-2 font-medium overflow-hidden text-ellipsis whitespace-nowrap">{row.name}</td>
      case 'status': return <td key={col} className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${row.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{row.status==='ACTIVE'?'配信中':'停止'}</span></td>
      case 'spend':  return <td key={col} className="py-2 px-2">{ins?fmtYen(ins.spend):'—'}</td>
      case 'imp':    return <td key={col} className="py-2 px-2">{ins?fmtK(ins.impressions):'—'}</td>
      case 'reach':  return <td key={col} className="py-2 px-2">{ins?fmtK(ins.reach||0):'—'}</td>
      case 'click':  return <td key={col} className="py-2 px-2">{ins?fmtK(ins.clicks):'—'}</td>
      case 'ctr':    return <td key={col} className="py-2 px-2">{ins?ins.ctr.toFixed(1)+'%':'—'}</td>
      case 'cpc':    return <td key={col} className="py-2 px-2">{ins?fmtYen(ins.cpc):'—'}</td>
      case 'cpm':    return <td key={col} className="py-2 px-2">{ins?fmtYen(ins.cpm||0):'—'}</td>
      case 'cv':     return <td key={col} className="py-2 px-2">{cv}</td>
      case 'cpa':    return <td key={col} className="py-2 px-2">{cpa?fmtYen(cpa):'—'}</td>
      case 'budget_pct':{
        if(!isAdset) return <td key={col} className="py-2 px-2">—</td>
        const r=row as typeof filteredAdsets[0]
        const budget=r.daily_budget||r.lifetime_budget
        const bpct=budget&&ins?Math.min(100,Math.round(ins.spend/budget*100)):null
        return <td key={col} className="py-2 px-2">{bpct!==null?<div><div className="text-[10px] text-gray-400 mb-1">{bpct}%</div><div className="h-1 rounded bg-gray-200 overflow-hidden"><div className="h-full rounded bg-green-500" style={{width:`${bpct}%`}}/></div></div>:'—'}</td>
      }
      case 'wow':    return <td key={col} className="py-2 px-2 text-gray-400">—</td>
      default:       return <td key={col} className="py-2 px-2">—</td>
    }
  }

  const colPicker=(
    <div className="relative">
      <button onClick={()=>setShowColPicker(!showColPicker)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50">列 ▾</button>
      {showColPicker&&(
        <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 w-72">
          <div className="text-xs font-medium mb-2">プリセット</div>
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {Object.keys(PRESET_COLS).map(p=>(
              <button key={p} onClick={()=>applyPreset(p)} className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${preset===p?'bg-gray-900 text-white border-gray-900':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{p}</button>
            ))}
          </div>
          <div className="text-xs font-medium mb-2">カスタム列</div>
          <div className="grid grid-cols-2 gap-1">
            {ALL_COLS.filter(c=>c.key!=='name').map(c=>(
              <label key={c.key} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5">
                <input type="checkbox" checked={activeCols.includes(c.key)} onChange={()=>toggleCol(c.key)} className="rounded"/>{c.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const breadcrumb=(drillCampaign||drillAdset)?(
    <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
      <button onClick={()=>{setDrillCampaign(null);setDrillAdset(null)}} className="hover:text-gray-800">すべて</button>
      {drillCampaign&&(<><span>/</span><button onClick={()=>setDrillAdset(null)} className="hover:text-gray-800">{data.campaigns.find(c=>c.id===drillCampaign)?.name||drillCampaign}</button></>)}
      {drillAdset&&(<><span>/</span><span className="font-medium text-gray-800">{data.adsets.find(a=>a.id===drillAdset)?.name||drillAdset}</span></>)}
    </div>
  ):null

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium">Meta広告ダッシュボード</h1>
            {isMock&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">デモデータ</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <div onClick={()=>setActiveOnly(!activeOnly)} className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${activeOnly?'bg-green-500':'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${activeOnly?'translate-x-4':'translate-x-0.5'}`}/>
              </div>配信中のみ
            </label>
            <button onClick={()=>setShowSettings(!showSettings)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50">⚙ API設定</button>
            <button onClick={()=>fetchData()} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 disabled:opacity-40">{loading?'取得中...':'↻ 更新'}</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PERIOD_BTNS.map(p=>(
            <button key={p.key} onClick={()=>{
              setShortcut(p.key)
              if(p.key==='custom'){setShowCustom(true);return}
              const r=shortcutToRange(p.key)
              if(r){setCustomRange(r);setPeriod('custom');fetchData(r)}
              else{
                // For non-shortcut periods, compute range from period key
                const pr: Record<string,{since:string;until:string}> = {
                  'today': {since:todayStr(),until:todayStr()},
                  'this_week': (()=>{const d=new Date();const day=d.getDay();const mon=new Date(d);mon.setDate(d.getDate()-(day===0?6:day-1));return {since:fmtD(mon),until:todayStr()}})(),
                  'this_month': (()=>{const d=new Date();return {since:fmtD(new Date(d.getFullYear(),d.getMonth(),1)),until:todayStr()}})(),
                  'last_month': (()=>{const d=new Date();const f=new Date(d.getFullYear(),d.getMonth()-1,1);const l=new Date(d.getFullYear(),d.getMonth(),0);return {since:fmtD(f),until:fmtD(l)}})(),
                }
                const range=pr[p.key as string]
                setPeriod(p.key as Period)
                if(range) fetchData(range)
                else fetchData()
              }
            }} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${shortcut===p.key?'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900':'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {p.key==='custom'&&shortcut==='custom'?periodLabel:p.label}
            </button>
          ))}
        </div>
        {showCustom&&(
          <div className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">期間指定</span>
            <input type="date" value={customRange.since} onChange={e=>setCustomRange(r=>({...r,since:e.target.value}))} className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900"/>
            <span className="text-xs text-gray-400">〜</span>
            <input type="date" value={customRange.until} onChange={e=>setCustomRange(r=>({...r,until:e.target.value}))} className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900"/>
            <button onClick={()=>{setShowCustom(false);setPeriod('custom');fetchData(customRange)}} className="text-xs px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium">適用</button>
            <button onClick={()=>setShowCustom(false)} className="text-xs text-gray-400">キャンセル</button>
          </div>
        )}
        {showSettings&&(
          <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium mb-3">Meta Marketing API 接続設定</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 block mb-1">アクセストークン</label>
                <input type="password" value={accessToken} onChange={e=>setAccessToken(e.target.value)} placeholder="EAAxxxxxxxx..." className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 font-mono"/></div>
              <div><label className="text-xs text-gray-500 block mb-1">広告アカウントID</label>
                <input type="text" value={adAccountId} onChange={e=>setAdAccountId(e.target.value)} placeholder="123456789" className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 font-mono"/></div>
            </div>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button onClick={()=>{localStorage.setItem('meta_access_token',accessToken);localStorage.setItem('meta_ad_account_id',adAccountId);setShowSettings(false);fetchData()}} className="text-xs px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium">接続して更新</button>
              <button onClick={refreshToken} disabled={!accessToken||refreshing} className="text-xs px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">{refreshing?'延長中...':'↻ トークンを60日延長'}</button>
              {tokenExpiresAt&&<span className="text-[11px] text-gray-400">有効期限: {tokenExpiresAt}</span>}
              <span className="text-[11px] text-gray-400">※ 接続時に自動保存されます</span>
              <button onClick={()=>{localStorage.removeItem('meta_access_token');localStorage.removeItem('meta_ad_account_id');setAccessToken('');setAdAccountId('')}} className="text-xs text-red-400 hover:text-red-600 ml-auto">クリア</button>
            </div>
            {error&&<p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        )}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>switchTab(t.key)} className={`px-4 py-2 text-xs whitespace-nowrap border-b-2 transition-colors -mb-px ${tab===t.key?'border-gray-900 dark:border-white font-medium':'border-transparent text-gray-400 hover:text-gray-600'}`}>{t.label}</button>
          ))}
        </div>
        {tab==='overview'&&(
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
              {kpiDefs.map(({key:kk,...rest})=><KpiCard key={kk} kpiKey={kk} {...rest} goal={goals[kk]} onGoalSave={handleGoal}/>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {title:'消化金額 / IMP（日次）',bar:'消化(¥)',line:'IMP(K)',barC:'#3266ad',lineC:'#1d9e75',lFmt:(v:number)=>'¥'+(v/1000).toFixed(0)+'K',rFmt:(v:number)=>v+'K'},
                {title:'CV / CTR（日次）',bar:'CV',line:'CTR%',barC:'#1d9e75',lineC:'#ba7517',lFmt:(v:number)=>String(v),rFmt:(v:number)=>v+'%'},
              ].map(cfg=>(
                <div key={cfg.title} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                  <div className="text-xs text-gray-500 mb-0.5">{cfg.title}</div>
                  <div className="text-[10px] text-gray-400 mb-3">{periodLabel}</div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData} margin={{top:4,right:8,bottom:0,left:0}}>
                        <XAxis dataKey="day" tick={{fontSize:9}}/>
                        <YAxis yAxisId="l" tick={{fontSize:9}} tickFormatter={cfg.lFmt} width={50}/>
                        <YAxis yAxisId="r" orientation="right" tick={{fontSize:9}} tickFormatter={cfg.rFmt} width={36}/>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Legend iconSize={8} wrapperStyle={{fontSize:10}}/>
                        <Bar yAxisId="l" dataKey={cfg.bar} fill={cfg.barC} fillOpacity={0.3} radius={[2,2,0,0]}/>
                        <Line yAxisId="r" type="monotone" dataKey={cfg.line} stroke={cfg.lineC} strokeWidth={1.5} dot={{r:2}}/>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='campaign'&&(
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">{filteredCampaigns.length}件</span>{colPicker}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{tableLayout:'fixed'}}>
                <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                  {activeCols.map(k=>{const c=ALL_COLS.find(a=>a.key===k)!;const tip=METRIC_TIPS[c.label.toUpperCase()]
                    return <th key={k} style={{width:c.width}} className="text-left py-2 px-2 font-medium text-gray-400 whitespace-nowrap">
                      <span className="group relative cursor-default">{c.label}{tip&&<span className="absolute bottom-5 left-0 z-10 hidden group-hover:block bg-gray-800 text-white text-[10px] rounded px-2 py-1 w-48 whitespace-normal font-normal">{tip}</span>}</span>
                    </th>
                  })}<th className="text-left py-2 px-2 font-medium text-gray-400 w-16">詳細</th>
                </tr></thead>
                <tbody>{filteredCampaigns.map(c=>(
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                    {activeCols.map(k=>cell(k,c))}
                    <td className="py-2 px-2"><button onClick={()=>{setDrillCampaign(c.id);setDrillAdset(null);switchTab('adset')}} className="text-[10px] text-blue-500 hover:text-blue-700">広告セット →</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        {tab==='adset'&&(
          <div>
            {breadcrumb}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">{filteredAdsets.length}件</span>{colPicker}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{tableLayout:'fixed'}}>
                <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                  {activeCols.map(k=>{const c=ALL_COLS.find(a=>a.key===k)!
                    return <th key={k} style={{width:c.width}} className="text-left py-2 px-2 font-medium text-gray-400 whitespace-nowrap">{c.label}</th>
                  })}<th className="text-left py-2 px-2 font-medium text-gray-400 w-16">詳細</th>
                </tr></thead>
                <tbody>{filteredAdsets.map(a=>(
                  <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                    {activeCols.map(k=>cell(k,a,true))}
                    <td className="py-2 px-2"><button onClick={()=>{setDrillCampaign(a.campaign_id);setDrillAdset(a.id);switchTab('creative')}} className="text-[10px] text-blue-500 hover:text-blue-700">広告 →</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        {tab==='creative'&&(
          <div>
            {breadcrumb}
            <div className="flex gap-2 mb-3 flex-wrap items-center">
              {[
                {label:'並び替え',val:crSort,set:(v:string)=>setCrSort(v as typeof crSort),opts:[['ctr','CTR高い順'],['cv','CV多い順'],['cpa','CPA低い順'],['imp','IMP多い順']]},
                {label:'タイプ',val:crTypeFilter,set:setCrTypeFilter,opts:[['all','すべて'],['VIDEO','動画'],['IMAGE','静止画'],['CAROUSEL','カルーセル']]},
                {label:'デモグラ',val:demoMetric,set:(v:string)=>setDemoMetric(v as DemoMetric),opts:[['ctr','CTR'],['cv','CV数'],['imp','IMP']]},
              ].map(ctrl=>(
                <div key={ctrl.label} className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">{ctrl.label}</span>
                  <select value={ctrl.val} onChange={e=>ctrl.set(e.target.value)} className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900">
                    {ctrl.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <span className="text-xs text-gray-400 ml-auto">{allAds.length}件</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {allAds.map((ad,i)=>(
                <CreativeCard key={ad.id} ad={ad} rank={i} selected={selCreatives.has(ad.id)}
                  onSelect={()=>setSelCreatives(prev=>{const n=new Set(prev);n.has(ad.id)?n.delete(ad.id):n.add(ad.id);return n})}
                  demoMetric={demoMetric}/>
              ))}
            </div>
          </div>
        )}
        {tab==='compare'&&(
          <div>
            <div className="flex gap-2 mb-4 items-center flex-wrap">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
                {(['adset','creative'] as CompareMode[]).map(m=>(
                  <button key={m} onClick={()=>setCmpMode(m)} className={`px-3 py-1.5 ${cmpMode===m?'bg-gray-100 dark:bg-gray-800 font-medium':'text-gray-400 hover:bg-gray-50'}`}>{m==='adset'?'広告セット':'クリエイティブ'}</button>
                ))}
              </div>
              <select value={demoMetric} onChange={e=>setDemoMetric(e.target.value as DemoMetric)} className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900">
                <option value="ctr">CTR</option><option value="cv">CV数</option><option value="imp">IMP</option>
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-5">
              {kpiDefs.map(({key:kk,...rest})=><KpiCard key={kk} kpiKey={kk} {...rest} goal={goals[kk]} onGoalSave={handleGoal}/>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cmpItems.map((item,idx)=>{
                const ins='insights' in item?item.insights:undefined
                const cv=getCvCount(ins); const cpa=getCpa(ins)
                const bg=cmpMode==='creative'?(item as typeof allAds[0]).creative?.thumbnail_url:null
                const barData=[
                  {name:'CTR%',value:parseFloat((ins?.ctr||0).toFixed(2))},
                  {name:'CV',value:cv},
                  {name:'CPA(K)',value:cpa?Math.round(cpa/1000):0},
                  {name:'IMP(K)',value:ins?Math.round(ins.impressions/1000):0},
                ]
                return (
                  <div key={item.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {bg?<div className="w-10 h-10 rounded-md overflow-hidden shrink-0"><img src={bg} alt="" className="w-full h-full object-cover"/></div>
                        :<div className="w-10 h-10 rounded-md shrink-0" style={{background:colors[idx%colors.length]}}/>}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{item.name}</div>
                        {idx===0&&<span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Best</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {[['CTR',ins?ins.ctr.toFixed(1)+'%':'—'],['CV',String(cv)],['CPA',cpa?fmtYen(cpa):'—'],['IMP',ins?fmtK(ins.impressions):'—']].map(([l,v])=>(
                        <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-gray-400 mb-0.5">{l}</div>
                          <div className="text-xs font-medium">{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="h-24 mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={barData} margin={{top:0,right:0,bottom:0,left:-20}}>
                          <XAxis dataKey="name" tick={{fontSize:9}}/>
                          <YAxis tick={{fontSize:9}}/>
                          <Tooltip content={<CustomTooltip/>}/>
                          <Bar dataKey="value" fill={colors[idx%colors.length]} fillOpacity={0.7} radius={[2,2,0,0]}/>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {item.ageGenderBreakdown&&item.ageGenderBreakdown.length>0
                      ?<AgeGenderView breakdown={item.ageGenderBreakdown} metric={demoMetric}/>
                      :<div className="text-xs text-gray-300 text-center py-2">デモグラデータなし</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <div className="mt-4 text-[10px] text-gray-300 text-right">
          取得: {new Date(data.fetchedAt).toLocaleString('ja-JP')} · {periodLabel}{isMock&&' · デモデータ'}
        </div>
      </div>
    </div>
  )
}
