import { useCallback, useEffect, useRef, useState } from 'react'
import Logo from '../components/Logo.jsx'
import GrapeCluster, { GRAPE_SCALE, grapeMaxWidth } from '../components/GrapeCluster.jsx'
import Avatar from '../components/Avatar.jsx'
import Sheet from '../components/Sheet.jsx'
import { toast } from '../components/Toast.jsx'
import { normalizeCode } from '../lib/code.js'
import { isDemo, BUILD } from '../lib/api.js'
import { weekKey, weekLabel, daysLeft } from '../lib/week.js'
import { SproutDoodle } from '../components/Doodle.jsx'
import GoalsEditor from '../components/GoalsEditor.jsx'
import GrapeLoader from '../components/GrapeLoader.jsx'
import Bloom from '../components/Bloom.jsx'
import { goalsOf, goalIdOf, cleanGoals, newGoalId, targetFor } from '../lib/goals.js'
import { avatarToDataUrl } from '../lib/inlinePhoto.js'

export default function Home({ api, user }) {
  const [rooms, setRooms] = useState(null)
  const [sheet, setSheet] = useState(null) // 'create' | 'join' | 'profile'
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => api.watchMyRooms(user.uid, setRooms), [api, user.uid])

  return (
    <main className="page">
      <header className="topbar">
        <h1 className="brand-logo"><Logo height={28} /></h1>
        <div className="top-actions">
          <div className="add-menu-wrap">
            <button className={`add-room-btn ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen((o) => !o)} aria-label="New room or join" aria-expanded={menuOpen}>
              <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            {menuOpen && (
              <>
                <div className="add-menu-back" onClick={() => setMenuOpen(false)} />
                <div className="add-menu" role="menu">
                  <button role="menuitem" onClick={() => { setMenuOpen(false); setSheet('create') }}>Create new room</button>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); setSheet('join') }}>Join with code</button>
                </div>
              </>
            )}
          </div>
          <button className="icon-btn" onClick={() => setSheet('profile')} aria-label="Profile">
            <Avatar name={user.name} photo={user.photo} size={32} />
          </button>
        </div>
      </header>
      {isDemo && <p className="demo-banner">Demo mode · two pretend friends join any room you create</p>}

      {rooms?.length > 0 && <MyBunch api={api} user={user} rooms={rooms} />}

      <section className="room-list">
        {rooms === null && <div className="center" style={{ padding: '60px 0' }}><GrapeLoader /></div>}
        {rooms?.length === 0 && (
          <div className="empty">
            <SproutDoodle size={96} />
            <h2>Start your first podo.</h2>
            <p className="mono">tap + to create a room or join with a code</p>
          </div>
        )}
        {rooms?.length > 0 && <h2 className="label-mono">my challenges</h2>}
        {rooms?.map((r) => (
          <a key={r.id} className="room-card" href={`#/room/${r.id}`}>
            <div className="room-info">
              <b>{r.name}</b>
              <span className="mono muted">
                {goalsOf(r).map((g) => g.title).join(' · ')}
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


      {sheet === 'create' && <CreateSheet api={api} user={user} onClose={() => setSheet(null)} />}
      {sheet === 'join' && <JoinSheet onClose={() => setSheet(null)} />}
      {sheet === 'profile' && <ProfileSheet api={api} user={user} onClose={() => setSheet(null)} />}
    </main>
  )
}

// 방마다 이번 주 내 체크인을 구독해서 위로 올려줌 (화면에는 안 보임)
function MyCheckinsWatcher({ api, user, roomId, onMine }) {
  useEffect(() => api.watchCheckins(roomId, weekKey(), (list) =>
    onMine(roomId, list.filter((c) => c.uid === user.uid).map((c) => ({ ...c, roomId })))), [api, user.uid, roomId, onMine])
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
    .slice(0, targetFor(room, goal, user.uid))
  const total = allGoals.reduce((s, x) => s + targetFor(x.room, x.goal, user.uid), 0)
  const colorById = {}
  const filled = allGoals
    .flatMap((x) => mineOf(x).map((c) => { colorById[c.id] = x.goal.color; return c }))
    .sort((a, b) => a.createdAt - b.createdAt)
  const left = daysLeft(week)
  const complete = total > 0 && filled.length >= total
  // 누르면 커지고, 떼면 펼쳐지는 포도알 (방 화면과 같은 인터랙션)
  const [bloom, setBloom] = useState(null)
  const goalOf = (c) => allGoals.find((x) => x.room.id === c.roomId && goalIdOf(c, goalsOf(x.room)) === x.goal.id)
  const pressStart = (c, rect, color) => setBloom({ c, rect, color, isMine: true, phase: 'press' })
  const pressEnd = (open) => setBloom((b) => b && { ...b, phase: open ? 'open' : 'cancel' })
  return (
    <section className={`my-bunch home-bunch ${complete ? 'complete' : ''}`}>
      {rooms.map((r) => <MyCheckinsWatcher key={r.id} api={api} user={user} roomId={r.id} onMine={onMine} />)}
      <div className="my-bunch-head">
        <div>
          <h2>{complete ? 'My podo is complete!' : 'My podo'}</h2>
          <p className="mono muted">{weekLabel(week).toLowerCase()}{!complete && ` · ${left} day${left === 1 ? '' : 's'} left`}</p>
        </div>
        <p className="big-count small"><b>{filled.length}</b><span>/{total}</span></p>
      </div>
      <GrapeCluster
        target={total}
        checkins={filled}
        size={GRAPE_SCALE}
        maxWidth={grapeMaxWidth(36)}
        colorOfCheckin={(c) => colorById[c.id] ?? 0}
        onPressStart={pressStart}
        onPressEnd={pressEnd}
        hiddenId={bloom?.c.id}
      />
      {bloom && (
        <Bloom
          key={bloom.c.id}
          item={bloom}
          phase={bloom.phase}
          goal={goalOf(bloom.c) ? `${goalOf(bloom.c).room.name} · ${goalOf(bloom.c).goal.title}` : null}
          member={{ name: user.name, photo: user.photo }}
          onClose={() => setBloom((b) => b && { ...b, phase: 'closing' })}
          onDone={() => setBloom(null)}
        />
      )}
    </section>
  )
}

// 프로필: 프로필 사진 + 닉네임 + 연동된 구글 계정 + 로그아웃
function ProfileSheet({ api, user, onClose }) {
  const [name, setName] = useState(user.name)
  const [photo, setPhoto] = useState(user.photo || null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const trimmed = name.trim()
  const changed = trimmed !== user.name || photo !== (user.photo || null)

  async function pick(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try { setPhoto(await avatarToDataUrl(f)) } catch { toast("Couldn't read that photo") }
  }
  async function save(e) {
    e.preventDefault()
    if (!trimmed) return
    if (!changed) return onClose()
    setBusy(true)
    try {
      await api.updateProfile(user, { name: trimmed, photo })
      toast('Profile saved')
      onClose()
    } catch (err) {
      toast('Could not save: ' + (err.message || err))
      setBusy(false)
    }
  }
  return (
    <Sheet title="Profile" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="profile-photo">
          <button type="button" className="profile-avatar" onClick={() => fileRef.current?.click()} aria-label="Change profile photo">
            <Avatar name={trimmed || user.name} photo={photo} size={84} />
            <span className="profile-cam" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
          <div className="profile-photo-actions">
            <button type="button" className="link-mono" onClick={() => fileRef.current?.click()}>Change photo</button>
            {user.googlePhoto && photo !== user.googlePhoto && <button type="button" className="link-mono" onClick={() => setPhoto(user.googlePhoto)}>Use Google photo</button>}
            {photo && <button type="button" className="link-mono muted" onClick={() => setPhoto(null)}>Remove</button>}
          </div>
        </div>

        <label>nickname
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required placeholder="what friends will see" />
        </label>

        <div className="label">linked account</div>
        <div className="google-row">
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
          <div>
            <b>{user.googleName || (isDemo ? 'Demo account' : 'Google account')}</b>
            <span className="mono muted">{user.email || '—'}</span>
          </div>
          <span className="google-badge">{isDemo ? 'demo' : 'connected'}</span>
        </div>

        <button className="btn primary block" disabled={busy || !trimmed}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn danger block" onClick={() => confirm('Sign out?') && api.signOut()}>Sign out</button>
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
