// 데모 모드: Firebase 없이 이 브라우저(localStorage) 안에서만 동작합니다.
// 사진/영상은 새로고침하면 사라집니다(메모리에만 보관).
import { makeRoomCode } from './code.js'
import { weekKey } from './week.js'
import { goalFields } from './goals.js'

const KEY = 'podo-demo-v1'
const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}
let db = load() || { user: null, rooms: {}, checkins: [] }
const subs = new Set()
const emit = () => subs.forEach((f) => f())
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* 저장 실패해도 메모리로 계속 */ }
  emit()
}
const sub = (fn) => { subs.add(fn); fn(); return () => subs.delete(fn) }
window.addEventListener('storage', (e) => { if (e.key === KEY) { db = load() || db; emit() } })

const media = new Map() // checkinId -> objectURL
const uid = () => Math.random().toString(36).slice(2, 10)

const FRIENDS = [
  { uid: 'demo-minji', name: 'Mina', photo: null },
  { uid: 'demo-junho', name: 'Jun', photo: null },
]

function samplePhoto(emoji, from, to) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
    <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="600" height="800" fill="url(#a)"/><text x="300" y="460" font-size="220" text-anchor="middle">${emoji}</text></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function seedFriends(room) {
  const week = weekKey()
  const now = Date.now()
  FRIENDS.forEach((f, i) => {
    room.memberIds.push(f.uid)
    room.members[f.uid] = { name: f.name, photo: f.photo }
    room.goals.forEach((g, gi) => {
      const n = Math.min(g.target, i === 0 ? g.target - 1 : 1)
      for (let k = 0; k < n; k++) {
        const withPhoto = k === 0 && gi === 0
        db.checkins.push({
          id: uid(), roomId: room.id, uid: f.uid, week, goalId: g.id,
          createdAt: now - (k + 1 + i + gi) * 3.6e6 * 7,
          mediaType: withPhoto ? 'photo' : null,
          mediaUrl: withPhoto ? samplePhoto(i ? '🧘' : '🏃', i ? '#FFD3A5' : '#C2E9FB', i ? '#FD6585' : '#A18CD1') : null,
          note: withPhoto ? (i ? 'Morning yoga done' : 'River run 5km!') : '',
        })
      }
    })
  })
}

export default {
  mode: 'demo',

  onAuth: (cb) => sub(() => cb(db.user)),
  async signIn() { db.user = { uid: 'me', name: 'Me', photo: null, email: 'demo@podoit.app', googleName: 'Demo User', googlePhoto: null }; save() },
  async signOut() { db.user = null; save() },

  async updateProfile(user, { name, photo }) {
    const next = { name: name ?? db.user.name, photo: photo === undefined ? db.user.photo : photo }
    db.user = { ...db.user, ...next }
    for (const r of Object.values(db.rooms)) {
      if (r.members[user.uid]) db.rooms[r.id] = { ...r, members: { ...r.members, [user.uid]: { ...r.members[user.uid], name: next.name, photo: next.photo || null } } }
    }
    save()
  },
  updateName(user, name) { return this.updateProfile(user, { name }) },

  async updateRoom(roomId, fields) {
    db.rooms[roomId] = { ...db.rooms[roomId], ...fields }
    save()
  },

  async deleteRoom(roomId) {
    delete db.rooms[roomId]
    db.checkins = db.checkins.filter((c) => c.roomId !== roomId)
    save()
  },

  watchMyRooms: (me, cb) => sub(() =>
    cb(Object.values(db.rooms).filter((r) => r.memberIds.includes(me)).sort((a, b) => b.createdAt - a.createdAt))),

  watchRoom: (id, cb) => sub(() => cb(db.rooms[id] || null)),

  async createRoom(user, { name, goals }) {
    const id = makeRoomCode()
    const room = {
      id, name, ...goalFields(goals), ownerId: user.uid, hostIds: [user.uid], createdAt: Date.now(),
      memberIds: [user.uid], members: { [user.uid]: { name: user.name, photo: user.photo } },
    }
    db.rooms[id] = room
    seedFriends(room) // 데모용 친구 2명을 자동으로 초대
    save()
    return id
  },

  async setMyGoal(user, roomId, goalId, mine) {
    const r = db.rooms[roomId]
    const m = r.members[user.uid] || {}
    db.rooms[roomId] = { ...r, members: { ...r.members, [user.uid]: { ...m, goals: { ...(m.goals || {}), [goalId]: mine } } } }
    save()
  },

  async joinRoom(user, id) {
    const r = db.rooms[id]
    if (!r) throw new Error('Room not found')
    if (!r.memberIds.includes(user.uid)) {
      db.rooms[id] = { ...r, memberIds: [...r.memberIds, user.uid], members: { ...r.members, [user.uid]: { name: user.name, photo: user.photo } } }
      save()
    }
  },

  watchCheckins: (roomId, week, cb) => sub(() =>
    cb(db.checkins
      .filter((c) => c.roomId === roomId && c.week === week)
      .map((c) => ({ ...c, mediaUrl: c.mediaUrl || media.get(c.id) || null })))),

  async addCheckin(user, roomId, { week, goalId, slot, blob, mediaType, note }) {
    const id = uid()
    if (blob) media.set(id, URL.createObjectURL(blob))
    await new Promise((r) => setTimeout(r, blob ? 400 : 0)) // 업로드 느낌
    db.checkins.push({ id, roomId, uid: user.uid, week, goalId: goalId || null, slot: Number.isInteger(slot) ? slot : null, createdAt: Date.now(), mediaType: blob ? mediaType : null, mediaUrl: null, note: note || '' })
    save()
  },

  async deleteCheckin(roomId, c) {
    db.checkins = db.checkins.filter((x) => x.id !== c.id)
    save()
  },
}
