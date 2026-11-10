import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

// 초대 링크 QR (SVG, 둥근 모듈)
export default function QRCode({ value, size = 180, color = '#17151C' }) {
  const { n, d } = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(value)
    q.make()
    const n = q.getModuleCount()
    // 모서리 3개 찾기 무늬는 둥근 네모로, 나머지 칸은 살짝 둥근 네모로 (인식 잘 되게 꽉 채움)
    const finder = (x, y) => x < 7 && y < 7 ? [0, 0] : x >= n - 7 && y < 7 ? [n - 7, 0] : x < 7 && y >= n - 7 ? [0, n - 7] : null
    const rr = (x, y, w, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${w - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${w - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}Z`
    let d = ''
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && q.isDark(y, x)) d += rr(x + 0.04, y + 0.04, 0.92, 0.3)
    let f = ''
    for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      f += rr(fx, fy, 7, 2.2) + rr(fx + 1, fy + 1, 5, 1.4) // 바깥 고리
      f += rr(fx + 2, fy + 2, 3, 0.9)
    }
    d += f
    return { n, d }
  }, [value])
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label="Invite QR code" shapeRendering="geometricPrecision">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill={color} fillRule="evenodd" />
    </svg>
  )
}
