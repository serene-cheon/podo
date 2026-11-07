import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { timeLabel } from '../lib/week.js'
import { useTheme } from '../lib/theme.js'
import { SQ } from './GrapeCluster.jsx'

// 포도알 하나가 끊김 없이 모양만 바뀌는 인터랙션
//   grape(동그라미, 포도알 자리) → press(그 자리에서 둥근 네모로 커짐, 안의 사진/메모가 보임)
//   → open(화면 가득 펼쳐짐) → 닫으면 다시 grape 로 쏙
// 곡선: 빠르게 출발해서 부드럽게 멈춤(iOS 느낌, 튕김 없음) / 되돌아갈 땐 부드럽게 가속→감속
const GROW = 'cubic-bezier(.32,.72,0,1)'
const OPEN = 'cubic-bezier(.32,.72,0,1)'
const BACK = 'cubic-bezier(.65,0,.35,1)'

function boxes(rect, tall, square) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const d = Math.min(rect.width, rect.height)
  const grape = { x: cx - d / 2, y: cy - d / 2, w: d, h: d, r: square ? (d / 2) * SQ : d / 2 }
  // 누르면 원래 크기의 약 2.1배, 모서리는 20px 정도 (덜 둥글게)
  const s = Math.min(Math.max(d * 2.1, 108), 160)
  const press = {
    x: Math.min(Math.max(cx - s / 2, 10), vw - s - 10),
    y: Math.min(Math.max(cy - s / 2, 10), vh - s - 10),
    w: s, h: s, r: Math.round(s * 0.2), // 덜 각지게 (~29px)
  }
  const w = Math.min(vw - 24, 440)
  const h = tall ? Math.min(vh - 130, w * 1.3) : Math.min(w, vh - 130)
  const open = { x: (vw - w) / 2, y: Math.max(14, (vh - h) / 2 - 28), w, h, r: 30 }
  return { grape, press, open }
}
const css = (b) => ({ left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, borderRadius: `${b.r}px` })

/**
 * item: { c(체크인), rect(시작 포도알 위치), color(골 색), isMine }
 * phase: 'press' | 'open' | 'cancel' | 'closing'
 */
export default function Bloom({ item, phase, member, goal, canRemove, onRemove, onClose, onDone }) {
  const { c, rect, color, isMine } = item
  const hasMedia = !!(c.mediaType && c.mediaUrl)
  const square = useTheme() === 'modern'
  const B = useMemo(() => boxes(rect, hasMedia, square), [rect, hasMedia, square])
  const target = phase === 'press' ? 'press' : phase === 'open' ? 'open' : 'grape'
  const elRef = useRef(null)
  const cur = useRef(null)
  const [shown, setShown] = useState('grape') // CSS 단계 (배경·글씨 페이드)

  useLayoutEffect(() => {
    const el = elRef.current
    const from = B[cur.current || 'grape']
    const to = B[target]
    Object.assign(el.style, css(to))
    const anim = el.animate?.([css(from), css(to)], {
      duration: target === 'press' ? 340 : target === 'open' ? 520 : 360,
      easing: target === 'press' ? GROW : target === 'open' ? OPEN : BACK,
    })
    cur.current = target
    const raf = requestAnimationFrame(() => setShown(target))
    if (target === 'grape') {
      if (anim) anim.onfinish = onDone
      else onDone()
    }
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, B])

  useEffect(() => {
    if (target !== 'open') return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, onClose])

  const wash = isMine ? color?.me : color?.friend
  const bg = wash ? wash[1] : 'var(--grape-soft)' // 포도알과 같은 단색

  return (
    <div className={`bloom bloom-${shown}`} onClick={target === 'open' ? onClose : undefined}>
      <div className="bloom-back" />
      <div ref={elRef} className="bloom-el" style={{ background: bg, ...css(B.grape) }} onClick={(e) => e.stopPropagation()}>
        {hasMedia && (c.mediaType === 'video'
          ? <video src={c.mediaUrl} autoPlay loop playsInline muted />
          : <img src={c.mediaUrl} alt="" draggable={false} />)}
        {!hasMedia && c.note && <p className={`bloom-note ${c.note.length > 30 ? 'long' : ''}`}>{c.note}</p>}
        <div className={`bloom-info ${hasMedia ? 'on-media' : ''}`}>
          {hasMedia && c.note && <p className="bloom-note-sm">{c.note}</p>}
          <div className="pv-meta">
            <Avatar name={member?.name} photo={member?.photo} size={30} />
            <div>
              <b>{isMine ? 'You' : member?.name || 'Unknown'}</b>
              <small>{timeLabel(c.createdAt)}{goal ? ` · ${goal}` : ''}</small>
            </div>
          </div>
        </div>
        <button className="bloom-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      {canRemove && (
        <button
          className="bloom-remove"
          style={{ top: `${B.open.y + B.open.h + 14}px` }}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
        >
          remove grape
        </button>
      )}
    </div>
  )
}
