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
  user    = { uid, name, photo, email, googleName, googlePhoto }
  room    = { id, name, goals: [{id, title, target}], goal, target(첫 골, 호환용), ownerId, memberIds: [uid], members: { [uid]: {name, photo} } }
  checkin = { id, uid, week, goalId, slot(포도송이에서 고른 칸), createdAt(ms), mediaType: 'photo'|'video'|null, mediaUrl, note }

  onAuth(cb) -> unsubscribe
  signIn(), signOut()
  updateProfile(user, {name, photo})             닉네임·프로필 사진 변경 (모든 방에 반영)
  watchMyRooms(uid, cb) -> unsubscribe
  watchRoom(roomId, cb) -> unsubscribe            cb(null) 이면 방이 없음
  createRoom(user, {name, goals}) -> roomId
  joinRoom(user, roomId)
  setMyGoal(user, roomId, goalId, {title, target})  개인 골: 내 목표·횟수
  updateRoom(roomId, { name, goals, goal, target }) 방장만: 방 설정 변경
  watchCheckins(roomId, week, cb) -> unsubscribe
  addCheckin(user, roomId, {week, goalId, slot, blob, mediaType, note})
  deleteCheckin(roomId, checkin)
*/

// 배포 확인용: 이 버전이 빌드된 시각 (UTC)
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__.slice(0, 16).replace('T', ' ') : 'dev'
