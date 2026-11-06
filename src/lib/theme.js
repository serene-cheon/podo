// 앱 스타일: 'doodle'(손그림·수채화) | 'modern'(깔끔한 사진 포도)
import { useSyncExternalStore } from 'react'

const KEY = 'podo-theme'
const subs = new Set()
let theme = (() => { try { return localStorage.getItem(KEY) || 'doodle' } catch { return 'doodle' } })()

const apply = () => { document.documentElement.dataset.theme = theme }
apply()

export function setTheme(t) {
  theme = t
  try { localStorage.setItem(KEY, t) } catch { /* 저장 못 해도 이번엔 적용 */ }
  apply()
  subs.forEach((f) => f())
}

export const useTheme = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => theme)
