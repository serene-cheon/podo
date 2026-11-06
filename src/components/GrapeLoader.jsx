// 로딩: 크기가 다른 포도알 다섯 개가 한 송이로 데굴 구르며 자리를 바꾸고, 알마다 숨 쉬듯 출렁
const W = 120
const DOTS = [
  // x, y, 지름, 색  (오른쪽 위에 큰 알 → 좌우가 뒤집힌 모양으로 계속 오가요)
  [80, 30, 46, '#7F5FCF', -22],
  [55, 66, 30, '#9B7FE0', 20],
  [42, 40, 22, '#B79CEC', -26],
  [30, 64, 18, '#C9B5EE', 22],
  [18, 46, 11, '#DCCFF5', -14],
]

export default function GrapeLoader({ label }) {
  return (
    <div className="gloader" role="status" aria-label={label || 'Loading'}>
      <div className="gloader-box" style={{ width: W, height: 92 }}>
        {DOTS.map(([x, y, d, c], i) => (
          <span
            key={i}
            style={{
              left: x - d / 2, top: y - d / 2, width: d, height: d, background: c,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      {label && <p className="mono muted">{label}</p>}
    </div>
  )
}
