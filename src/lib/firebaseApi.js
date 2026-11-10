import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, updateProfile,
  signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, query, where, onSnapshot, runTransaction,
  updateDoc, addDoc, deleteDoc, arrayUnion, serverTimestamp, getDocs, writeBatch, getDoc, setDoc,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { makeRoomCode } from './code.js'
import { goalFields } from './goals.js'
import { photoToDataUrl } from './inlinePhoto.js'

// 구글 계정 정보 + (users/{uid} 에 저장한) 내가 고른 닉네임·프로필 사진
const toUser = (u, prof = {}) => u && {
  uid: u.uid,
  name: prof.name || u.displayName || 'No name',
  photo: prof.photo !== undefined ? prof.photo : (u.photoURL || null),
  email: u.email || null,
  googleName: u.displayName || null,
  googlePhoto: u.photoURL || null,
}

export function createFirebaseApi(config) {
  const app = initializeApp(config)
  const auth = getAuth(app)
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const storage = getStorage(app)
  storage.maxUploadRetryTime = 4000 // Storage 가 없을 때 오래 붙잡혀 있지 않게
  const authCbs = new Set() // 닉네임을 바꾸면 화면에 바로 반영하려고
  let profile = {} // users/{uid}: { name, photo }
  // Storage 가 없으면 한 번 실패 후 계속 인라인 저장 (하루 동안 기억해서 매번 기다리지 않게)
  const NO_STORAGE = 'podo-no-storage'
  let storageOk = true
  try { storageOk = !(Date.now() - Number(localStorage.getItem(NO_STORAGE) || 0) < 864e5) } catch { /* 저장소 막힘 */ }


  return {
    mode: 'firebase',

    onAuth(cb) {
      authCbs.add(cb)
      const off = onAuthStateChanged(auth, async (u) => {
        if (!u) return cb(null)
        cb(toUser(u, profile)) // 바로 보여주고
        try {
          const d = await getDoc(doc(db, 'users', u.uid))
          profile = d.exists() ? d.data() : {}
          cb(toUser(u, profile)) // 저장된 프로필로 다시
        } catch { /* 규칙 배포 전이면 구글 정보만 */ }
      })
      return () => { authCbs.delete(cb); off() }
    },

    // 프로필 변경 (닉네임 / 사진): users/{uid} 에 저장하고, 내가 속한 모든 방의 멤버 정보도 같이
    async updateProfile(user, { name, photo }) {
      const next = { name: name ?? user.name, photo: photo === undefined ? user.photo : photo }
      await setDoc(doc(db, 'users', user.uid), next)
      if (name) await updateProfile(auth.currentUser, { displayName: name }).catch(() => {})
      const snap = await getDocs(query(collection(db, 'rooms'), where('memberIds', 'array-contains', user.uid)))
      const batch = writeBatch(db)
      snap.docs.forEach((d) => batch.update(d.ref, { [`members.${user.uid}.name`]: next.name, [`members.${user.uid}.photo`]: next.photo || null }))
      await batch.commit()
      profile = next
      const u = toUser(auth.currentUser, profile)
      authCbs.forEach((cb) => cb(u))
    },
    updateName(user, name) { return this.updateProfile(user, { name }) },

    async signIn() {
      const provider = new GoogleAuthProvider()
      try {
        await signInWithPopup(auth, provider)
      } catch (e) {
        // 팝업이 막히는 환경(일부 인앱 브라우저 등)에서는 리다이렉트로 재시도
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, provider)
        } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
          throw e
        }
      }
    },

    signOut: () => signOut(auth),

    watchMyRooms(uid, cb) {
      const q = query(collection(db, 'rooms'), where('memberIds', 'array-contains', uid))
      return onSnapshot(q, (snap) => {
        const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))
        rooms.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        cb(rooms)
      })
    },

    watchRoom(id, cb) {
      return onSnapshot(
        doc(db, 'rooms', id),
        (d) => cb(d.exists() ? { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) } : null),
        () => cb(null),
      )
    },

    async updateRoom(roomId, fields) {
      await updateDoc(doc(db, 'rooms', roomId), fields)
    },

    async createRoom(user, { name, goals }) {
      for (let tries = 0; tries < 5; tries++) {
        const id = makeRoomCode()
        const ref_ = doc(db, 'rooms', id)
        const created = await runTransaction(db, async (tx) => {
          if ((await tx.get(ref_)).exists()) return false
          tx.set(ref_, {
            name, ...goalFields(goals),
            ownerId: user.uid,
            hostIds: [user.uid],
            memberIds: [user.uid],
            members: { [user.uid]: { name: user.name, photo: user.photo } },
            createdAt: serverTimestamp(),
          })
          return true
        })
        if (created) return id
      }
      throw new Error("Couldn't create a room code. Please try again.")
    },

    async setMyGoal(user, roomId, goalId, mine) {
      await updateDoc(doc(db, 'rooms', roomId), { [`members.${user.uid}.goals.${goalId}`]: mine })
    },

    async joinRoom(user, id) {
      await updateDoc(doc(db, 'rooms', id), {
        memberIds: arrayUnion(user.uid),
        [`members.${user.uid}`]: { name: user.name, photo: user.photo },
      })
    },

    watchCheckins(roomId, week, cb) {
      const q = query(collection(db, 'rooms', roomId, 'checkins'), where('week', '==', week))
      return onSnapshot(q, (snap) => {
        cb(snap.docs.map((d) => {
          const c = d.data({ serverTimestamps: 'estimate' })
          return { ...c, id: d.id, createdAt: c.createdAt?.toMillis?.() ?? Date.now() }
        }))
      })
    },

    async addCheckin(user, roomId, { week, goalId, slot, blob, mediaType, note }) {
      let mediaUrl = null
      let mediaPath = null
      if (blob) {
        // 1) Storage 에 올리기 → 2) Storage 가 없으면(무료 요금제 등) 사진을 작게 줄여 기록 안에 바로 저장
        if (storageOk) {
          try {
            const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : 'jpg'
            mediaPath = `rooms/${roomId}/${user.uid}/${Date.now()}.${ext}`
            const r = ref(storage, mediaPath)
            await uploadBytes(r, blob, { contentType: blob.type, cacheControl: 'public,max-age=31536000' })
            mediaUrl = await getDownloadURL(r)
          } catch (e) {
            console.warn('Storage upload failed, saving photo inline instead', e)
            storageOk = false
            try { localStorage.setItem(NO_STORAGE, String(Date.now())) } catch { /* 저장소 막힘 */ }
            mediaPath = null
          }
        }
        if (!mediaUrl) {
          if (mediaType !== 'photo') throw new Error('Videos need Firebase Storage to be turned on')
          mediaUrl = await photoToDataUrl(blob)
        }
      }
      await addDoc(collection(db, 'rooms', roomId, 'checkins'), {
        uid: user.uid,
        week,
        goalId: goalId || null,
        slot: Number.isInteger(slot) ? slot : null,
        createdAt: serverTimestamp(),
        mediaType: blob ? mediaType : null,
        mediaUrl,
        mediaPath,
        note: note || '',
      })
    },

    async deleteCheckin(roomId, c) {
      await deleteDoc(doc(db, 'rooms', roomId, 'checkins', c.id))
      if (c.mediaPath) deleteObject(ref(storage, c.mediaPath)).catch(() => {})
    },
  }
}
