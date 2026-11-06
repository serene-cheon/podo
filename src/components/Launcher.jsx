import { useRef, useState } from 'react'
import { DoodleIcon } from './Doodle.jsx'

// 포도알 발사 버튼: 꾹 누르면 위로 옵션이 펼쳐지고, 원하는 옵션으로 끌어서 놓으면 선택.
// 짧게 톡 누르면 옵션이 열린 채로 남아서 눌러서 고를 수도 있어요.
const OPTIONS = [
  { id: 'photo', label: 'photo', icon: 'photo', angle: -158 },
  { id: 'video', label: '3s video', icon: 'video', angle: -114 },
  { id: 'note', label: 'note', icon: 'note', angle: -66 },
  { id: 'just', label: 'just add', icon: 'grape', angle: -22 },
]
const RADIUS = 112
const HIT = 46
const pos = (a) => ({ x: Math.cos((a * Math.PI) / 180) * RADIUS, y: Math.sin((a * Math.PI) / 180) * RADIUS })

export default function Launcher({ color, onChoose, buttonRef }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('drag') // drag: 끌어서 고르기, tap: 열린 채로 눌러 고르기
  const [hover, setHover] = useState(null)
  const start = useRef(null)

  const center = () => {
    const r = buttonRef.current.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  const optionAt = (x, y) => {
    const c = center()
    let best = null
    let bestD = HIT
    for (const o of OPTIONS) {
      const p = pos(o.angle)
      const d = Math.hypot(x - (c.x + p.x), y - (c.y + p.y))
      if (d < bestD) { bestD = d; best = o.id }
    }
    return best
  }

  const close = () => { setOpen(false); setHover(null); start.current = null }
  const choose = (id) => { close(); navigator.vibrate?.(12); onChoose(id) }

  const down = (e) => {
    if (open && mode === 'tap') return close()
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* Safari 등 */ }
    start.current = { x: e.clientX, y: e.clientY }
    setMode('drag')
    setOpen(true)
    navigator.vibrate?.(8)
  }
  const move = (e) => {
    if (!start.current) return
    const h = optionAt(e.clientX, e.clientY)
    if (h !== hover) { setHover(h); if (h) navigator.vibrate?.(6) }
  }
  const up = (e) => {
    if (!start.current) return
    const h = optionAt(e.clientX, e.clientY)
    const moved = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y)
    start.current = null
    if (h) return choose(h)
    if (moved < 10) { setMode('tap'); setHover(null); return } // 짧게 톡: 열어둔 채로
    close()
  }

  return (
    <>
      {open && <div className="launch-back" onClick={close} />}
      <div className={`launcher ${open ? 'open' : ''}`} style={{ '--lc': color.me[1], '--lc0': color.me[0] }}>
        {OPTIONS.map((o, i) => {
          const p = pos(o.angle)
          return (
            <button
              key={o.id}
              type="button"
              className={`launch-opt ${hover === o.id ? 'hover' : ''}`}
              style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, transitionDelay: open ? `${i * 35}ms` : '0ms' }}
              onClick={() => mode === 'tap' && choose(o.id)}
              tabIndex={open ? 0 : -1}
              aria-label={o.label}
            >
              <span className="launch-ic"><DoodleIcon name={o.icon} size={26} /></span>
              <small>{o.label}</small>
            </button>
          )
        })}
        <button
          ref={buttonRef}
          type="button"
          className="launch-btn"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={close}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode('tap'); setOpen((o) => !o) } }}
          aria-label="Shoot a grape"
          aria-expanded={open}
        >
          <span className="launch-grape" />
          <svg className="launch-plus" width="22" height="22" viewBox="0 0 22 22" aria-hidden><path d="M11 4v14M4 11h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
      </div>
    </>
  )
}

// 발사된 포도알: 버튼에서 아래로 쭉 당겨졌다가 → 튕겨 올라 → 곡선을 그리며 날아가 → 빈 칸에 철퍽
export function Flyer({ from, to, color, waiting, onLanded }) {
  const ref = useRef(null)
  const started = useRef(false)
  const setRef = (el) => {
    ref.current = el
    if (!el || started.current || !el.animate) return
    started.current = true
    const fx = from.left + from.width / 2 - (to.left + to.width / 2)
    const fy = from.top + from.height / 2 - (to.top + to.height / 2)
    const s0 = Math.max(0.5, (from.width * 0.7) / to.width)
    const side = fx > 0 ? -1 : 1 // 목표 쪽으로 휘어 올라가는 곡선
    el.animate([
      { transform: `translate(${fx}px, ${fy}px) scale(${s0 * 0.4})`, offset: 0 },
      { transform: `translate(${fx}px, ${fy}px) scale(${s0})`, offset: 0.12 },
      { transform: `translate(${fx}px, ${fy + 22}px) scale(${s0 * 1.14}, ${s0 * 0.8})`, offset: 0.3, easing: 'cubic-bezier(.2,0,.1,1)' }, // 당기기
      { transform: `translate(${fx}px, ${fy - 14}px) scale(${s0 * 0.86}, ${s0 * 1.18})`, offset: 0.4 }, // 튕김
      { transform: `translate(${fx * 0.55 + side * 30}px, ${fy * 0.42}px) scale(1.02)`, offset: 0.68 },
      { transform: 'translate(0px, 0px) scale(1.18, .84)', offset: 0.9 }, // 철퍽
      { transform: 'none', offset: 1 },
    ], { duration: 980, easing: 'cubic-bezier(.3,.6,.35,1)' }).onfinish = () => { navigator.vibrate?.(16); onLanded() }
  }
  return (
    <div
      ref={setRef}
      className={`flyer ${waiting ? 'waiting' : ''}`}
      style={{
        left: to.left, top: to.top, width: to.width, height: to.height,
        background: `radial-gradient(circle at 34% 30%, #ffffff88, transparent 34%), radial-gradient(circle at 42% 40%, ${color.me[0]}, ${color.me[1]})`,
      }}
    />
  )
}
