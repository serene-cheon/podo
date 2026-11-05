import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar.jsx'
import Sheet from '../components/Sheet.jsx'
import { toast } from '../components/Toast.jsx'
import { normalizeCode } from '../lib/code.js'
import { isDemo } from '../lib/api.js'

export default function Home({ api, user }) {
  const [rooms, setRooms] = useState(null)
  const [sheet, setSheet] = useState(null) // 'create' | 'join'
  useEffect(() => api.watchMyRooms(user.uid, setRooms), [api, user.uid])

  return (
    <main className="page">
      <header className="topbar">
        <h1 className="brand"><img src="/icon.svg" alt="" width="28" height="28" /> podoit</h1>
        <button className="icon-btn" onClick={() => confirm('Sign out?') && api.signOut()} aria-label="Sign out">
          <Avatar name={user.name} photo={user.photo} size={32} />
        </button>
      </header>
      {isDemo && <p className="demo-banner">Demo mode · two pretend friends join any room you create</p>}

      <section className="room-list">
        {rooms === null && <p className="muted center">Loading…</p>}
        {rooms?.length === 0 && (
          <div className="empty">
            <div className="empty-emoji">🍇</div>
            <p>No rooms yet.<br />Create one and invite your friends!</p>
          </div>
        )}
        {rooms?.map((r) => (
          <a key={r.id} className="room-card" href={`#/room/${r.id}`}>
            <div>
              <b>{r.name}</b>
              <span className="muted">🎯 {r.goal} · {r.target}×/week</span>
            </div>
            <div className="stack">
              {r.memberIds.slice(0, 4).map((id) => <Avatar key={id} {...r.members[id]} size={26} />)}
              {r.memberIds.length > 4 && <span className="more">+{r.memberIds.length - 4}</span>}
            </div>
          </a>
        ))}
      </section>

      <div className="bottom-actions">
        <button className="btn ghost" onClick={() => setSheet('join')}>Join with code</button>
        <button className="btn primary" onClick={() => setSheet('create')}>+ New room</button>
      </div>

      {sheet === 'create' && <CreateSheet api={api} user={user} onClose={() => setSheet(null)} />}
      {sheet === 'join' && <JoinSheet onClose={() => setSheet(null)} />}
    </main>
  )
}

function CreateSheet({ api, user, onClose }) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [target, setTarget] = useState(3)
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const id = await api.createRoom(user, { name: name.trim(), goal: goal.trim(), target })
      location.hash = `#/room/${id}`
    } catch (err) {
      toast('Could not create: ' + (err.message || err))
      setBusy(false)
    }
  }
  return (
    <Sheet title="New room" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Room name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Glow-up crew" maxLength={30} required autoFocus />
        </label>
        <label>Shared goal
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Work out 30 min" maxLength={40} required />
        </label>
        <div className="label">How many times a week?</div>
        <div className="chips">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button type="button" key={n} className={n === target ? 'on' : ''} onClick={() => setTarget(n)}>{n}</button>
          ))}
        </div>
        <p className="muted small">Each person fills {target} grape{target > 1 ? 's' : ''} a week to finish their bunch!</p>
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
      </form>
    </Sheet>
  )
}

function JoinSheet({ onClose }) {
  const [code, setCode] = useState('')
  return (
    <Sheet title="Join with code" onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); location.hash = `#/join/${code}` }}>
        <input className="code-input" value={code} onChange={(e) => setCode(normalizeCode(e.target.value))} placeholder="ABC123" autoFocus inputMode="text" autoCapitalize="characters" />
        <button className="btn primary block" disabled={code.length !== 6}>Next</button>
      </form>
    </Sheet>
  )
}
