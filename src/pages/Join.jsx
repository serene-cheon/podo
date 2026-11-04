import { useEffect, useState } from 'react'
import { toast } from '../components/Toast.jsx'
import Avatar from '../components/Avatar.jsx'

const MAX_MEMBERS = 20

export default function Join({ api, user, id }) {
  const [room, setRoom] = useState(undefined)
  const [busy, setBusy] = useState(false)
  useEffect(() => api.watchRoom(id, setRoom), [api, id])
  useEffect(() => {
    if (room?.memberIds.includes(user.uid)) location.replace(`#/room/${id}`)
  }, [room, user.uid, id])

  async function join() {
    setBusy(true)
    try { await api.joinRoom(user, id) } catch (e) { toast('참여 실패: ' + (e.message || e)); setBusy(false) }
  }

  return (
    <main className="page center-page">
      {room === undefined && <p className="muted">불러오는 중…</p>}
      {room === null && (
        <>
          <div className="empty-emoji">🥲</div>
          <p>방 코드 <b>{id}</b>를 찾을 수 없어요</p>
          <a className="btn ghost" href="#/">홈으로</a>
        </>
      )}
      {room && (
        <div className="join-card">
          <p className="muted">초대받은 방</p>
          <h1>{room.name}</h1>
          <p className="goal-pill">🎯 {room.goal} · 주 {room.target}회</p>
          <div className="stack big">
            {room.memberIds.map((m) => <Avatar key={m} {...room.members[m]} size={36} />)}
          </div>
          <p className="muted small">{room.memberIds.length}명이 함께하고 있어요</p>
          {room.memberIds.length >= MAX_MEMBERS
            ? <p>방이 가득 찼어요 ({MAX_MEMBERS}명)</p>
            : <button className="btn primary block" onClick={join} disabled={busy}>{busy ? '참여 중…' : '🍇 참여하기'}</button>}
          <a className="muted small" href="#/">취소</a>
        </div>
      )}
    </main>
  )
}
