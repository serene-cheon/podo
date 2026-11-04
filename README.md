# 🍇 포도알

친구들과 같은 목표를 정하고, 매주 포도알을 하나씩 붙여 포도송이를 채우는 가벼운 웹앱입니다.
(폰에서 "홈 화면에 추가"하면 앱처럼 쓸 수 있어요.)

- 구글 계정으로 로그인
- 방장이 방을 만들고 목표와 "주 N회"를 정함 → 초대 링크나 6자리 코드로 친구 초대
- 목표를 하면 내 포도송이의 `+` 알을 눌러 포도알 붙이기
  - 그냥 붙이기 / 📸 사진 / 🎬 3초 영상 중 선택 (한 줄 메모는 선택)
- 팀 진행률 바, 친구들 포도송이, 이번 주 모먼트(사진·영상) 모아보기
- 지난 주 기록 보기, 팀 송이가 다 차면 🍇 축하 효과

## 바로 실행해 보기 (데모 모드)

```bash
npm install
npm run dev
```

`.env`가 없으면 **데모 모드**로 실행됩니다. 데이터는 이 브라우저에만 저장되고, 방을 만들면 가상 친구 2명이 함께 들어옵니다.
폰으로 보려면 같은 와이파이에서 터미널에 찍힌 `Network:` 주소로 접속하세요.
(카메라는 https 또는 localhost에서만 열려요. http 주소에서는 파일 선택으로 대신 동작합니다.)

## 진짜로 친구들과 쓰기 (Firebase)

1. https://console.firebase.google.com 에서 프로젝트를 만듭니다.
2. **Authentication → 로그인 방법 → Google** 을 사용 설정합니다.
3. **Firestore Database** 를 만듭니다 (프로덕션 모드, 서울 `asia-northeast3` 추천).
4. **Storage** 를 시작합니다. 사진·영상 저장용이고, Blaze(종량제) 요금제가 필요합니다.
   소규모로 쓰면 무료 사용량 안에서 거의 0원이에요. 예산 알림을 꼭 설정하세요.
5. **프로젝트 설정 → 내 앱 → 웹 앱 추가** 후 설정값을 `.env`에 넣습니다:
   ```bash
   cp .env.example .env   # 값 채우기
   ```
6. 배포합니다:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add          # 방금 만든 프로젝트 선택
   npm run build
   firebase deploy             # 호스팅 + 보안 규칙
   ```
7. `https://<프로젝트>.web.app` 링크를 친구들에게 공유하면 끝!

> 배포 도메인을 Authentication → 설정 → **승인된 도메인**에 추가해야 로그인이 됩니다 (`*.web.app`은 자동 포함).

## 구조

```
src/
  App.jsx                 해시 라우터 (#/, #/room/CODE, #/join/CODE)
  pages/                  Login, Home(방 목록·만들기·코드참여), Join(초대 수락), Room(메인 화면)
  components/
    GrapeCluster.jsx      포도송이 SVG (1~7알 모양, 뿅 애니메이션)
    Camera.jsx            사진 / 3초 영상 촬영 (MediaRecorder)
    Viewer.jsx            모먼트 크게 보기 · 포도알 떼기
  lib/
    api.js                Firebase ↔ 데모 모드 선택 (같은 인터페이스)
    firebaseApi.js        Firestore / Storage / Auth
    demoApi.js            localStorage 기반 데모
    week.js               주 계산 (월요일 시작)
firestore.rules, storage.rules   보안 규칙 (방 멤버만 기록·미디어 열람)
```

데이터 모델:

- `rooms/{6자리코드}`: `{ name, goal, target, ownerId, memberIds[], members{uid:{name,photo}} }`
- `rooms/{코드}/checkins/{id}`: `{ uid, week:'YYYY-MM-DD(월)', createdAt, mediaType, mediaUrl, mediaPath, note }`
- Storage `rooms/{코드}/{uid}/{시간}.jpg|mp4|webm`: 사진은 최대 1080px JPEG로 줄이고, 영상은 3초·약 1.5Mbps라 한 개에 수백 KB 정도입니다.

## 다음에 넣어볼 만한 것

- 방장 기능: 목표 수정, 멤버 내보내기, 방 삭제 / 방 나가기
- 리액션(👏🔥)과 푸시 알림("민지가 포도알을 붙였어요")
- 주간 회고: 지난 주 완성한 송이 모아보기
