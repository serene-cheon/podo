import { useEffect, useLayoutEffect, useRef } from 'react'
import Avatar from './Avatar.jsx'
import { timeLabel } from '../lib/week.js'

const EASE = 'cubic-bezier(.2,.9,.3,1.04)'

// 포도알을 누르면 그 자리에서 동그라미 → 네모 카드로 펼쳐짐. 닫으면 다시 포도알로 쏙.
export default function Viewer({ checkin, member, goal, color, isMe, from, canRemove, onRemove, onClose }) {
  const c = checkin
  const cardRef = useRef(null)
  const backRef = useRef(null)
  const closing = useRef(false)
  const blobRef = useRef(null)
  const innerRef = useRef(null)

  // 포도알 위치(from) → 카드 최종 위치로 변환
  const fromTransform = () => {
    const card = cardRef.current?.getBoundingClientRect()
    if (!from || !card) return 'scale(.4)'
    const dx = from.left + from.width / 2 - (card.left + card.width / 2)
    const dy = from.top + from.height / 2 - (card.top + card.height / 2)
    const s = Math.max(from.width / card.width, 0.06)
    return `translate(${dx}px, ${dy}px) scale(${s})`
  }

  // 떼는 순간: 포도색 동그라미가 퍼졌다가 → 네모로 통통 → 내용이 스르륵
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el?.animate) return
    const from0 = fromTransform()
    el.animate(
      [
        { transform: from0, borderRadius: '50%' },
        { transform: 'scale(.82)', borderRadius: '50%', offset: 0.42 },
        { transform: 'scale(1.06, .97)', borderRadius: '34px', offset: 0.68 },
        { transform: 'scale(.98, 1.02)', borderRadius: '24px', offset: 0.84 },
        { transform: 'none', borderRadius: '26px' },
      ],
      { duration: 620, easing: 'cubic-bezier(.25,.8,.35,1)' },
    )
    blobRef.current?.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { duration: 760, fill: 'forwards' })
    innerRef.current?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 0, offset: 0.5 }, { opacity: 1, transform: 'none' }], { duration: 760, easing: 'ease-out' })
    backRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function close() {
    if (closing.current) return
    closing.current = true
    const el = cardRef.current
    if (!el?.animate) return onClose()
    innerRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' })
    blobRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'forwards' })
    el.animate(
      [
        { transform: 'none', borderRadius: '26px' },
        { transform: 'scale(.9)', borderRadius: '50%', offset: 0.35 },
        { transform: fromTransform(), borderRadius: '50%' },
      ],
      { duration: 380, easing: 'cubic-bezier(.55,0,.7,.4)', fill: 'forwards' },
    ).onfinish = onClose
    backRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'forwards' })
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const hasMedia = c.mediaType && c.mediaUrl
  const wash = isMe ? color?.me : color?.friend
  const meta = (
    <div className="pv-meta">
      <Avatar name={member?.name} photo={member?.photo} size={30} />
      <div>
        <b>{isMe ? 'You' : member?.name || 'Unknown'}</b>
        <small>{timeLabel(c.createdAt)}{goal ? ` · ${goal}` : ''}</small>
      </div>
    </div>
  )

  return (
    <div className="pv" onClick={close}>
      <div className="pv-back" ref={backRef} />
      <div className="pv-wrap">
        <div
          ref={cardRef}
          className={`pv-card ${hasMedia ? 'media' : 'note'}`}
          onClick={(e) => e.stopPropagation()}
          style={!hasMedia && wash ? { background: `radial-gradient(120% 120% at 30% 25%, ${wash[0]}, ${wash[1]})` } : undefined}
        >
          <div className="pv-inner" ref={innerRef}>
            {hasMedia && (c.mediaType === 'video'
              ? <video src={c.mediaUrl} autoPlay loop playsInline muted />
              : <img src={c.mediaUrl} alt="" />)}
            {hasMedia ? (
              <div className="pv-overlay">
                {c.note && <p className="pv-note-sm">{c.note}</p>}
                {meta}
              </div>
            ) : (
              <>
                <div className="pv-body">
                  {c.note
                    ? <p className={`pv-note ${c.note.length > 30 ? 'long' : ''}`}>“{c.note}”</p>
                    : <span className="pv-grape" style={wash ? { background: `radial-gradient(circle at 38% 34%, #fff8, transparent 30%), radial-gradient(circle at 40% 38%, ${wash[0]}, ${wash[1]})` } : undefined} />}
                  {c.mediaType && !c.mediaUrl && <small className="pv-missing">couldn't load the {c.mediaType}</small>}
                </div>
                {meta}
              </>
            )}
            <button className="pv-close" onClick={close} aria-label="Close">✕</button>
          </div>
          {/* 포도알 색 그대로 퍼지는 덩어리 */}
          <div
            className="pv-blob"
            ref={blobRef}
            style={{ background: wash ? `radial-gradient(circle at 36% 32%, #ffffff70, transparent 26%), radial-gradient(circle at 42% 40%, ${wash[0]}, ${wash[1]})` : 'var(--grape-soft)' }}
          />
        </div>
        {canRemove && <button className="pv-remove" onClick={(e) => { e.stopPropagation(); onRemove() }}>remove grape</button>}
      </div>
    </div>
  )
}
