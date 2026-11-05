import { useEffect, useMemo, useRef, useState } from 'react'
import GrapeCluster from '../components/GrapeCluster.jsx'
import Avatar from '../components/Avatar.jsx'
import Sheet from '../components/Sheet.jsx'
import Camera from '../components/Camera.jsx'
import Viewer from '../components/Viewer.jsx'
import Confetti from '../components/Confetti.jsx'
import { toast } from '../components/Toast.jsx'
import { SproutDoodle, DoodleIcon } from '../components/Doodle.jsx'
import { makeWeekImage, saveImage } from '../lib/weekImage.js'
import { weekKey, shiftWeek, weekLabel, daysLeft } from '../lib/week.js'
import { goalsOf, goalIdOf, cleanGoals, goalFields } from '../lib/goals.js'
import GoalsEditor from '../components/GoalsEditor.jsx'

const vibrate = (p) => navigator.vibrate?.(p)

export default function Room({ api, user, id }) {
  const thisWeek = weekKey()
  const [room, setRoom] = useState(undefined)
  const [week, setWeek] = useState(thisWeek)
  const [data, setData] = useState({ week: null, list: [] })
  const [addOpen, setAddOpen] = useState(false)
  const [camera, setCamera] = useState(null) // 'photo' | 'video'
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [party, setParty] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const bunchRef = useRef(null)
  const [goalPick, setGoalPick] = useState(null)
  const [personUid, setPersonUid] = useState(null) // 개별 포도송이 보기

  useEffect(() => api.watchRoom(id, setRoom), [api, id])
  useEffect(() => api.watchCheckins(id, week, (list) => setData({ week, list })), [api, id, week])

  const isMember = room?.memberIds.includes(user.uid)
  useEffect(() => { if (room && !isMember) location.replace(`#/join/${id}`) }, [room, isMember, id])

  const goals = useMemo(() => goalsOf(room), [room])
  const goal = goals.find((g) => g.id === goalPick) || goals[0]
  const target = goal.target
  const members = useMemo(() => {
    if (!room) return []
    const ids = [user.uid, ...room.memberIds.filter((m) => m !== user.uid)].filter((m) => room.memberIds.includes(m))
    return ids.map((uid) => ({ uid, ...room.members[uid] }))
  }, [room, user.uid])

  // 골별 → 사람별 체크인 (시간순)
  const byGoal = useMemo(() => {
    const m = {}
    const list = data.week === week ? data.list : []
    for (const c of [...list].sort((a, b) => a.createdAt - b.createdAt)) {
      const gid = goalIdOf(c, goals)
      if (!gid) continue
      ;((m[gid] ||= {})[c.uid] ||= []).push(c)
    }
    return m
  }, [data, week, goals])
  const byUser = byGoal[goal.id] || {}
  const myCount = (g) => Math.min(byGoal[g.id]?.[user.uid]?.length || 0, g.target)

  const total = target * members.length
  const done = members.reduce((s, m) => s + Math.min(byUser[m.uid]?.length || 0, target), 0)
  const mine = byUser[user.uid] || []
  const isCurrent = week === thisWeek
  const moments = (data.week === week ? data.list : []).filter((c) => c.mediaType && goalIdOf(c, goals)).sort((a, b) => b.createdAt - a.createdAt)
  const goalTitle = (c) => goals.find((g) => g.id === goalIdOf(c, goals))?.title

  // 팀 송이가 "지금" 완성되는 순간에만 축하 (처음 로딩 때는 X)
  const seen = useRef({ key: null, done: 0 })
  useEffect(() => {
    if (data.week !== week || !total) return
    const key = `${week}|${goal.id}`
    if (seen.current.key === key && seen.current.done < total && done >= total) {
      setParty(true)
      vibrate([30, 60, 30, 60, 80])
      setTimeout(() => setParty(false), 3500)
    }
    seen.current = { key, done }
  }, [data.week, week, done, total, goal.id])

  async function add({ blob = null, mediaType = null } = {}) {
    setCamera(null)
    setAddOpen(false)
    setBusy(true)
    try {
      await api.addCheckin(user, id, { week: thisWeek, goalId: goal.id, blob, mediaType, note: note.trim() })
      vibrate(20)
      setNote('')
      if (mine.length + 1 === target) toast(`You finished “${goal.title}” this week 🍇`)
    } catch (e) {
      toast('Could not add: ' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(c) {
    if (!confirm('Remove this grape?')) return
    setViewing(null)
    try { await api.deleteCheckin(id, c) } catch (e) { toast('Failed: ' + (e.message || e)) }
  }

  const inviteUrl = `${location.origin}${location.pathname}#/join/${id}`

  // 한 주 포도송이를 이미지로 저장
  async function saveWeek() {
    setSaving(true)
    try {
      const blob = await makeWeekImage({
        svgEl: bunchRef.current.querySelector('svg.cluster'),
        roomName: room.name,
        goal: goal.title,
        target,
        weekLabel: weekLabel(week).toLowerCase(),
        done,
        total,
        members: members.map((m) => ({ name: m.name, n: Math.min(byUser[m.uid]?.length || 0, target), isMe: m.uid === user.uid })),
      })
      const slug = (t) => t.replace(/[^\w가-힣-]+/g, '-')
      const r = await saveImage(blob, `podoit-${slug(room.name)}-${slug(goal.title)}-${week}.png`)
      if (r === 'downloaded') toast('Image saved')
    } catch (e) {
      toast("Couldn't make the image: " + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg) } catch { toast("Couldn't copy") }
  }

  async function share() {
    const text = `[podoit] Join "${room.name}" and let's ${goals.map((g) => g.title).join(', ')} together! Code: ${id}`
    if (!navigator.share) return copy(`${text}\n${inviteUrl}`, 'Invite copied')
    try { await navigator.share({ title: 'podoit invite', text, url: inviteUrl }) } catch { /* 공유 취소 */ }
  }

  if (room === undefined) return <main className="page center-page"><p className="muted">Loading…</p></main>
  if (room === null) return (
    <main className="page center-page">
      <SproutDoodle size={80} /><p>Room not found</p><a className="btn ghost" href="#/">Go home</a>
    </main>
  )
  if (!isMember) return null

  const memberOf = (uid) => room.members[uid]
  // 팀 송이: 각자 목표 개수까지만, 붙인 시간순으로 채움
  const teamFilled = members
    .flatMap((m) => (byUser[m.uid] || []).slice(0, target))
    .sort((a, b) => a.createdAt - b.createdAt)

  return (
    <main className="page room">
      <header className="topbar">
        <a className="icon-btn" href="#/" aria-label="Back">←</a>
        <h1 className="title">{room.name}</h1>
        <div className="top-actions">
          <button className="icon-btn settings-btn" onClick={() => setSettingsOpen(true)} aria-label="Room settings"><DoodleIcon name="settings" size={26} /></button>
          <button className="link-mono" onClick={() => setInviteOpen(true)}>invite +</button>
        </div>
      </header>

      {goals.length > 1 ? (
        <nav className="goal-tabs" aria-label="Goals">
          {goals.map((g) => (
            <button key={g.id} className={`goal-tab ${g.id === goal.id ? 'on' : ''} ${myCount(g) >= g.target ? 'done' : ''}`} onClick={() => setGoalPick(g.id)}>
              <b>{g.title}</b>
              <small>{g.target}×/week · you {myCount(g)}/{g.target}</small>
            </button>
          ))}
        </nav>
      ) : (
        <p className="goal-line"><span className="mono muted">goal</span> {goal.title} <span className="mono muted">· {target}×/week</span></p>
      )}

      <nav className="week-nav">
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, -1))} aria-label="Previous week">‹</button>
        <span className="mono">{weekLabel(week).toLowerCase()}{isCurrent ? ' · this week' : ''}</span>
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, 1))} disabled={isCurrent} aria-label="Next week">›</button>
      </nav>

      <section ref={bunchRef} className={`team-bunch ${done >= total ? 'complete' : ''}`}>
        <div className="my-bunch-head">
          <div>
            <h2>{done >= total ? 'Team podo is complete!' : 'Team podo'}</h2>
            {goals.length > 1 && <p className="mono muted">{goal.title}</p>}
          </div>
          <p className="big-count small"><b>{done}</b><span>/{total}</span></p>
        </div>
        <GrapeCluster
          target={total}
          checkins={teamFilled}
          size={1.4}
          maxWidth={300}
          key={goal.id}
          meUid={user.uid}
          labelOf={(uid) => room.members[uid]?.name}
          canAdd={isCurrent && !busy && mine.length < target}
          onAdd={() => setAddOpen(true)}
          onOpen={setViewing}
        />
        <div className="legend">
          <span><i className="dot me" /> you</span>
          <span><i className="dot other" /> friends</span>
        </div>
        <p className="me-label mono">
          {busy ? 'Adding…'
            : !isCurrent ? `you added ${Math.min(mine.length, target)}/${target}`
            : mine.length >= target ? `you're done this week (${target}/${target})`
            : `tap + to add your grape · you ${mine.length}/${target}`}
        </p>
        {isCurrent && done < total && <small className="mono muted">{daysLeft(week)} day{daysLeft(week) === 1 ? '' : 's'} left · fill it together</small>}
        {total > 0 && (done >= total || !isCurrent) && (
          <button className="btn ghost save-img" onClick={saveWeek} disabled={saving}>
            {saving ? 'making image…' : 'save as image ↓'}
          </button>
        )}
      </section>

      <h2 className="label-mono">members</h2>
      <section className="members">
        {members.map((m) => {
          const n = Math.min(byUser[m.uid]?.length || 0, target)
          return (
            <button key={m.uid} className={`member ${m.uid === user.uid ? 'is-me' : ''} ${n >= target ? 'done' : ''}`} onClick={() => setPersonUid(m.uid)}>
              <Avatar {...m} size={24} />
              <span className="member-name">{m.uid === user.uid ? 'You' : m.name}</span>
              <span className="member-dots">
                {Array.from({ length: target }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
              </span>
              <small>{n}/{target}</small>
            </button>
          )
        })}
      </section>

      {moments.length > 0 && (
        <section>
          <h2 className="label-mono">this week's moments</h2>
          <div className="moments">
            {moments.map((c) => (
              <button key={c.id} className="moment" onClick={() => setViewing(c)}>
                {c.mediaUrl ? (
                  c.mediaType === 'video'
                    ? <video src={c.mediaUrl} muted playsInline autoPlay loop />
                    : <img src={c.mediaUrl} alt="" loading="lazy" />
                ) : <span className="moment-missing">🍇</span>}
                <span className="moment-who"><Avatar {...memberOf(c.uid)} size={18} /></span>
                {c.mediaType === 'video' && <span className="moment-badge">3s</span>}
              </button>
            ))}
          </div>
        </section>
      )}


      {personUid && room.members[personUid] && (
        <Sheet title={personUid === user.uid ? 'My podo' : `${room.members[personUid].name}'s podo`} onClose={() => setPersonUid(null)}>
          <div className="person">
            <div className="person-head">
              <Avatar {...room.members[personUid]} size={40} />
              <span className="mono muted">{weekLabel(week).toLowerCase()}{isCurrent ? ' · this week' : ''}</span>
            </div>
            <div className="person-bunches">
              {goals.map((g) => {
                const list = byGoal[g.id]?.[personUid] || []
                const n = Math.min(list.length, g.target)
                return (
                  <div key={g.id} className={`person-bunch ${n >= g.target ? 'done' : ''}`}>
                    <GrapeCluster target={g.target} checkins={list} tint={personUid === user.uid ? 'me' : 'other'} size={goals.length > 1 ? 0.9 : 1.3} maxWidth={goals.length > 1 ? 150 : 240} onOpen={(c) => { setPersonUid(null); setViewing(c) }} />
                    <b>{g.title}</b>
                    <small className="mono muted">{n}/{g.target}{n >= g.target ? ' · done' : ''}</small>
                  </div>
                )
              })}
            </div>
          </div>
        </Sheet>
      )}

      {settingsOpen && (
        <SettingsSheet api={api} room={room} isOwner={room.ownerId === user.uid} ownerName={room.members[room.ownerId]?.name} onClose={() => setSettingsOpen(false)} />
      )}

      {inviteOpen && (
        <Sheet title="Invite friends" onClose={() => setInviteOpen(false)}>
          <div className="invite">
            <p className="mono muted">room code</p>
            <button className="invite-code" onClick={() => copy(id, 'Code copied')} aria-label="Copy room code">
              {id}
            </button>
            <p className="mono muted">tap the code to copy</p>
            <button className="btn primary block" onClick={share}>share invite</button>
            <button className="btn ghost block" onClick={() => copy(inviteUrl, 'Link copied')}>copy link</button>
          </div>
        </Sheet>
      )}

      {addOpen && (
        <Sheet title={goals.length > 1 ? `Add a grape · ${goal.title}` : 'Add a grape'} onClose={() => setAddOpen(false)}>
          <input className="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" maxLength={60} />
          <div className="add-options">
            <button onClick={() => setCamera('photo')}><DoodleIcon name="photo" />photo</button>
            <button onClick={() => setCamera('video')}><DoodleIcon name="video" />3s video</button>
            <button onClick={() => add()}><DoodleIcon name="grape" />just add</button>
          </div>
        </Sheet>
      )}

      {camera && <Camera initialMode={camera} onClose={() => setCamera(null)} onDone={add} />}

      {viewing && (
        <Viewer
          checkin={viewing}
          goal={goals.length > 1 ? goalTitle(viewing) : null}
          member={memberOf(viewing.uid)}
          canRemove={viewing.uid === user.uid && viewing.week === thisWeek}
          onRemove={() => remove(viewing)}
          onClose={() => setViewing(null)}
        />
      )}

      {party && <Confetti />}
    </main>
  )
}

// 방 설정: 방장은 방 이름과 골을 바꿀 수 있고, 다른 멤버는 보기만
function SettingsSheet({ api, room, isOwner, ownerName, onClose }) {
  const [name, setName] = useState(room.name)
  const [goals, setGoals] = useState(() => goalsOf(room).map((g) => ({ ...g })))
  const [busy, setBusy] = useState(false)
  const trimmed = name.trim()
  const clean = cleanGoals(goals)
  async function save(e) {
    e.preventDefault()
    if (!trimmed || !clean.length) return
    const removed = goalsOf(room).filter((g) => !clean.some((c) => c.id === g.id))
    if (removed.length && !confirm(`Remove ${removed.map((g) => `“${g.title}”`).join(', ')}? Its grapes will be hidden.`)) return
    setBusy(true)
    try {
      await api.updateRoom(room.id, { name: trimmed, ...goalFields(clean) })
      toast('Room updated')
      onClose()
    } catch (err) {
      toast('Could not save: ' + (err.message || err))
      setBusy(false)
    }
  }
  return (
    <Sheet title="Room settings" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>room name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required disabled={!isOwner} />
        </label>
        <div className="label">goals</div>
        <GoalsEditor goals={goals} onChange={setGoals} disabled={!isOwner} />
        <div className="account-row">
          <span className="mono muted">host</span>
          <span className="mono">{isOwner ? 'you' : ownerName || '—'}</span>
        </div>
        {isOwner
          ? <button className="btn primary block" disabled={busy || !trimmed || !clean.length}>{busy ? 'saving…' : 'save'}</button>
          : <p className="mono muted center">only the host can change room settings</p>}
      </form>
    </Sheet>
  )
}
