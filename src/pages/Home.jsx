import { useCallback, useEffect, useState } from 'react'
import GrapeCluster from '../components/GrapeCluster.jsx'
import Avatar from '../components/Avatar.jsx'
import Sheet from '../components/Sheet.jsx'
import { toast } from '../components/Toast.jsx'
import { normalizeCode } from '../lib/code.js'
import { isDemo, BUILD } from '../lib/api.js'
import { weekKey, weekLabel, daysLeft, weekStart } from '../lib/week.js'
import { SproutDoodle } from '../components/Doodle.jsx'
import GoalsEditor from '../components/GoalsEditor.jsx'
import { goalsOf, goalIdOf, cleanGoals, newGoalId } from '../lib/goals.js'

export default function Home({ api, user }) {
  const [rooms, setRooms] = useState(null)
  const [sheet, setSheet] = useState(null) // 'create' | 'join' | 'profile'
  useEffect(() => api.watchMyRooms(user.uid, setRooms), [api, user.uid])

  return (
    <main className="page">
      <header className="topbar">
        <h1 className="brand-hand">podoit</h1>
        <button className="icon-btn" onClick={() => setSheet('profile')} aria-label="Profile">
          <Avatar name={user.name} photo={user.photo} size={32} />
        </button>
      </header>
      {isDemo && <p className="demo-banner">Demo mode · two pretend friends join any room you create</p>}

      {rooms?.length > 0 && <MyBunch api={api} user={user} rooms={rooms} />}

      <section className="room-list">
        {rooms === null && <p className="muted center">Loading…</p>}
        {rooms?.length === 0 && (
          <div className="empty">
            <SproutDoodle size={96} />
            <h2>Start your first podo.</h2>
            <p className="mono">create a room · invite friends · fill grapes</p>
          </div>
        )}
        {rooms?.length > 0 && <h2 className="label-mono">my challenges</h2>}
        {rooms?.map((r) => (
          <a key={r.id} className="room-card" href={`#/room/${r.id}`}>
            <div className="room-info">
              <b>{r.name}</b>
              <span className="mono muted">
                {goalsOf(r).length > 1 ? goalsOf(r).map((g) => g.title).join(' · ') : `${goalsOf(r)[0].title} · ${goalsOf(r)[0].target}×/week`}
              </span>
            </div>
            <div className="stack">
              {r.memberIds.slice(0, 3).map((id) => <Avatar key={id} {...r.members[id]} size={24} />)}
              {r.memberIds.length > 3 && <span className="more">+{r.memberIds.length - 3}</span>}
            </div>
            <span className="arrow" aria-hidden>→</span>
          </a>
        ))}
      </section>

      <div className="bottom-actions">
        <button className="btn ghost" onClick={() => setSheet('join')}>join with code</button>
        <button className="btn primary" onClick={() => setSheet('create')}>+ new room</button>
      </div>

      {sheet === 'create' && <CreateSheet api={api} user={user} onClose={() => setSheet(null)} />}
      {sheet === 'join' && <JoinSheet onClose={() => setSheet(null)} />}
      {sheet === 'profile' && <ProfileSheet api={api} user={user} onClose={() => setSheet(null)} />}
    </main>
  )
}

// 방마다 이번 주 내 체크인을 구독해서 위로 올려줌 (화면에는 안 보임)
function MyCheckinsWatcher({ api, user, roomId, onMine }) {
  useEffect(() => api.watchCheckins(roomId, weekKey(), (list) =>
    onMine(roomId, list.filter((c) => c.uid === user.uid))), [api, user.uid, roomId, onMine])
  return null
}

// 홈: 내 모든 챌린지를 합친 이번 주 포도송이
function MyBunch({ api, user, rooms }) {
  const [mineByRoom, setMineByRoom] = useState({})
  const onMine = useCallback((id, list) => setMineByRoom((m) => ({ ...m, [id]: list })), [])
  const week = weekKey()
  // 모든 방의 모든 골: 골마다 목표 개수까지만 세고, 붙인 시간순으로 송이를 채움
  const allGoals = rooms.flatMap((r) => goalsOf(r).map((g) => ({ room: r, goal: g })))
  const mineOf = ({ room, goal }) => (mineByRoom[room.id] || [])
    .filter((c) => goalIdOf(c, goalsOf(room)) === goal.id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, goal.target)
  const total = allGoals.reduce((s, x) => s + x.goal.target, 0)
  const colorById = {}
  const filled = allGoals
    .flatMap((x) => mineOf(x).map((c) => { colorById[c.id] = x.goal.color; return c }))
    .sort((a, b) => a.createdAt - b.createdAt)
  const doneGoals = allGoals.filter((x) => mineOf(x).length >= x.goal.target).length
  const left = daysLeft(week)
  const complete = total > 0 && filled.length >= total
  return (
    <section className={`my-bunch ${complete ? 'complete' : ''}`}>
      {rooms.map((r) => <MyCheckinsWatcher key={r.id} api={api} user={user} roomId={r.id} onMine={onMine} />)}
      <div className="my-bunch-head">
        <h2>{complete ? 'My podo is complete!' : 'My podo'}</h2>
        <span className="mono muted">{weekLabel(week).toLowerCase()}</span>
      </div>
      <GrapeCluster target={total} checkins={filled} size={1} maxWidth={240} colorOfCheckin={(c) => colorById[c.id] ?? 0} />
      <p className="big-count"><b>{filled.length}</b><span>/{total}</span></p>
      <p className="mono muted">
        {doneGoals} of {allGoals.length} {allGoals.length === 1 ? 'goal' : 'goals'} done
        {!complete && ` · ${left} day${left === 1 ? '' : 's'} left`}
      </p>
      <WeekDots checkins={filled} />
    </section>
  )
}

// every day counts: 이번 주 요일마다 포도알을 붙였는지 점으로
function WeekDots({ checkins }) {
  const start = weekStart().getTime()
  const today = Math.floor((Date.now() - start) / 86400000)
  const days = new Set(checkins.map((c) => Math.floor((c.createdAt - start) / 86400000)))
  return (
    <div className="week-dots">
      <div className="dots">
        {['m', 't', 'w', 't', 'f', 's', 's'].map((d, i) => (
          <span key={i} className={`${days.has(i) ? 'on' : ''} ${i === today ? 'today' : ''}`}>
            <i />
            <small>{d}</small>
          </span>
        ))}
      </div>
      <p className="mono muted">every day counts</p>
    </div>
  )
}

// 프로필: 계정 정보 + 닉네임 변경 + 로그아웃
function ProfileSheet({ api, user, onClose }) {
  const [name, setName] = useState(user.name)
  const [busy, setBusy] = useState(false)
  const trimmed = name.trim()
  async function save(e) {
    e.preventDefault()
    if (!trimmed || trimmed === user.name) return onClose()
    setBusy(true)
    try {
      await api.updateName(user, trimmed)
      toast('Nickname saved')
      onClose()
    } catch (err) {
      toast('Could not save: ' + (err.message || err))
      setBusy(false)
    }
  }
  return (
    <Sheet title="Profile" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="profile-head">
          <Avatar name={trimmed || user.name} photo={user.photo} size={64} />
          <div>
            <b>{trimmed || user.name}</b>
            <span className="mono muted">{user.email || 'no email'}</span>
          </div>
        </div>
        <label>nickname
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required placeholder="what friends will see" />
        </label>
        <p className="mono muted small">shown on your grapes and in every room you're in</p>
        <div className="account-row">
          <span className="mono muted">account</span>
          <span className="mono">{isDemo ? 'demo account' : 'signed in with Google'}</span>
        </div>
        <button className="btn primary block" disabled={busy || !trimmed}>{busy ? 'saving…' : 'save'}</button>
        <button type="button" className="btn danger block" onClick={() => confirm('Sign out?') && api.signOut()}>sign out</button>
        <p className="mono muted center build-tag">build {BUILD} UTC</p>
      </form>
    </Sheet>
  )
}

function CreateSheet({ api, user, onClose }) {
  const [name, setName] = useState('')
  const [goals, setGoals] = useState(() => [{ id: newGoalId(), title: '', target: 3, color: 0 }])
  const [busy, setBusy] = useState(false)
  const clean = cleanGoals(goals)
  async function submit(e) {
    e.preventDefault()
    if (!clean.length) return
    setBusy(true)
    try {
      const id = await api.createRoom(user, { name: name.trim(), goals: clean })
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
        <div className="label">Shared goals</div>
        <GoalsEditor goals={goals} onChange={setGoals} />
        <p className="muted small">Each goal gets its own team podo. Everyone fills their grapes every week!</p>
        <button className="btn primary block" disabled={busy || !clean.length}>{busy ? 'Creating…' : 'Create'}</button>
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
