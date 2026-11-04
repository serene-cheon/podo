import Avatar from './Avatar.jsx'
import { timeLabel } from '../lib/week.js'

// 포도알(모먼트) 크게 보기
export default function Viewer({ checkin, member, canRemove, onRemove, onClose }) {
  const c = checkin
  return (
    <div className="viewer" onClick={onClose}>
      <div className="viewer-card" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-head">
          <Avatar name={member?.name} photo={member?.photo} size={32} />
          <div>
            <b>{member?.name || '알 수 없음'}</b>
            <small>{timeLabel(c.createdAt)}</small>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        {c.mediaType && c.mediaUrl && (
          c.mediaType === 'video'
            ? <video className="viewer-media" src={c.mediaUrl} autoPlay loop playsInline muted />
            : <img className="viewer-media" src={c.mediaUrl} alt="" />
        )}
        {c.mediaType && !c.mediaUrl && <div className="viewer-empty">미디어를 불러올 수 없어요</div>}
        {!c.mediaType && <div className="viewer-empty big">🍇</div>}
        {c.note && <p className="viewer-note">{c.note}</p>}
        {canRemove && <button className="btn ghost danger" onClick={onRemove}>포도알 떼기</button>}
      </div>
    </div>
  )
}
