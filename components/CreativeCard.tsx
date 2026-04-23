'use client'
import { useState } from 'react'
import { Ad } from '@/lib/types'
import { getCvCount, getCpa } from '@/lib/metaApi'
import { AgeGenderView } from './AgeGenderView'
import { DemoMetric } from '@/lib/types'

interface CreativeCardProps {
  ad: Ad
  rank: number
  selected: boolean
  onSelect: () => void
  demoMetric: DemoMetric
}

export function CreativeCard({ ad, rank, selected, onSelect, demoMetric }: CreativeCardProps) {
  const [imgError, setImgError] = useState(false)
  const cr = ad.creative
  const ins = ad.insights
  const cv = getCvCount(ins)
  const cpa = getCpa(ins)
  const isVideo = cr?.type === 'VIDEO'
  const thumbUrl = cr?.thumbnail_url

  return (
    <div
      onClick={onSelect}
      className="rounded-xl overflow-hidden cursor-pointer transition-all bg-white dark:bg-gray-900"
      style={{ border: selected ? '2px solid #3266ad' : '0.5px solid rgba(0,0,0,0.1)' }}
    >
      <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {thumbUrl && !imgError ? (
          <img
            src={thumbUrl}
            alt={cr?.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: ['#1d9e75', '#3266ad', '#534ab7', '#d85a30', '#888780', '#ba7517'][rank % 6] }}
          >
            <span className="text-white text-xs font-medium">{cr?.type || 'クリエイティブ'}</span>
          </div>
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
              <svg viewBox="0 0 10 12" className="w-3.5 h-3.5 fill-white ml-0.5">
                <polygon points="0,0 10,6 0,12" />
              </svg>
            </div>
          </div>
        )}
        {rank === 0 && (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(29,158,117,0.9)', color: '#fff' }}>
            Winner
          </span>
        )}
        <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
          {cr?.type === 'VIDEO' ? '動画' : cr?.type === 'CAROUSEL' ? 'カルーセル' : '静止画'}
        </span>
      </div>
      <div className="p-2.5">
        <div className="text-xs font-medium mb-1.5 truncate text-gray-900 dark:text-white" title={ad.name}>{ad.name}</div>
        <div className="grid grid-cols-2 gap-1">
          {[
            ['CTR', ins ? ins.ctr.toFixed(1) + '%' : '—'],
            ['CV', String(cv)],
            ['CPA', cpa ? '¥' + Math.round(cpa) : '—'],
            ['IMP', ins ? (ins.impressions >= 1000 ? (ins.impressions / 1000).toFixed(0) + 'K' : String(ins.impressions)) : '—'],
          ].map(([l, v]) => (
            <div key={l} className="text-[11px] text-gray-500">
              {l} <span className="font-medium text-gray-900 dark:text-white">{v}</span>
            </div>
          ))}
        </div>
      </div>
      {selected && (ad.ageGenderBreakdown?.length ?? 0) > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-3">
          <AgeGenderView breakdown={ad.ageGenderBreakdown ?? []} metric={demoMetric} />
        </div>
      )}
    </div>
  )
}
