// 앱이 쓰는 백엔드를 고릅니다.
// .env 에 Firebase 설정이 있으면 Firebase, 없으면 브라우저 안에서만 동작하는 데모 모드.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isDemo = !config.apiKey

let pending
export function loadApi() {
  // Firebase SDK는 필요할 때만 불러와서 첫 화면을 가볍게 유지합니다.
  pending ||= isDemo
    ? import('./demoApi.js').then((m) => m.default)
    : import('./firebaseApi.js').then((m) => m.createFirebaseApi(config))
  return pending
}

/*
  API 모양 (두 구현이 똑같이 따릅니다)
  user    = { uid, name, photo }
  room    = { id, name, goal, target, ownerId, memberIds: [uid], members: { [uid]: {name, photo} } }
  checkin = { id, uid, week, createdAt(ms), mediaType: 'photo'|'video'|null, mediaUrl, note }

  onAuth(cb) -> unsubscribe
  signIn(), signOut()
  watchMyRooms(uid, cb) -> unsubscribe
  watchRoom(roomId, cb) -> unsubscribe            cb(null) 이면 방이 없음
  createRoom(user, {name, goal, target}) -> roomId
  joinRoom(user, roomId)
  watchCheckins(roomId, week, cb) -> unsubscribe
  addCheckin(user, roomId, {week, blob, mediaType, note})
  deleteCheckin(roomId, checkin)
*/
