// 로딩: 포도알이 아래에서부터 뿅뿅뿅 하나씩 튀어 올라 송이가 되고, 잎이 퐁 → 다시 하나씩 쏙 들어가며 반복
const S = 22 // 알 크기
const G = 4 // 간격
const R = S * 0.5 * 27 / 34 // 포도알과 같은 스퀘어클 둥글기
const COLS = ['#7F5FCF', '#9B7FE0', '#B79CEC', '#8D6FD8', '#C9B5EE', '#A68BE6']
// 3-2-1 송이, 아래 알부터 올라가는 순서
const ROWS = [3, 2, 1]
const W = 3 * S + 2 * G
const TOP = 22
const grapes = []
ROWS.forEach((n, r) => {
  for (let i = 0; i < n; i++) grapes.push({ x: (W - (n * S + (n - 1) * G)) / 2 + i * (S + G), y: TOP + r * (S + G), r })
})
const order = [...grapes].sort((a, b) => b.r - a.r || a.x - b.x)

export default function GrapeLoader({ label }) {
  const H = TOP + 3 * S + 2 * G
  return (
    <div className="gloader" role="status" aria-label={label || 'Loading'}>
      <div className="gloader-box" style={{ width: W, height: H }}>
        {order.map((g, i) => (
          <span
            key={i}
            style={{ left: g.x, top: g.y, width: S, height: S, borderRadius: R, background: COLS[i % COLS.length], animationDelay: `${i * 0.11}s` }}
          />
        ))}
        <svg className="gloader-leaf" width={W} height={TOP + 2} viewBox={`0 0 ${W} ${TOP + 2}`} style={{ animationDelay: `${order.length * 0.11}s` }} aria-hidden>
          <path d={`M${W / 2} ${TOP + 1} C${W / 2} ${TOP - 6} ${W / 2 + 0.6} ${TOP - 10} ${W / 2 + 2.6} ${TOP - 13}`} stroke="#5B4636" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d={`M${W / 2 + 3.6} ${TOP - 13.4} A12 12 0 0 1 ${W / 2 + 21} ${TOP - 23.2} A12 12 0 0 1 ${W / 2 + 3.6} ${TOP - 13.4}Z`} fill="#8ACB9E" />
          <path d={`M${W / 2 + 3.6} ${TOP - 13.4} A12 12 0 0 1 ${W / 2 + 21} ${TOP - 23.2}Z`} fill="#6FB98A" />
        </svg>
      </div>
      {label && <p className="mono muted">{label}</p>}
    </div>
  )
}
