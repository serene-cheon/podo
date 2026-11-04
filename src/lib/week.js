// 주(week)는 월요일 시작. 키는 그 주 월요일 날짜 'YYYY-MM-DD' (각자 로컬 시간 기준).
const pad = (n) => String(n).padStart(2, '0')

export function weekStart(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // 월=0 ... 일=6
  d.setDate(d.getDate() - day)
  return d
}

export function weekKey(date = new Date()) {
  const d = weekStart(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parse(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function shiftWeek(key, delta) {
  const d = parse(key)
  d.setDate(d.getDate() + delta * 7)
  return weekKey(d)
}

export function weekLabel(key) {
  const s = parse(key)
  const e = new Date(s)
  e.setDate(e.getDate() + 6)
  return `${s.getMonth() + 1}.${s.getDate()} – ${e.getMonth() + 1}.${e.getDate()}`
}

export function daysLeft(key) {
  const end = parse(key)
  end.setDate(end.getDate() + 7)
  return Math.max(0, Math.ceil((end - new Date()) / 86400000))
}

export function timeLabel(ms) {
  const d = new Date(ms)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${days[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
