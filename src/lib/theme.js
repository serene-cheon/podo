// 앱 스타일: 'doodle'(손그림·수채화) | 'modern'(깔끔한 사진 포도)
import { useSyncExternalStore } from 'react'

const KEY = 'podo-theme'
const subs = new Set()
// 스케치 같은 모던 UI 로 통일 (수채화 doodle 스타일은 더 이상 쓰지 않음)
let theme = 'modern'

const apply = () => { document.documentElement.dataset.theme = theme }
apply()

export function setTheme() {
  theme = 'modern'
  try { localStorage.setItem(KEY, t) } catch { /* 저장 못 해도 이번엔 적용 */ }
  apply()
  subs.forEach((f) => f())
}

export const useTheme = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => theme)
