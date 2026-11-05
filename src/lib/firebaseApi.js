import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, updateProfile,
  signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, query, where, onSnapshot, runTransaction,
  updateDoc, addDoc, deleteDoc, arrayUnion, serverTimestamp, getDocs, writeBatch,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { makeRoomCode } from './code.js'
import { goalFields } from './goals.js'

const toUser = (u) => u && { uid: u.uid, name: u.displayName || 'No name', photo: u.photoURL || null, email: u.email || null }

export function createFirebaseApi(config) {
  const app = initializeApp(config)
  const auth = getAuth(app)
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const storage = getStorage(app)
  const authCbs = new Set() // 닉네임을 바꾸면 화면에 바로 반영하려고


  return {
    mode: 'firebase',

    onAuth(cb) {
      authCbs.add(cb)
      const off = onAuthStateChanged(auth, (u) => cb(toUser(u)))
      return () => { authCbs.delete(cb); off() }
    },

    // 닉네임 변경: 계정 이름 + 내가 속한 모든 방의 멤버 이름
    async updateName(user, name) {
      await updateProfile(auth.currentUser, { displayName: name })
      const snap = await getDocs(query(collection(db, 'rooms'), where('memberIds', 'array-contains', user.uid)))
      const batch = writeBatch(db)
      snap.docs.forEach((d) => batch.update(d.ref, { [`members.${user.uid}.name`]: name }))
      await batch.commit()
      const u = toUser(auth.currentUser)
      authCbs.forEach((cb) => cb(u))
    },

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

    async addCheckin(user, roomId, { week, goalId, blob, mediaType, note }) {
      let mediaUrl = null
      let mediaPath = null
      if (blob) {
        const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : 'jpg'
        mediaPath = `rooms/${roomId}/${user.uid}/${Date.now()}.${ext}`
        const r = ref(storage, mediaPath)
        await uploadBytes(r, blob, { contentType: blob.type, cacheControl: 'public,max-age=31536000' })
        mediaUrl = await getDownloadURL(r)
      }
      await addDoc(collection(db, 'rooms', roomId, 'checkins'), {
        uid: user.uid,
        week,
        goalId: goalId || null,
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
