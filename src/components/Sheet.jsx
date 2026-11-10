import { useEffect, useRef } from 'react'

// 아래에서 올라오는 시트. 위 손잡이(또는 맨 위까지 스크롤된 상태에서 본문)를 아래로 끌면 닫혀요.
export default function Sheet({ title, onClose, children }) {
  const sheetRef = useRef(null)
  const backRef = useRef(null)
  const drag = useRef(null)

  const set = (y, anim) => {
    const s = sheetRef.current
    const b = backRef.current
    if (!s) return
    s.style.transition = anim ? 'transform .28s cubic-bezier(.32,.72,0,1)' : 'none'
    s.style.transform = y ? `translateY(${y}px)` : ''
    if (b) {
      b.style.transition = anim ? 'background-color .28s' : 'none'
      b.style.backgroundColor = y ? `rgba(20,16,28,${Math.max(0, 0.32 * (1 - y / s.offsetHeight))})` : ''
    }
  }
  const start = (y, fromHandle) => {
    const s = sheetRef.current
    if (!s || (!fromHandle && s.scrollTop > 0)) return
    drag.current = { y0: y, dy: 0, t: performance.now(), v: 0, active: fromHandle }
  }
  // true 를 돌려주면 이번 움직임은 시트 끌기 (스크롤 막기)
  const move = (y) => {
    const d = drag.current
    if (!d) return false
    const dy = y - d.y0
    if (!d.active) {
      if (dy < -4) { drag.current = null; return false } // 위로 = 평소 스크롤
      if (dy < 6) return false
      d.active = true
    }
    const now = performance.now()
    const ndy = Math.max(0, dy)
    d.v = (ndy - d.dy) / Math.max(1, now - d.t)
    d.dy = ndy
    d.t = now
    set(ndy, false)
    return true
  }
  const end = () => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    const h = sheetRef.current?.offsetHeight || 600
    if (d.dy > Math.min(140, h * 0.3) || d.v > 0.6) {
      set(h + 40, true)
      setTimeout(onClose, 240)
    } else set(0, true)
  }

  // 터치: 본문에서도 (맨 위일 때) 끌 수 있게
  const onTouchStart = (e) => start(e.touches[0].clientY, !!e.target.closest?.('.sheet-grab'))
  const moveRef = useRef(move)
  moveRef.current = move
  // React 의 touchmove 는 passive 라 스크롤을 못 막아서, 직접 붙임
  useEffect(() => {
    const s = sheetRef.current
    const fn = (e) => { if (moveRef.current(e.touches[0].clientY) && e.cancelable) e.preventDefault() }
    s.addEventListener('touchmove', fn, { passive: false })
    return () => s.removeEventListener('touchmove', fn)
  }, [])
  // 마우스: 손잡이만
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    start(e.clientY, true)
  }

  return (
    <div className="backdrop" ref={backRef} onClick={onClose}>
      <div
        className="sheet"
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={end}
        onTouchCancel={end}
        role="dialog"
        aria-label={title}
      >
        <div
          className="sheet-grab"
          onPointerDown={onPointerDown}
          onPointerMove={(e) => e.pointerType === 'mouse' && move(e.clientY)}
          onPointerUp={(e) => e.pointerType === 'mouse' && end()}
        >
          <div className="sheet-handle" />
          {title && <h2>{title}</h2>}
        </div>
        {children}
      </div>
    </div>
  )
}
