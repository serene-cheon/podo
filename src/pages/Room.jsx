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

  useEffect(() => api.watchRoom(id, setRoom), [api, id])
  useEffect(() => api.watchCheckins(id, week, (list) => setData({ week, list })), [api, id, week])

  const isMember = room?.memberIds.includes(user.uid)
  useEffect(() => { if (room && !isMember) location.replace(`#/join/${id}`) }, [room, isMember, id])

  const target = room?.target || 1
  const members = useMemo(() => {
    if (!room) return []
    const ids = [user.uid, ...room.memberIds.filter((m) => m !== user.uid)].filter((m) => room.memberIds.includes(m))
    return ids.map((uid) => ({ uid, ...room.members[uid] }))
  }, [room, user.uid])

  const byUser = useMemo(() => {
    const m = {}
    const list = data.week === week ? data.list : []
    for (const c of [...list].sort((a, b) => a.createdAt - b.createdAt)) (m[c.uid] ||= []).push(c)
    return m
  }, [data, week])

  const total = target * members.length
  const done = members.reduce((s, m) => s + Math.min(byUser[m.uid]?.length || 0, target), 0)
  const mine = byUser[user.uid] || []
  const isCurrent = week === thisWeek
  const moments = (data.week === week ? data.list : []).filter((c) => c.mediaType).sort((a, b) => b.createdAt - a.createdAt)

  // 팀 송이가 "지금" 완성되는 순간에만 축하 (처음 로딩 때는 X)
  const seen = useRef({ week: null, done: 0 })
  useEffect(() => {
    if (data.week !== week || !total) return
    if (seen.current.week === week && seen.current.done < total && done >= total) {
      setParty(true)
      vibrate([30, 60, 30, 60, 80])
      setTimeout(() => setParty(false), 3500)
    }
    seen.current = { week, done }
  }, [data.week, week, done, total])

  async function add({ blob = null, mediaType = null } = {}) {
    setCamera(null)
    setAddOpen(false)
    setBusy(true)
    try {
      await api.addCheckin(user, id, { week: thisWeek, blob, mediaType, note: note.trim() })
      vibrate(20)
      setNote('')
      if (mine.length + 1 === target) toast('Your bunch is complete! 🍇')
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
        goal: room.goal,
        target,
        weekLabel: weekLabel(week).toLowerCase(),
        done,
        total,
        members: members.map((m) => ({ name: m.name, n: Math.min(byUser[m.uid]?.length || 0, target), isMe: m.uid === user.uid })),
      })
      const r = await saveImage(blob, `podoit-${room.name.replace(/[^\w가-힣-]+/g, '-')}-${week}.png`)
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
    const text = `[podoit] Join "${room.name}" and let's ${room.goal} together! Code: ${id}`
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

      <p className="goal-line"><span className="mono muted">goal</span> {room.goal} <span className="mono muted">· {target}×/week</span></p>

      <nav className="week-nav">
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, -1))} aria-label="Previous week">‹</button>
        <span className="mono">{weekLabel(week).toLowerCase()}{isCurrent ? ' · this week' : ''}</span>
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, 1))} disabled={isCurrent} aria-label="Next week">›</button>
      </nav>

      <section ref={bunchRef} className={`team-bunch ${done >= total ? 'complete' : ''}`}>
        <div className="my-bunch-head">
          <h2>{done >= total ? 'Team podo is complete!' : 'Team podo'}</h2>
          <p className="big-count small"><b>{done}</b><span>/{total}</span></p>
        </div>
        <GrapeCluster
          target={total}
          checkins={teamFilled}
          size={1.4}
          maxWidth={300}
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
            <div key={m.uid} className={`member ${m.uid === user.uid ? 'is-me' : ''} ${n >= target ? 'done' : ''}`}>
              <Avatar {...m} size={24} />
              <span className="member-name">{m.uid === user.uid ? 'You' : m.name}</span>
              <span className="member-dots">
                {Array.from({ length: target }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
              </span>
              <small>{n}/{target}</small>
            </div>
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
        <Sheet title="Add a grape" onClose={() => setAddOpen(false)}>
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

// 방 설정: 방장은 방 이름 변경, 다른 멤버는 보기만
function SettingsSheet({ api, room, isOwner, ownerName, onClose }) {
  const [name, setName] = useState(room.name)
  const [busy, setBusy] = useState(false)
  const trimmed = name.trim()
  async function save(e) {
    e.preventDefault()
    if (!trimmed || trimmed === room.name) return onClose()
    setBusy(true)
    try {
      await api.updateRoom(room.id, { name: trimmed })
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
        <div className="account-row">
          <span className="mono muted">host</span>
          <span className="mono">{isOwner ? 'you' : ownerName || '—'}</span>
        </div>
        {isOwner
          ? <button className="btn primary block" disabled={busy || !trimmed}>{busy ? 'saving…' : 'save'}</button>
          : <p className="mono muted center">only the host can change room settings</p>}
      </form>
    </Sheet>
  )
}
