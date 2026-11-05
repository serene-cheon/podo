import Avatar from './Avatar.jsx'
import { timeLabel } from '../lib/week.js'

// 포도알(모먼트) 크게 보기
export default function Viewer({ checkin, member, goal, canRemove, onRemove, onClose }) {
  const c = checkin
  return (
    <div className="viewer" onClick={onClose}>
      <div className="viewer-card" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-head">
          <Avatar name={member?.name} photo={member?.photo} size={32} />
          <div>
            <b>{member?.name || 'Unknown'}</b>
            <small>{timeLabel(c.createdAt)}{goal ? ` · ${goal}` : ''}</small>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {c.mediaType && c.mediaUrl && (
          c.mediaType === 'video'
            ? <video className="viewer-media" src={c.mediaUrl} autoPlay loop playsInline muted />
            : <img className="viewer-media" src={c.mediaUrl} alt="" />
        )}
        {c.mediaType && !c.mediaUrl && <div className="viewer-empty">Couldn't load media</div>}
        {!c.mediaType && <div className="viewer-empty big">🍇</div>}
        {c.note && <p className="viewer-note">{c.note}</p>}
        {canRemove && <button className="btn ghost danger" onClick={onRemove}>Remove grape</button>}
      </div>
    </div>
  )
}
