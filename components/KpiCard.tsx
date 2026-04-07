'use client'
import { useState } from 'react'

interface Goal {
  value: number
  note: string
}

interface KpiCardProps {
  label: string
  value: string
  raw: number
  delta: string
  up: boolean
  kpiKey: string
  goal?: Goal
  onGoalSave: (key: string, goal: Goal | null) => void
}

export function KpiCard({ label, value, raw, delta, up, kpiKey, goal, onGoalSave }: KpiCardProps) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [inputNote, setInputNote] = useState('')

  const pct = goal ? Math.min(100, Math.round(raw / goal.value * 100)) : null
  const barColor = pct === null ? '' : pct >= 100 ? '#1d9e75' : pct >= 70 ? '#ba7517' : '#d85a30'

  const openModal = () => {
    setInputVal(goal ? String(goal.value) : '')
    setInputNote(goal?.note || '')
    setOpen(true)
  }

  const save = () => {
    const v = parseFloat(inputVal)
    if (!isNaN(v)) onGoalSave(kpiKey, { value: v, note: inputNote })
    setOpen(false)
  }

  const clear = () => {
    onGoalSave(kpiKey, null)
    setOpen(false)
  }

  return (
    <>
      <div
        onClick={openModal}
        className="cursor-pointer rounded-lg p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        style={{ border: goal ? '1.5px solid #1d9e75' : '1.5px solid transparent' }}
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
          <span className="text-xs opacity-40">✎</span>
        </div>
        <div className="text-lg font-medium text-gray-900 dark:text-white leading-none">{value}</div>
        <div className={`text-xs mt-1 ${up ? 'text-green-700' : 'text-orange-700'}`}>
          {delta} vs 先週
        </div>
        {goal && pct !== null && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>目標</span><span>{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 w-72 shadow-xl">
            <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">{label} の目標を設定</h3>
            <label className="text-xs text-gray-500 block mb-1">目標値</label>
            <input
              type="number"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="例: 200"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-2"
            />
            <label className="text-xs text-gray-500 block mb-1">注記（任意）</label>
            <input
              type="text"
              value={inputNote}
              onChange={e => setInputNote(e.target.value)}
              placeholder="例: 月間目標"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setOpen(false)} className="text-xs px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">キャンセル</button>
              {goal && <button onClick={clear} className="text-xs px-3 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50">削除</button>}
              <button onClick={save} className="text-xs px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 dark:bg-white dark:text-gray-900">保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
