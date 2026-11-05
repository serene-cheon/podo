import { useEffect, useState } from 'react'
import { toast } from '../components/Toast.jsx'
import Avatar from '../components/Avatar.jsx'
import { SproutDoodle } from '../components/Doodle.jsx'

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
    try { await api.joinRoom(user, id) } catch (e) { toast('Could not join: ' + (e.message || e)); setBusy(false) }
  }

  return (
    <main className="page center-page">
      {room === undefined && <p className="muted">Loading…</p>}
      {room === null && (
        <>
          <SproutDoodle size={80} />
          <p>No room found for code <b>{id}</b></p>
          <a className="btn ghost" href="#/">Go home</a>
        </>
      )}
      {room && (
        <div className="join-card">
          <p className="mono muted">you're invited to</p>
          <h1>{room.name}</h1>
          <p className="goal-line"><span className="mono muted">goal</span> {room.goal} <span className="mono muted">· {room.target}×/week</span></p>
          <div className="stack big">
            {room.memberIds.map((m) => <Avatar key={m} {...room.members[m]} size={36} />)}
          </div>
          <p className="muted small">{room.memberIds.length} {room.memberIds.length === 1 ? 'person is' : 'people are'} in</p>
          {room.memberIds.length >= MAX_MEMBERS
            ? <p>This room is full ({MAX_MEMBERS} people)</p>
            : <button className="btn primary block" onClick={join} disabled={busy}>{busy ? 'Joining…' : '🍇 Join'}</button>}
          <a className="muted small" href="#/">Cancel</a>
        </div>
      )}
    </main>
  )
}
