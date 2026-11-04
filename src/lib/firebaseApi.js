import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged,
  signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, query, where, onSnapshot, runTransaction,
  updateDoc, addDoc, deleteDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { makeRoomCode } from './code.js'

const toUser = (u) => u && { uid: u.uid, name: u.displayName || '이름없음', photo: u.photoURL || null }

export function createFirebaseApi(config) {
  const app = initializeApp(config)
  const auth = getAuth(app)
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const storage = getStorage(app)


  return {
    mode: 'firebase',

    onAuth: (cb) => onAuthStateChanged(auth, (u) => cb(toUser(u))),

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

    async createRoom(user, { name, goal, target }) {
      for (let tries = 0; tries < 5; tries++) {
        const id = makeRoomCode()
        const ref_ = doc(db, 'rooms', id)
        const created = await runTransaction(db, async (tx) => {
          if ((await tx.get(ref_)).exists()) return false
          tx.set(ref_, {
            name, goal, target,
            ownerId: user.uid,
            memberIds: [user.uid],
            members: { [user.uid]: { name: user.name, photo: user.photo } },
            createdAt: serverTimestamp(),
          })
          return true
        })
        if (created) return id
      }
      throw new Error('방 코드를 만들지 못했어요. 다시 시도해 주세요.')
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

    async addCheckin(user, roomId, { week, blob, mediaType, note }) {
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
