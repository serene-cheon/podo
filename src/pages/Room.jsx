import { useEffect, useMemo, useRef, useState } from 'react'
import GrapeCluster from '../components/GrapeCluster.jsx'
import Avatar from '../components/Avatar.jsx'
import Sheet from '../components/Sheet.jsx'
import Camera from '../components/Camera.jsx'
import Viewer from '../components/Viewer.jsx'
import Confetti from '../components/Confetti.jsx'
import { toast } from '../components/Toast.jsx'
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

  async function invite() {
    const url = `${location.origin}${location.pathname}#/join/${id}`
    const text = `[podoit] Join "${room.name}" and let's ${room.goal} together! Code: ${id}`
    try {
      if (navigator.share) await navigator.share({ title: 'podoit invite', text, url })
      else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Invite link copied') }
    } catch { /* 공유 취소 */ }
  }

  if (room === undefined) return <main className="page center-page"><p className="muted">Loading…</p></main>
  if (room === null) return (
    <main className="page center-page">
      <div className="empty-emoji">🥲</div><p>Room not found</p><a className="btn ghost" href="#/">Go home</a>
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
        <button className="btn small ghost" onClick={invite}>Invite</button>
      </header>

      <div className="goal-pill">🎯 {room.goal} · {target}×/week</div>

      <nav className="week-nav">
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, -1))} aria-label="Previous week">‹</button>
        <span>{weekLabel(week)}{isCurrent ? ' · this week' : ''}</span>
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, 1))} disabled={isCurrent} aria-label="Next week">›</button>
      </nav>

      <section className={`team-bunch ${done >= total ? 'complete' : ''}`}>
        <div className="team-row">
          <b>{done >= total ? '🎉 Team bunch complete!' : 'Our team bunch'}</b>
          <span><b>{done}</b> / {total}</span>
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
          <span><i className="dot me" /> You</span>
          <span><i className="dot other" /> Friends</span>
        </div>
        <p className="me-label">
          {busy ? 'Adding…'
            : !isCurrent ? `You added ${Math.min(mine.length, target)}/${target}`
            : mine.length >= target ? `You're done this week 🍇 (${target}/${target})`
            : `Tap + to add your grape · You ${mine.length}/${target}`}
        </p>
        {isCurrent && done < total && <small className="muted">{daysLeft(week)} day{daysLeft(week) === 1 ? '' : 's'} left · let's fill it together</small>}
      </section>

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
          <h2 className="section-title">This week's moments</h2>
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

      <p className="room-code muted small">Room code <b>{id}</b></p>

      {addOpen && (
        <Sheet title="Add a grape 🍇" onClose={() => setAddOpen(false)}>
          <input className="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" maxLength={60} />
          <div className="add-options">
            <button onClick={() => setCamera('photo')}><span>📸</span>Photo</button>
            <button onClick={() => setCamera('video')}><span>🎬</span>3s video</button>
            <button onClick={() => add()}><span>🍇</span>Just add</button>
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
