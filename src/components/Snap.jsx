import { useEffect, useRef, useState } from 'react'
import { SQ, GRAPE_PX } from './GrapeCluster.jsx'

// 하단 + 버튼: 누르면 Snap Now / Snap Later 두 버튼이 떠요.
export function SnapBar({ open, setOpen, onSnapNow, onSnapLater, buttonRef }) {
  return (
    <>
      {open && <div className="snap-back" onClick={() => setOpen(false)} />}
      <div className={`snapbar ${open ? 'open' : ''}`}>
        <button type="button" className="snap-opt left" tabIndex={open ? 0 : -1} onClick={() => { setOpen(false); onSnapNow() }}>Snap Now</button>
        <button type="button" className="snap-opt right" tabIndex={open ? 0 : -1} onClick={() => { setOpen(false); onSnapLater() }}>Snap Later</button>
        <button ref={buttonRef} type="button" className="snap-plus" onClick={() => setOpen(!open)} aria-label="Snap a grape" aria-expanded={open}>
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
    </>
  )
}

const SIZE = GRAPE_PX

/**
 * 찍은 사진이 포도알이 되어 떠 있고, 끌어다 빈 칸에 놓으면 그 칸에 들어가요.
 * from: 처음 튀어나올 위치(하단 + 버튼), getSlots(): [{ i, rect }], onHot(i|null), onPlace(i) → Promise
 */
export function PlaceGrape({ url, color, from, getSlots, onHot, onPlace, onCancel }) {
  const rest = () => ({ x: 28 + SIZE / 2, y: window.innerHeight - 130 })
  const [pos, setPos] = useState(rest)
  const [mode, setMode] = useState('rest') // rest | drag | snap | back
  const [size, setSize] = useState(SIZE)
  const elRef = useRef(null)
  const drag = useRef(null)
  const hot = useRef(null)

  // 하단 + 버튼에서 포도알이 퐁 튀어나와 왼쪽 아래에 둥실
  useEffect(() => {
    const el = elRef.current
    if (!el?.animate || !from) return
    const r = rest()
    const fx = from.left + from.width / 2 - r.x
    const fy = from.top + from.height / 2 - r.y
    el.animate([
      { transform: `translate(${fx}px, ${fy}px) scale(.3)`, opacity: 0 },
      { transform: `translate(${fx * 0.4}px, ${fy * 0.4 - 40}px) scale(.9)`, opacity: 1, offset: 0.55 },
      { transform: 'translate(0, 0) scale(1.08)', offset: 0.85 },
      { transform: 'none' },
    ], { duration: 620, easing: 'cubic-bezier(.3,.7,.3,1)' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hitTest = (x, y) => {
    let best = null
    let bestD = Infinity
    for (const s of getSlots()) {
      const cx = s.rect.left + s.rect.width / 2
      const cy = s.rect.top + s.rect.height / 2
      const d = Math.hypot(x - cx, y - cy)
      if (d < s.rect.width * 0.8 && d < bestD) { bestD = d; best = s }
    }
    return best
  }

  const down = (e) => {
    if (mode === 'snap') return
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* Safari 등 */ }
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    setMode('drag')
    navigator.vibrate?.(8)
  }
  const move = (e) => {
    if (!drag.current) return
    const x = e.clientX - drag.current.dx
    const y = e.clientY - drag.current.dy
    setPos({ x, y })
    const h = hitTest(x, y)
    const hi = h ? h.i : null
    if (hi !== hot.current) {
      hot.current = hi
      onHot(hi)
      if (hi !== null) navigator.vibrate?.(6)
    }
  }
  const up = async () => {
    if (!drag.current) return
    drag.current = null
    const h = hot.current !== null ? getSlots().find((s) => s.i === hot.current) : null
    if (!h) { setMode('back'); setPos(rest()); return }
    // 칸에 쏙: 칸 크기로 줄어들며 들어가요
    setMode('snap')
    setSize(h.rect.width)
    setPos({ x: h.rect.left + h.rect.width / 2, y: h.rect.top + h.rect.height / 2 })
    navigator.vibrate?.(16)
    try { await onPlace(h.i) } catch { setMode('back'); setSize(SIZE); setPos(rest()); onHot(null); hot.current = null }
  }

  return (
    <>
      <div className={`place-hint ${mode === 'drag' || mode === 'snap' ? 'hide' : ''}`}>
        <span>drag your grape into the bunch</span>
        <button type="button" onClick={onCancel} aria-label="Discard photo">✕</button>
      </div>
      <div
        ref={elRef}
        className={`place-grape ${mode}`}
        style={{
          left: pos.x - size / 2, top: pos.y - size / 2, width: size, height: size,
          borderRadius: size * 0.5 * SQ,
          backgroundImage: `url(${url})`,
          '--pc': color.me[1],
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="button"
        aria-label="Drag this grape into an empty spot"
      />
    </>
  )
}
