import { haptic } from '../lib/haptics.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import GrapeCluster, { GRAPE_SCALE, grapeMaxWidth } from '../components/GrapeCluster.jsx'
import Avatar from '../components/Avatar.jsx'
import Sheet from '../components/Sheet.jsx'
import QRCode from '../components/QRCode.jsx'
import Camera from '../components/Camera.jsx'
import Bloom from '../components/Bloom.jsx'
import GrapeLoader from '../components/GrapeLoader.jsx'
import { SnapBar, PlaceGrape } from '../components/Snap.jsx'
import Confetti from '../components/Confetti.jsx'
import { toast } from '../components/Toast.jsx'
import { SproutDoodle } from '../components/Doodle.jsx'
import { makeWeekImage, saveImage } from '../lib/weekImage.js'
import { weekKey, shiftWeek, weekLabel } from '../lib/week.js'
import { goalsOf, goalIdOf, cleanGoals, goalFields, hostsOf, isHostOf, isPersonal, myGoalOf, targetFor, titleFor } from '../lib/goals.js'
import GoalsEditor from '../components/GoalsEditor.jsx'
import { colorOf } from '../lib/colors.js'

const vibrate = (p) => haptic(p)

export default function Room({ api, user, id }) {
  const thisWeek = weekKey()
  const [room, setRoom] = useState(undefined)
  const [week, setWeek] = useState(thisWeek)
  const [data, setData] = useState({ week: null, list: [] })
  const [camera, setCamera] = useState(null) // 'photo' | 'video'
  const [busy, setBusy] = useState(false)
  // 포도알 → 둥근 네모 → 펼침 (Bloom). phase: press | open | cancel | closing
  const [bloom, setBloom] = useState(null)
  const pressStart = (c, rect, color, isMine) => setBloom({ c, rect, color, isMine, phase: 'press' })
  const pressEnd = (open) => setBloom((b) => b && { ...b, phase: open ? 'open' : 'cancel' })
  const closeBloom = () => setBloom((b) => b && { ...b, phase: 'closing' })
  const openFrom = (c, rect, colorIdx) => setBloom({ c, rect, color: colorOf(colorIdx), isMine: c.uid === user.uid, phase: 'open' })
  const [party, setParty] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [myGoalOpen, setMyGoalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const bunchRef = useRef(null)
  const [goalPick, setGoalPick] = useState(null)
  const [personUid, setPersonUid] = useState(null) // 개별 포도송이 보기
  // 발사 버튼 → 옵션 고르기 → 포도알이 날아가 빈 칸에 박힘
  // 하단 + → Snap Now → 사진 찍기 → 사진 포도알을 빈 칸으로 끌어다 놓기
  const snapRef = useRef(null)
  const [snapOpen, setSnapOpen] = useState(false)
  const [placing, setPlacing] = useState(null) // { blob, url, from }
  const [hot, setHot] = useState(null) // 손가락 아래 빈 칸
  const [pending, setPending] = useState([]) // 저장 중인 포도알: 놓는 즉시 칸에 붙어 보이게

  useEffect(() => api.watchRoom(id, setRoom), [api, id])
  useEffect(() => api.watchCheckins(id, week, (list) => setData({ week, list })), [api, id, week])

  const isMember = room?.memberIds.includes(user.uid)
  useEffect(() => { if (room && !isMember) location.replace(`#/join/${id}`) }, [room, isMember, id])

  const goals = useMemo(() => goalsOf(room), [room])
  const goal = goals.find((g) => g.id === goalPick) || goals[0]
  const goalIdx = goals.indexOf(goal)
  const gc = colorOf(goal.color)
  // 골 넘기기: 지금 포도알들이 + 로 빨려 들어간 뒤 → 새 골 포도알들이 + 에서 튀어나옴
  const bunchApi = useRef(null)
  const switching = useRef(false)
  // 여러 골: 양옆에 이전·다음 골 송이가 살짝 보이고, 밀거나 눌러서 넘김
  const [dir, setDir] = useState(0) // 넘긴 방향 (애니메이션용)
  function goTo(i) {
    if (i < 0 || i >= goals.length || i === goalIdx || switching.current) return
    setDir(i > goalIdx ? 1 : -1)
    setGoalPick(goals[i].id)
    haptic('tick')
  }
  // 포도송이를 좌우로 밀면 다음/이전 골
  const swipe = useRef(null)
  const onPointerDown = (e) => { swipe.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    const s0 = swipe.current
    swipe.current = null
    if (!s0 || goals.length < 2 || bloom?.phase === 'press' || bloom?.phase === 'open') return // 포도알을 꾹 누르고 끄는 중이면 골 넘기기 X
    const dx = e.clientX - s0.x
    const dy = e.clientY - s0.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(goalIdx + (dx < 0 ? 1 : -1))
  }
  const tOf = (uid, g = goal) => targetFor(room, g, uid) // 멤버별 주 횟수 (개인 골이면 각자)
  const target = tOf(user.uid) // 내 횟수
  const members = useMemo(() => {
    if (!room) return []
    const ids = [user.uid, ...room.memberIds.filter((m) => m !== user.uid)].filter((m) => room.memberIds.includes(m))
    return ids.map((uid) => ({ uid, ...room.members[uid] }))
  }, [room, user.uid])

  // 골별 → 사람별 체크인 (시간순)
  const byGoal = useMemo(() => {
    const m = {}
    const saved = data.week === week ? data.list : []
    const list = [...saved, ...pending.filter((p) => p.week === week && !saved.some((c) => c.uid === p.uid && c.goalId === p.goalId && c.slot === p.slot))]
    for (const c of list.sort((a, b) => a.createdAt - b.createdAt)) {
      const gid = goalIdOf(c, goals)
      if (!gid) continue
      ;((m[gid] ||= {})[c.uid] ||= []).push(c)
    }
    return m
  }, [data, week, goals, pending])
  const byUser = byGoal[goal.id] || {}
  const myCount = (g) => Math.min(byGoal[g.id]?.[user.uid]?.length || 0, tOf(user.uid, g))
  const total = members.reduce((s, m) => s + tOf(m.uid), 0)
  const done = members.reduce((s, m) => s + Math.min(byUser[m.uid]?.length || 0, tOf(m.uid)), 0)
  const myDone = Math.min(byUser[user.uid]?.length || 0, target)
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
      haptic('success')
      setTimeout(() => setParty(false), 3500)
    }
    seen.current = { key, done }
  }, [data.week, week, done, total, goal.id])

  async function add({ blob = null, mediaType = null, note: n, slot } = {}) {
    setCamera(null)
    setBusy(true)
    try {
      await api.addCheckin(user, id, { week: thisWeek, goalId: goal.id, slot, blob, mediaType, note: (n || '').trim() })
      if (mine.length + 1 === target) toast(`You finished “${titleFor(room, goal, user.uid)}” this week 🍇`)
    } catch (e) {
      toast('Could not add: ' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  // + → Photo: 사진 찍기 / Note: 한 줄 쓰기 → 그게 포도알이 되어 떠 있고, 빈 칸으로 끌어다 놓기
  const [noteOpen, setNoteOpen] = useState(false)
  const fromPlus = () => snapRef.current?.getBoundingClientRect()
  function photoTaken({ blob }) {
    setCamera(null)
    setPlacing({ blob, url: URL.createObjectURL(blob), from: fromPlus() })
  }
  function noteWritten(text) {
    setNoteOpen(false)
    setPlacing({ note: text, from: fromPlus() })
  }
  async function placeAt(slot) {
    const p = placing
    // 칸에 쏙 들어가는 애니메이션이 끝나면 바로 진짜 포도알로 바꿔 붙임 (저장은 뒤에서)
    await new Promise((r) => setTimeout(r, 480))
    const tmp = {
      id: `pending-${Date.now()}`, uid: user.uid, week: thisWeek, goalId: goal.id, slot,
      createdAt: Date.now(), mediaType: p.blob ? 'photo' : null, mediaUrl: p.url || null, note: p.blob ? '' : p.note, pending: true,
    }
    setPending((ps) => [...ps, tmp])
    setPlacing(null)
    setHot(null)
    add(p.blob ? { blob: p.blob, mediaType: 'photo', note: '', slot } : { note: p.note, slot })
      .finally(() => {
        setPending((ps) => ps.filter((x) => x.id !== tmp.id))
        if (p.url) setTimeout(() => URL.revokeObjectURL(p.url), 10000)
      })
  }
  function discard() {
    if (placing?.url) URL.revokeObjectURL(placing.url)
    setPlacing(null)
    setHot(null)
  }

  async function remove(c) {
    if (c.pending) return
    if (!confirm('Remove this grape?')) return
    setBloom(null)
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
        members: members.map((m) => ({ name: m.name, n: Math.min(byUser[m.uid]?.length || 0, tOf(m.uid)), target: tOf(m.uid), isMe: m.uid === user.uid })),
        colors: { me: gc.me[1], friend: gc.friend[1], ink: gc.ink },
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

  if (room === undefined) return <main className="page center-page"><GrapeLoader label="loading" /></main>
  if (room === null) return (
    <main className="page center-page">
      <SproutDoodle size={80} /><p>Room not found</p><a className="btn ghost" href="#/">Go home</a>
    </main>
  )
  if (!isMember) return null

  const memberOf = (uid) => room.members[uid]
  // 팀 송이: 각자 목표 개수까지만, 붙인 시간순으로 채움
  const teamFilled = members
    .flatMap((m) => (byUser[m.uid] || []).slice(0, tOf(m.uid)))
    .sort((a, b) => a.createdAt - b.createdAt)

  return (
    <main className="page room">
      <header className="topbar">
        <a className="icon-btn" href="#/" aria-label="Back">←</a>
        <h1 className="title">{room.name}</h1>
        <div className="top-right">
          <button className="settings-btn" onClick={() => setInviteOpen(true)} aria-label="Invite friends"><InviteIcon /></button>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)} aria-label="Room settings"><GearIcon /></button>
        </div>
      </header>

      {!isPersonal(goal) && (
        <button className="my-goal our" onClick={() => isHostOf(room, user.uid) && setSettingsOpen(true)} disabled={!isHostOf(room, user.uid)}>
          <span className="mono muted">our goal</span>
          <b>{goal.title}</b>
          {isHostOf(room, user.uid) && <span className="my-goal-edit" aria-hidden>edit</span>}
        </button>
      )}

      {isPersonal(goal) && (
        <button className={`my-goal ${myGoalOf(room, goal, user.uid) ? '' : 'unset'}`} onClick={() => setMyGoalOpen(true)}>
          <span className="team-goal-pill" title="Team goal">{goal.title}</span>
          <span className="mono muted">my goal</span>
          <b>{myGoalOf(room, goal, user.uid) ? titleFor(room, goal, user.uid) : 'set your own goal'}</b>
          <span className="my-goal-edit" aria-hidden>edit</span>
        </button>
      )}

      <nav className="week-nav">
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, -1))} aria-label="Previous week">‹</button>
        <span className="week-now">
          <span className="week-range">{weekLabel(week)}</span>
          {isCurrent && <span className="week-today">TODAY · {new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} {new Date().getDate()}</span>}
        </span>
        <button className="icon-btn" onClick={() => setWeek(shiftWeek(week, 1))} disabled={isCurrent} aria-label="Next week">›</button>
      </nav>

      <section
        ref={bunchRef}
        className={`team-bunch ${done >= total ? 'complete' : ''}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current = null }}
        style={{ '--gc': gc.me[1] }}
      >
        <div className="my-bunch-head">
          <div>
            <h2>{done >= total ? 'Team podo is complete!' : 'Team podo'}</h2>
          </div>
          <div className="counts">
            <span><small>team</small><b>{done}</b>/{total}</span>
            <span className="me"><small>me</small><b>{myDone}</b>/{target}</span>
          </div>
        </div>
        <div className="goal-stage">
        <div key={goal.id} className={`stage-main ${dir > 0 ? 'from-right' : dir < 0 ? 'from-left' : ''}`}>
        <GrapeCluster
          target={total}
          color={goal.color}
          checkins={teamFilled}
          size={GRAPE_SCALE}
          maxWidth={grapeMaxWidth(36)}
          key={goal.id}
          apiRef={bunchApi}
          slotted
          dimFilled={!!placing}
          hotSlot={hot}
          meUid={user.uid}
          labelOf={(uid) => room.members[uid]?.name}
          canAdd={isCurrent && !busy && mine.length < target}
          onAdd={() => setSnapOpen(true)}
          onPressStart={pressStart}
          onPressEnd={pressEnd}
          hiddenId={bloom?.c.id}
        />
        </div>
        </div>
        {goals.length > 1 && (
          <div className="page-dots">
            {goals.map((g, i) => (
              <button type="button" key={g.id} className={i === goalIdx ? 'on' : ''} onClick={() => goTo(i)} aria-label={`Goal ${i + 1}: ${g.title}`} aria-current={i === goalIdx}>
                <i style={{ background: i === goalIdx ? colorOf(g.color).me[1] : undefined }} />
              </button>
            ))}
          </div>
        )}
        {total > 0 && (done >= total || !isCurrent) && (
          <button className="btn ghost save-img" onClick={saveWeek} disabled={saving}>
            {saving ? 'Making image…' : 'Save as image ↓'}
          </button>
        )}
      </section>

      <h2 className="label-mono">members</h2>
      <section className="members">
        {members.map((m) => {
          const t = tOf(m.uid)
          const n = Math.min(byUser[m.uid]?.length || 0, t)
          return (
            <button key={m.uid} className={`member ${m.uid === user.uid ? 'is-me' : ''} ${n >= t ? 'done' : ''}`} onClick={() => setPersonUid(m.uid)}>
              <Avatar {...m} size={24} />
              <span className="member-name">
                {m.uid === user.uid ? 'You' : m.name}
                {isPersonal(goal) && <small className="member-goal">{myGoalOf(room, goal, m.uid) ? titleFor(room, goal, m.uid) : 'no goal yet'}</small>}
              </span>
              <span className="member-dots">
                {Array.from({ length: t }, (_, i) => <i key={i} style={i < n ? { background: m.uid === user.uid ? gc.me[1] : gc.friend[1] } : undefined} />)}
              </span>
              <small>{n}/{t}</small>
            </button>
          )
        })}
      </section>

      {moments.length > 0 && (
        <section>
          <h2 className="label-mono">this week's moments</h2>
          <div className="moments">
            {moments.map((c) => (
              <button key={c.id} className="moment" onClick={(e) => openFrom(c, e.currentTarget.getBoundingClientRect(), goals.find((g) => g.id === goalIdOf(c, goals))?.color)}>
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
                const gt = tOf(personUid, g)
                const n = Math.min(list.length, gt)
                return (
                  <div key={g.id} className={`person-bunch ${n >= gt ? 'done' : ''}`}>
                    <GrapeCluster target={gt} checkins={list} color={g.color} tint={personUid === user.uid ? 'me' : 'other'} size={goals.length > 1 ? 0.9 : 1.3} maxWidth={goals.length > 1 ? 150 : 240} onPressStart={pressStart} onPressEnd={pressEnd} hiddenId={bloom?.c.id} />
                    <b>{titleFor(room, g, personUid)}</b>
                    <small className="mono muted">{n}/{gt}{n >= gt ? ' · done' : ''}</small>
                  </div>
                )
              })}
            </div>
          </div>
        </Sheet>
      )}

      {myGoalOpen && (
        <MyGoalSheet
          goal={goal}
          mine={myGoalOf(room, goal, user.uid)}
          onClose={() => setMyGoalOpen(false)}
          onSave={async (v) => {
            try { await api.setMyGoal(user, id, goal.id, v); setMyGoalOpen(false); toast('Your goal is set') } catch (e) { toast('Could not save: ' + (e.message || e)) }
          }}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          api={api}
          room={room}
          isOwner={isHostOf(room, user.uid)}
          me={user.uid}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {inviteOpen && (
        <Sheet title="Invite friends" onClose={() => setInviteOpen(false)}>
          <div className="invite-sheet">
            <div className="invite-qr"><QRCode value={inviteUrl} size={176} /></div>
            <p className="mono muted small">scan to join, or share the code / link</p>
            <button type="button" className="invite-code" onClick={() => copy(id, 'Code copied')} aria-label="Copy room code">{id}<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg></button>
            <div className="invite-actions">
              <button type="button" className="btn primary" onClick={share}>Share invite</button>
              <button type="button" className="btn ghost" onClick={() => copy(inviteUrl, 'Link copied')}>Copy link</button>
            </div>
          </div>
        </Sheet>
      )}

      {camera && <Camera initialMode="photo" photoOnly onClose={() => setCamera(null)} onDone={photoTaken} />}

      {noteOpen && <NoteSheet onClose={() => setNoteOpen(false)} onDone={noteWritten} />}

      {placing && (
        <PlaceGrape
          url={placing.url}
          note={placing.note}
          color={gc}
          from={placing.from}
          getSlots={() => bunchApi.current?.emptySlots?.() || []}
          onHot={setHot}
          onPlace={placeAt}
          onCancel={discard}
        />
      )}

      {isCurrent && mine.length < target && !placing && !noteOpen && !myGoalOpen && !bloom && !camera && !settingsOpen && !inviteOpen && !personUid && (
        <SnapBar open={snapOpen} setOpen={setSnapOpen} onPhoto={() => setCamera('photo')} onNote={() => setNoteOpen(true)} buttonRef={snapRef} />
      )}

      {bloom && (
        <Bloom
          key={bloom.c.id}
          item={bloom}
          phase={bloom.phase}
          goal={goals.length > 1 ? goalTitle(bloom.c) : null}
          member={memberOf(bloom.c.uid)}
          canRemove={bloom.c.uid === user.uid && bloom.c.week === thisWeek}
          onRemove={() => remove(bloom.c)}
          onClose={closeBloom}
          onDone={() => setBloom(null)}
        />
      )}

      {party && <Confetti />}
    </main>
  )
}

// 방 설정: 방장은 방 이름과 골을 바꿀 수 있고, 다른 멤버는 보기만
function SettingsSheet({ api, room, isOwner, me, onClose }) {
  const [name, setName] = useState(room.name)
  const [goals, setGoals] = useState(() => goalsOf(room).map((g) => ({ ...g })))
  const [hosts, setHosts] = useState(() => hostsOf(room))
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isCreator = room.ownerId === me
  async function deleteRoom() {
    setDeleting(true)
    try {
      await api.deleteRoom(room.id)
      toast(`Deleted “${room.name}”`)
      location.hash = '#/'
    } catch (err) {
      toast('Could not delete: ' + (err.message || err))
      setDeleting(false)
    }
  }
  const toggleHost = (uid) => setHosts((h) => (h.includes(uid) ? (h.length > 1 ? h.filter((x) => x !== uid) : h) : [...h, uid]))
  const trimmed = name.trim()
  const clean = cleanGoals(goals)
  async function save(e) {
    e.preventDefault()
    if (!trimmed || !clean.length) return
    const removed = goalsOf(room).filter((g) => !clean.some((c) => c.id === g.id))
    if (removed.length && !confirm(`Remove ${removed.map((g) => `“${g.title}”`).join(', ')}? Its grapes will be hidden.`)) return
    if (!hosts.includes(me) && !confirm("You won't be a host anymore and can't change settings. Continue?")) return
    setBusy(true)
    try {
      await api.updateRoom(room.id, { name: trimmed, ...goalFields(clean), hostIds: hosts })
      toast('Room updated')
      onClose()
    } catch (err) {
      toast('Could not save: ' + (err.message || err))
      setBusy(false)
    }
  }
  return (
    <Sheet title="Settings" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>room name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required disabled={!isOwner} />
        </label>
        <div className="label">goals</div>
        <GoalsEditor goals={goals} onChange={setGoals} disabled={!isOwner} />
        <div className="label">hosts {isOwner && <span className="hint">tap to add or remove · hosts can edit the room</span>}</div>
        <div className="host-list">
          {room.memberIds.map((uid) => {
            const m = room.members[uid] || {}
            const on = hosts.includes(uid)
            return (
              <button
                type="button"
                key={uid}
                className={`host-chip ${on ? 'on' : ''}`}
                disabled={!isOwner || (on && hosts.length === 1)}
                onClick={() => toggleHost(uid)}
                aria-pressed={on}
              >
                <Avatar name={m.name} photo={m.photo} size={24} />
                <span>{uid === me ? 'You' : m.name}</span>
                {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>}
              </button>
            )
          })}
        </div>
        {isOwner
          ? <button className="btn primary block" disabled={busy || !trimmed || !clean.length}>{busy ? 'Saving…' : 'Save'}</button>
          : <p className="mono muted center">only hosts can change room settings</p>}
      </form>
      {isCreator && (
        <section className={`danger-zone ${confirmDelete ? 'confirm' : ''}`}>
          {!confirmDelete ? (
            <button type="button" className="danger-link" onClick={() => setConfirmDelete(true)}>Delete room</button>
          ) : (
            <>
              <p className="danger-title">Delete “{room.name}” for everyone?</p>
              <p className="mono muted small">All grapes, photos and notes in this room will be gone. This can't be undone.</p>
              <div className="danger-actions">
                <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
                <button type="button" className="btn danger-solid" onClick={deleteRoom} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
              </div>
            </>
          )}
        </section>
      )}
    </Sheet>
  )
}

// 친구 초대 아이콘 (스캔 프레임)
function InviteIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
      <path d="M7 12h10" />
    </svg>
  )
}

// 모던한 설정(톱니바퀴) 아이콘
function GearIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}


// 메모 한 줄 쓰기 → 포도알로
function NoteSheet({ onClose, onDone }) {
  const [text, setText] = useState('')
  return (
    <Sheet title="Note" onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onDone(text.trim()) }}>
        <input className="note-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="What did you do today?" maxLength={60} autoFocus />
        <button className="btn primary block" disabled={!text.trim()}>Make it a grape</button>
      </form>
    </Sheet>
  )
}

// 개인 골: 내 목표와 주 횟수
function MyGoalSheet({ goal, mine, onClose, onSave }) {
  const [title, setTitle] = useState(mine?.title || '')
  const [target, setTarget] = useState(mine?.target || goal.target)
  const [busy, setBusy] = useState(false)
  return (
    <Sheet title="My goal" onClose={onClose}>
      <form className="form" onSubmit={async (e) => { e.preventDefault(); if (!title.trim()) return; setBusy(true); await onSave({ title: title.trim(), target }); setBusy(false) }}>
        <p className="mono muted small">for “{goal.title}” · everyone sets their own</p>
        <label>my goal
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run 5km" maxLength={40} required autoFocus />
        </label>
        <div className="label">times a week</div>
        <div className="chips">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button type="button" key={n} className={n === target ? 'on' : ''} onClick={() => setTarget(n)}>{n}</button>
          ))}
        </div>
        <button className="btn primary block" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </Sheet>
  )
}
