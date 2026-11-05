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
      if (mine.length + 1 === target) toast('내 포도송이 완성! 🍇')
    } catch (e) {
      toast('붙이기 실패: ' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(c) {
    if (!confirm('이 포도알을 뗄까요?')) return
    setViewing(null)
    try { await api.deleteCheckin(id, c) } catch (e) { toast('실패: ' + (e.message || e)) }
  }

  async function invite() {
    const url = `${location.origin}${location.pathname}#/join/${id}`
    const text = `[podoit] "${room.name}" 방에서 같이 ${room.goal} 해요! 코드: ${id}`
    try {
      if (navigator.share) await navigator.share({ title: 'podoit 초대', text, url })
      else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('초대 링크를 복사했어요') }
    } catch { /* 공유 취소 */ }
  }

  if (room === undefined) return <main className="page center-page"><p className="muted">불러오는 중…</p></main>
  if (room === null) return (
    <main className="page center-page">
      <div className="empty-emoji">🥲</div><p>방을 찾을 수 없어요</p><a className="btn ghost" href="#/">홈으로</a>
    </main>
  )
  if (!isMember) return null

  const memberOf = (uid) => room.members[uid]
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <main className="page room">
      <header className="topbar">
        <a className="icon-btn" href="#/" aria-label="뒤로">←</a>
        <h1 className="title">{room.name}</h1>
        <button className="btn small ghost" onClick={invite}>초대</button>
      </header>

      <div className="goal-pill">🎯 {room.goal} · 주 {target}회</div>

      <nav className="week-nav">
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, -1))} aria-label="지난 주">‹</button>
        <span>{weekLabel(week)}{isCurrent ? ' · 이번 주' : ''}</span>
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, 1))} disabled={isCurrent} aria-label="다음 주">›</button>
      </nav>

      <section className={`team ${done >= total ? 'complete' : ''}`}>
        <div className="team-row">
          <b>{done >= total ? '🎉 팀 포도송이 완성!' : '팀 포도'}</b>
          <span><b>{done}</b> / {total}</span>
        </div>
        <div className="bar"><span style={{ width: `${pct}%` }} /></div>
        {isCurrent && done < total && <small className="muted">{daysLeft(week)}일 남았어요 · 다 같이 채워봐요</small>}
      </section>

      <section className="me">
        <GrapeCluster
          target={target}
          checkins={mine}
          size={1.6}
          canAdd={isCurrent && !busy}
          onAdd={() => setAddOpen(true)}
          onOpen={setViewing}
        />
        <p className="me-label">
          {busy ? '붙이는 중…'
            : mine.length >= target ? '이번 주 내 송이 완성 🍇'
            : isCurrent ? `+ 를 눌러 포도알 붙이기 (${mine.length}/${target})`
            : `${mine.length}/${target}`}
        </p>
      </section>

      {members.length > 1 && (
        <section className="friends">
          {members.slice(1).map((m) => {
            const list = byUser[m.uid] || []
            return (
              <div key={m.uid} className={`friend ${list.length >= target ? 'done' : ''}`}>
                <GrapeCluster target={target} checkins={list} size={0.7} onOpen={setViewing} />
                <div className="friend-name"><Avatar {...m} size={20} /> {m.name}</div>
                <small className="muted">{Math.min(list.length, target)}/{target}</small>
              </div>
            )
          })}
        </section>
      )}

      {moments.length > 0 && (
        <section>
          <h2 className="section-title">이번 주 모먼트</h2>
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

      <p className="room-code muted small">방 코드 <b>{id}</b></p>

      {addOpen && (
        <Sheet title="포도알 붙이기 🍇" onClose={() => setAddOpen(false)}>
          <input className="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="한 줄 남기기 (선택)" maxLength={60} />
          <div className="add-options">
            <button onClick={() => setCamera('photo')}><span>📸</span>사진</button>
            <button onClick={() => setCamera('video')}><span>🎬</span>3초 영상</button>
            <button onClick={() => add()}><span>🍇</span>그냥 붙이기</button>
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
