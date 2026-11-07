// 한 주 포도송이를 이미지 카드(1080x1350)로 만들기
const W = 1080
const H = 1350
const C = { bg: '#FFFFFF', card: '#F5F3F8', ink: '#17151C', muted: '#7C7884', grape: '#5A3A9E', line: '#DEDAE4', pink: '#E3A9D3', grape2: '#7F5FCF' }
const SANS = '"Inter Tight", -apple-system, Helvetica, Arial, sans-serif'
const HAND = '"Crafty Girls", "Comic Sans MS", cursive'

function svgToImage(svgEl) {
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.querySelectorAll('.pop').forEach((g) => g.removeAttribute('class')) // 애니메이션 상태 제거
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h)
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

/**
 * { svgEl, roomName, goal, target, weekLabel, done, total, members: [{ name, n, isMe }] }
 */
export async function makeWeekImage(o) {
  await Promise.all([
    document.fonts?.load(`500 80px ${SANS}`),
    document.fonts?.load(`400 60px ${HAND}`),
  ].filter(Boolean)).catch(() => {})

  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  // 위: 로고 + 주
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.grape
  ctx.font = `400 56px ${HAND}`
  ctx.fillText('podoit', 72, 120)
  ctx.fillStyle = C.muted
  ctx.font = `400 34px ${SANS}`
  ctx.textAlign = 'right'
  ctx.fillText(o.weekLabel, W - 72, 112)
  ctx.textAlign = 'left'

  // 방 이름 + 목표
  ctx.fillStyle = C.ink
  ctx.font = `500 84px ${SANS}`
  ctx.fillText(fitText(ctx, o.roomName, W - 144), 72, 250)
  ctx.fillStyle = C.muted
  ctx.font = `400 36px ${SANS}`
  ctx.fillText(fitText(ctx, o.goal, W - 144), 72, 310)

  // 포도송이 카드
  const cardY = 360
  const cardH = 640
  ctx.fillStyle = C.card
  roundRect(ctx, 48, cardY, W - 96, cardH, 48)
  ctx.fill()
  const img = await svgToImage(o.svgEl)
  const box = { w: W - 260, h: cardH - 190 }
  const s = Math.min(box.w / img.width, box.h / img.height)
  const iw = img.width * s
  const ih = img.height * s
  ctx.drawImage(img, (W - iw) / 2, cardY + 40 + (box.h - ih) / 2, iw, ih)

  // 카운트
  const complete = o.done >= o.total
  ctx.textAlign = 'center'
  ctx.fillStyle = o.colors?.ink || C.grape
  ctx.font = `500 76px ${SANS}`
  const count = `${o.done}`
  const cw = ctx.measureText(count).width
  ctx.font = `500 40px ${SANS}`
  const tw = ctx.measureText(`/${o.total}`).width
  const cx = W / 2 - (cw + tw) / 2
  ctx.textAlign = 'left'
  ctx.font = `500 76px ${SANS}`
  ctx.fillText(count, cx, cardY + cardH - 90)
  ctx.fillStyle = C.muted
  ctx.font = `500 40px ${SANS}`
  ctx.fillText(`/${o.total}`, cx + cw, cardY + cardH - 90)
  ctx.textAlign = 'center'
  ctx.fillStyle = complete ? (o.colors?.ink || C.grape) : C.muted
  ctx.font = `400 34px ${SANS}`
  ctx.fillText(complete ? 'team podo complete!' : 'team podo', W / 2, cardY + cardH - 38)
  ctx.textAlign = 'left'

  // 멤버
  const rows = o.members.slice(0, 6)
  const rowH = rows.length > 4 ? 44 : 54
  let y = cardY + cardH + 74
  ctx.font = `400 34px ${SANS}`
  for (const m of rows) {
    ctx.fillStyle = C.ink
    ctx.fillText(fitText(ctx, m.name + (m.isMe ? ' (me)' : ''), 520), 72, y)
    const dot = 16
    const gap = 10
    const mt = m.target ?? o.target
    const dotsW = mt * dot + (mt - 1) * gap
    let dx = W - 72 - 90 - dotsW
    for (let i = 0; i < mt; i++) {
      ctx.fillStyle = i < m.n ? (m.isMe ? (o.colors?.me || C.grape2) : (o.colors?.friend || C.pink)) : C.line
      ctx.beginPath()
      ctx.arc(dx + dot / 2, y - 11, dot / 2, 0, Math.PI * 2)
      ctx.fill()
      dx += dot + gap
    }
    ctx.fillStyle = C.muted
    ctx.textAlign = 'right'
    ctx.fillText(`${m.n}/${mt}`, W - 72, y)
    ctx.textAlign = 'left'
    y += rowH
  }
  if (o.members.length > rows.length) {
    ctx.fillStyle = C.muted
    ctx.fillText(`+${o.members.length - rows.length} more`, 72, y)
  }

  // 아래
  ctx.fillStyle = C.muted
  ctx.font = `400 30px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText('every day counts', W / 2, H - 56)

  return new Promise((res) => cv.toBlob(res, 'image/png'))
}

// 폰에서는 공유 시트(→ "이미지 저장"), 안 되면 파일 다운로드
export async function saveImage(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared' } catch (e) { if (e.name === 'AbortError') return 'cancelled' }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return 'downloaded'
}
