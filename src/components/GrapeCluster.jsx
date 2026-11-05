import { Fragment, useEffect, useId, useRef, useState } from 'react'

// 목표 횟수(1~7)별 포도송이 모양: 위에서부터 각 줄에 몇 알인지
const LAYOUTS = {
  1: [1], 2: [2], 3: [2, 1], 4: [3, 1], 5: [3, 2], 6: [3, 2, 1], 7: [3, 2, 2],
}
const R = 20
const DX = R * 2 + 4
const DY = R * 1.8 + 2
const TOP = 46

// 8알 이상: 5,4,3,2,1 처럼 한 줄씩 줄어드는 송이 모양
function autoRows(n) {
  let w = 1
  while ((w * (w + 1)) / 2 < n) w++
  const rows = []
  for (let left = n, k = w; left > 0; k--) { rows.push(Math.min(k, left)); left -= k }
  return rows
}

// 손으로 붙인 것처럼 알마다 살짝 다른 위치/크기 (매번 같은 값)
const jitter = (i, k) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x) - 0.5
}

function layout(target) {
  const rows = LAYOUTS[target] || autoRows(Math.max(1, target))
  const maxRow = Math.max(...rows)
  const width = maxRow * DX
  const pts = []
  rows.forEach((n, r) => {
    const startX = (width - n * DX) / 2 + DX / 2
    for (let i = 0; i < n; i++) {
      const k = pts.length
      pts.push({ x: startX + i * DX + jitter(k, 1) * 2.5, y: TOP + r * DY + R + jitter(k, 2) * 2.5, r: R + jitter(k, 3) * 1.6, rot: jitter(k, 4) * 40 })
    }
  })
  return { pts, width, height: TOP + rows.length * DY + R / 2 + 6 }
}

import { GOAL_COLORS, colorOf } from '../lib/colors.js'

const INK = '#5A3A9E' // 줄기·빈 알 손그림 선

/**
 * checkins: 시간순 체크인. 앞에서부터 포도알을 채웁니다.
 * canAdd: 다음 빈 포도알을 눌러 붙일 수 있는지
 * color: 골 색 번호 (GOAL_COLORS). colorOfCheckin(c) 를 주면 알마다 다른 색 (홈: 여러 골 섞기)
 * meUid, labelOf 를 주면 '팀 송이' 모드: 내 알은 진하게 + "me", 친구 알은 연하게 + 이름 첫 글자
 * tint: 'other' 면 전부 연한 색 (친구 개별 송이)
 */
export default function GrapeCluster({ target, checkins, size = 1, maxWidth, canAdd, onAdd, onOpen, meUid, labelOf, tint, color = 0, colorOfCheckin }) {
  const gid = useId().replace(/:/g, '')
  const { pts, width, height } = layout(target)
  if (maxWidth) size = Math.min(size, maxWidth / (width + 8))
  const filled = Math.min(checkins.length, target)
  const team = meUid !== undefined
  const cx = width / 2

  // 새로 채워진 알만 '뿅' 애니메이션
  const prev = useRef(0)
  const [pops, setPops] = useState({})
  useEffect(() => {
    if (filled > prev.current) {
      const p = {}
      for (let i = prev.current; i < filled; i++) p[i] = (i - prev.current) * 70
      setPops(p)
      const t = setTimeout(() => setPops({}), 900 + filled * 70)
      prev.current = filled
      return () => clearTimeout(t)
    }
    prev.current = filled
  }, [filled])

  const wash = (id, [inner, edge]) => (
    // 수채화: 가운데는 옅고 가장자리에 물감이 고이는 느낌
    <radialGradient id={id} cx="40%" cy="38%" r="70%">
      <stop offset="0" stopColor={inner} stopOpacity=".85" />
      <stop offset=".72" stopColor={edge} stopOpacity=".8" />
      <stop offset="1" stopColor={edge} stopOpacity="1" />
    </radialGradient>
  )

  return (
    <svg
      className="cluster"
      viewBox={`-6 0 ${width + 12} ${height}`}
      width={(width + 12) * size}
      height={height * size}
      role="img"
      aria-label={`Grapes ${filled}/${target}`}
    >
      <defs>
        {GOAL_COLORS.map((col, k) => <Fragment key={k}>{wash(`m${k}${gid}`, col.me)}{wash(`o${k}${gid}`, col.friend)}</Fragment>)}
        {wash(`l${gid}`, ['#9FE0BE', '#3FA273'])}
        {/* 번진 가장자리 */}
        <filter id={`w${gid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" />
        </filter>
        {/* 손으로 그은 선 */}
        <filter id={`h${gid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="1" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="1.8" />
        </filter>
      </defs>

      {/* 손그림 줄기 + 덩굴손 + 수채화 잎 */}
      <g filter={`url(#h${gid})`} fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round">
        <path d={`M${cx + 1} 6 C${cx - 3} 18 ${cx + 3} 28 ${cx} ${TOP - 4}`} />
        <path d={`M${cx - 1} 20 C${cx - 10} 16 ${cx - 16} 22 ${cx - 13} 27 C${cx - 10} 31 ${cx - 6} 26 ${cx - 9} 24`} />
      </g>
      <path
        filter={`url(#w${gid})`}
        d={`M${cx + 2} 22 C${cx + 12} 6 ${cx + 32} 6 ${cx + 42} 14 C${cx + 32} 30 ${cx + 14} 30 ${cx + 2} 22Z`}
        fill={`url(#l${gid})`}
      />
      <path filter={`url(#h${gid})`} d={`M${cx + 4} 21 C${cx + 16} 17 ${cx + 26} 15 ${cx + 38} 14`} stroke={INK} strokeWidth="1.2" fill="none" opacity=".55" />

      {pts.map((p, i) => {
        const c = checkins[i]
        const isFilled = i < filled
        const isNext = !isFilled && i === filled && canAdd
        const handle = isFilled ? () => onOpen?.(c) : isNext ? onAdd : undefined
        const other = team ? c?.uid !== meUid : tint === 'other'
        const ci = (colorOfCheckin && c ? colorOfCheckin(c) : color) % GOAL_COLORS.length
        const col = colorOf(ci)
        return (
          <g
            key={i}
            transform={`translate(${p.x} ${p.y})`}
            onClick={handle}
            className={`grape ${isFilled ? 'on' : 'off'} ${isNext ? 'next' : ''} ${handle ? 'tap' : ''}`}
            role={handle ? 'button' : undefined}
            aria-label={isNext ? 'Add a grape' : undefined}
          >
            {isFilled ? (
              <g className={i in pops ? 'pop' : ''} style={{ animationDelay: `${pops[i] || 0}ms` }}>
                <g transform={`rotate(${p.rot})`}>
                  <ellipse rx={p.r} ry={p.r * 0.96} fill={`url(#${other ? 'o' : 'm'}${ci}${gid})`} filter={`url(#w${gid})`} />
                  {/* 물감 얼룩 하이라이트 */}
                  <ellipse cx={-p.r * 0.35} cy={-p.r * 0.38} rx={p.r * 0.28} ry={p.r * 0.17} fill="#fff" opacity=".55" filter={`url(#w${gid})`} />
                </g>
                {team && (
                  <text y="4.5" textAnchor="middle" className="grape-label" fontFamily="Inter Tight, -apple-system, Helvetica, Arial, sans-serif" fontSize="14" fontWeight="500" fill={other ? col.label : '#fff'}>
                    {other ? [...(labelOf?.(c.uid) || '?')][0].toLowerCase() : 'me'}
                  </text>
                )}
                {c?.mediaType && (
                  <circle cx={p.r * 0.68} cy={p.r * 0.68} r={4.2} fill="#fff" stroke={INK} strokeWidth="1.4" filter={`url(#h${gid})`} />
                )}
              </g>
            ) : (
              <g filter={`url(#h${gid})`}>
                <circle
                  r={p.r - 1.5}
                  fill={isNext ? '#fff' : 'none'}
                  stroke={isNext ? colorOf(color).ink : INK}
                  strokeWidth={isNext ? 1.8 : 1.2}
                  strokeDasharray={isNext ? 'none' : '3 4'}
                  opacity={isNext ? 1 : 0.4}
                />
                {isNext && <path d="M-6 0 H6 M0 -6 V6" stroke={colorOf(color).ink} strokeWidth="2" strokeLinecap="round" />}
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
