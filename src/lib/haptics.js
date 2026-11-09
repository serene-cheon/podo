// 진동 효과. 안드로이드: navigator.vibrate 패턴
// 아이폰(Safari 17.4+): 웹 진동 API 가 없어서, 숨긴 스위치(<input switch>)를 눌러 시스템 햅틱을 냄
// (사용자 터치 직후에만 동작)
const PATTERNS = {
  tick: 6, // 칸 위를 지나갈 때
  grab: 10, // 집어 들 때
  stick: [24, 40, 12], // 착! 달라붙을 때: 묵직하게 한 번 + 작은 여운
  press: 8,
  open: 14,
  success: [20, 60, 20, 60, 60],
}

let sw = null
function iosTick() {
  try {
    if (!sw) {
      sw = document.createElement('label')
      sw.setAttribute('aria-hidden', 'true')
      sw.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      input.tabIndex = -1
      sw.appendChild(input)
      document.body.appendChild(sw)
    }
    sw.click()
  } catch { /* 무시 */ }
}

export function haptic(kind = 'tick') {
  const p = PATTERNS[kind] ?? kind
  if (typeof navigator !== 'undefined' && navigator.vibrate) { navigator.vibrate(p); return }
  iosTick()
  if (kind === 'stick' || kind === 'success') setTimeout(iosTick, 70) // 아이폰에서도 '착-탁' 두 번
}
