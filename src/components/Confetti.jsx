// 팀 포도송이 완성 축하
export default function Confetti() {
  const items = Array.from({ length: 28 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.8 + Math.random() * 1.4,
    size: 18 + Math.random() * 18,
    ch: i % 4 === 0 ? '🎉' : i % 5 === 0 ? '✨' : '🍇',
  }))
  return (
    <div className="confetti" aria-hidden>
      {items.map((it, i) => (
        <span key={i} style={{ left: `${it.left}%`, animationDelay: `${it.delay}s`, animationDuration: `${it.dur}s`, fontSize: it.size }}>{it.ch}</span>
      ))}
    </div>
  )
}
