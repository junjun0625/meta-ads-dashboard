'use client'
import { AgeGenderBreakdown, DemoMetric } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface AgeGenderProps {
  breakdown: AgeGenderBreakdown[]
  metric: DemoMetric
}

const AGES = ['13-17', '18-24', '25-34', '35-44', '45+']

function getVal(row: AgeGenderBreakdown, metric: DemoMetric): number {
  if (metric === 'ctr') return row.ctr
  if (metric === 'imp') return row.impressions
  if (metric === 'cv') {
    const cv = row.actions?.find(a => ['lead', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'complete_registration'].includes(a.action_type))
    return cv ? parseInt(cv.value) : 0
  }
  return 0
}

function fmtVal(v: number, metric: DemoMetric) {
  if (metric === 'ctr') return v.toFixed(1) + '%'
  if (metric === 'imp') return v >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(Math.round(v))
  return String(Math.round(v))
}

function barColor(v: number, max: number, metric: DemoMetric) {
  if (max === 0) return '#e5e7eb'
  const r = v / max
  if (metric === 'cpa') return r < 0.6 ? '#1d9e75' : r < 0.8 ? '#9fe1cb' : r < 0.9 ? '#fac775' : '#f09595'
  return r > 0.8 ? '#1d9e75' : r > 0.55 ? '#9fe1cb' : r > 0.3 ? '#fac775' : '#f09595'
}

export function AgeGenderView({ breakdown, metric }: AgeGenderProps) {
  const maleRows = AGES.map(age => ({
    age,
    ...breakdown.find(r => r.age === age && r.gender === 'male'),
  }))
  const femaleRows = AGES.map(age => ({
    age,
    ...breakdown.find(r => r.age === age && r.gender === 'female'),
  }))

  const allVals = [...maleRows, ...femaleRows].map(r => getVal(r as AgeGenderBreakdown, metric))
  const maxV = Math.max(...allVals, 0.01)

  const chartData = AGES.map((age, i) => ({
    age,
    男性: parseFloat(getVal(maleRows[i] as AgeGenderBreakdown, metric).toFixed(2)),
    女性: parseFloat(getVal(femaleRows[i] as AgeGenderBreakdown, metric).toFixed(2)),
  }))

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {(['male', 'female'] as const).map(sex => {
          const rows = sex === 'male' ? maleRows : femaleRows
          const color = sex === 'male' ? '#3266ad' : '#d4537e'
          const label = sex === 'male' ? '男性' : '女性'
          return (
            <div key={sex}>
              <div className="text-xs font-medium mb-2 text-center" style={{ color }}>{label}</div>
              {rows.map((row, i) => {
                const v = getVal(row as AgeGenderBreakdown, metric)
                const pct = maxV > 0 ? Math.round(v / maxV * 100) : 0
                const bc = barColor(v, maxV, metric)
                return (
                  <div key={i} className="flex items-center gap-2 h-6 mb-1">
                    <div className="text-[10px] text-gray-400 w-9 text-right shrink-0">{row.age}</div>
                    <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                      <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: bc }} />
                    </div>
                    <div className="text-[10px] font-medium w-8 text-right text-gray-700 dark:text-gray-200 shrink-0">
                      {fmtVal(v, metric)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="age" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip formatter={(v) => fmtVal(Number(v), metric)} contentStyle={{ fontSize: 11 }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="男性" fill="#3266ad" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            <Bar dataKey="女性" fill="#d4537e" fillOpacity={0.65} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
