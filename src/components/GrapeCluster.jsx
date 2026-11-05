import { useEffect, useId, useRef, useState } from 'react'

// 목표 횟수(1~7)별 포도송이 모양: 위에서부터 각 줄에 몇 알인지
const LAYOUTS = {
  1: [1], 2: [2], 3: [2, 1], 4: [3, 1], 5: [3, 2], 6: [3, 2, 1], 7: [4, 2, 1],
}
const R = 20
const DX = R * 2 + 4
const DY = R * 1.8 + 2

function layout(target) {
  const rows = LAYOUTS[target] || LAYOUTS[7]
  const maxRow = Math.max(...rows)
  const width = maxRow * DX
  const pts = []
  rows.forEach((n, r) => {
    const startX = (width - n * DX) / 2 + DX / 2
    for (let i = 0; i < n; i++) pts.push({ x: startX + i * DX, y: 44 + r * DY + R })
  })
  return { pts, width, height: 44 + rows.length * DY + R / 2 + 4 }
}

/**
 * checkins: 이 사람의 이번 주 체크인(시간순). 앞에서부터 포도알을 채웁니다.
 * canAdd: 다음 빈 포도알을 눌러 붙일 수 있는지 (내 송이 + 이번 주)
 */
export default function GrapeCluster({ target, checkins, size = 1, canAdd, onAdd, onOpen }) {
  const gid = useId().replace(/:/g, '')
  const { pts, width, height } = layout(target)
  const filled = Math.min(checkins.length, target)

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

  return (
    <svg
      className="cluster"
      viewBox={`-4 0 ${width + 8} ${height}`}
      width={(width + 8) * size}
      height={height * size}
      role="img"
      aria-label={`Grapes ${filled}/${target}`}
    >
      <defs>
        <radialGradient id={`g${gid}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#B58BE8" />
          <stop offset="1" stopColor="#6B3FB5" />
        </radialGradient>
      </defs>
      {/* 줄기와 잎 */}
      <path d={`M${width / 2} 6 C${width / 2} 18 ${width / 2 - 3} 26 ${width / 2} 36`} stroke="#7A5A3A" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d={`M${width / 2 + 2} 22 C${width / 2 + 14} 6 ${width / 2 + 34} 8 ${width / 2 + 42} 16 C${width / 2 + 30} 30 ${width / 2 + 14} 30 ${width / 2 + 2} 22Z`} fill="#6DB36D" />

      {pts.map((p, i) => {
        const c = checkins[i]
        const isFilled = i < filled
        const isNext = !isFilled && i === filled && canAdd
        const handle = isFilled ? () => onOpen?.(c) : isNext ? onAdd : undefined
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
                <circle r={R} fill={`url(#g${gid})`} />
                <ellipse cx={-7} cy={-8} rx={5} ry={3.5} fill="#fff" opacity=".55" />
                {c?.mediaType && <circle cx={11} cy={11} r={5} fill="#fff" stroke="#6B3FB5" strokeWidth="2" />}
              </g>
            ) : (
              <>
                <circle r={R - 1} fill="#fff" stroke={isNext ? '#8E5BD6' : '#DCCFEC'} strokeWidth="2.5" strokeDasharray={isNext ? 'none' : '4 4'} />
                {isNext && <text y="6" textAnchor="middle" fontSize="18" fill="#8E5BD6" fontWeight="700">+</text>}
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
