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
        <button className="icon-btn" onClick={() => confirm('로그아웃할까요?') && api.signOut()} aria-label="로그아웃">
          <Avatar name={user.name} photo={user.photo} size={32} />
        </button>
      </header>
      {isDemo && <p className="demo-banner">데모 모드 · 방을 만들면 가상 친구 2명이 함께 들어와요</p>}

      <section className="room-list">
        {rooms === null && <p className="muted center">불러오는 중…</p>}
        {rooms?.length === 0 && (
          <div className="empty">
            <div className="empty-emoji">🍇</div>
            <p>아직 방이 없어요.<br />방을 만들고 친구를 초대해 보세요!</p>
          </div>
        )}
        {rooms?.map((r) => (
          <a key={r.id} className="room-card" href={`#/room/${r.id}`}>
            <div>
              <b>{r.name}</b>
              <span className="muted">🎯 {r.goal} · 주 {r.target}회</span>
            </div>
            <div className="stack">
              {r.memberIds.slice(0, 4).map((id) => <Avatar key={id} {...r.members[id]} size={26} />)}
              {r.memberIds.length > 4 && <span className="more">+{r.memberIds.length - 4}</span>}
            </div>
          </a>
        ))}
      </section>

      <div className="bottom-actions">
        <button className="btn ghost" onClick={() => setSheet('join')}>코드로 참여</button>
        <button className="btn primary" onClick={() => setSheet('create')}>+ 방 만들기</button>
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
      toast('만들기 실패: ' + (err.message || err))
      setBusy(false)
    }
  }
  return (
    <Sheet title="방 만들기" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>방 이름
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 갓생 크루" maxLength={30} required autoFocus />
        </label>
        <label>함께할 목표
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="예) 운동 30분" maxLength={40} required />
        </label>
        <div className="label">일주일에 몇 번?</div>
        <div className="chips">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button type="button" key={n} className={n === target ? 'on' : ''} onClick={() => setTarget(n)}>{n}</button>
          ))}
        </div>
        <p className="muted small">한 명당 매주 포도알 {target}개를 채우면 포도송이 완성!</p>
        <button className="btn primary block" disabled={busy}>{busy ? '만드는 중…' : '만들기'}</button>
      </form>
    </Sheet>
  )
}

function JoinSheet({ onClose }) {
  const [code, setCode] = useState('')
  return (
    <Sheet title="코드로 참여" onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); location.hash = `#/join/${code}` }}>
        <input className="code-input" value={code} onChange={(e) => setCode(normalizeCode(e.target.value))} placeholder="ABC123" autoFocus inputMode="text" autoCapitalize="characters" />
        <button className="btn primary block" disabled={code.length !== 6}>다음</button>
      </form>
    </Sheet>
  )
}
