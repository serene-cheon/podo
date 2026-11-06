// 보라 손그림 낙서들 (로그인, 빈 화면 등). modern 스타일에서는 흔들림 없이 깔끔하게
import { useTheme } from '../lib/theme.js'
const INK = '#5A3A9E'

function Wobble({ id }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5" />
      <feDisplacementMap in="SourceGraphic" scale="2.4" />
    </filter>
  )
}

// 포도송이 + 덩굴 + 반짝이 낙서
export function GrapeDoodle({ size = 180 }) {
  const grapes = [[60, 70], [86, 68], [112, 72], [72, 94], [98, 96], [86, 120]]
  const modern = useTheme() === 'modern'
  if (modern) {
    const fills = ['#7F5FCF', '#C9B5EE', '#7F5FCF', '#D0679F', '#C9B5EE', '#5C7ED0']
    return (
      <svg width={size} height={size} viewBox="0 0 180 180" aria-hidden>
        <path d="M88 54 V22" stroke="#17151C" strokeWidth="2" strokeLinecap="round" />
        <path d="M89 34 C100 22 118 22 126 29 C116 40 100 41 89 34Z" fill="#8FCBA9" />
        {[[62, 68], [88, 68], [114, 68], [75, 94], [101, 94], [88, 120]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="12.5" fill={fills[i]} />)}
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" aria-hidden>
      <defs><Wobble id="dg" /></defs>
      <g filter="url(#dg)" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M88 52 C86 40 92 30 90 18" />
        <path d="M90 30 C100 20 122 18 134 28 C122 40 104 40 90 30Z" />
        <path d="M94 31 C106 29 118 28 130 28" opacity=".6" />
        <path d="M88 36 C76 30 66 36 70 44 C74 50 80 44 76 41" />
        {grapes.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="13" />
            <path d={`M${x - 6} ${y - 5} q3 -3 7 -3`} opacity=".7" />
          </g>
        ))}
        {/* 반짝이 */}
        <path d="M30 40 v12 M24 46 h12" />
        <path d="M148 92 v10 M143 97 h10" />
        <path d="M138 140 q4 -8 10 -2 q6 6 12 -2" opacity=".7" />
        <path d="M22 130 q6 -6 12 0 q6 6 12 0" opacity=".7" />
      </g>
    </svg>
  )
}

// 작은 새싹 낙서 (빈 화면)
export function SproutDoodle({ size = 90 }) {
  if (useTheme() === 'modern') {
    return (
      <svg width={size} height={size} viewBox="0 0 90 90" aria-hidden>
        <circle cx="34" cy="40" r="12" fill="#E6DDF5" /><circle cx="58" cy="40" r="12" fill="#C9B5EE" /><circle cx="46" cy="62" r="12" fill="#7F5FCF" />
        <path d="M46 28 V14" stroke="#17151C" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" aria-hidden>
      <defs><Wobble id="ds" /></defs>
      <g filter="url(#ds)" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M45 78 C45 62 44 50 46 38" />
        <path d="M46 46 C34 46 26 38 26 28 C38 28 46 36 46 46Z" />
        <path d="M46 40 C56 40 64 32 64 22 C54 22 46 30 46 40Z" />
        <path d="M24 80 q10 -6 21 -2 q11 4 21 -2" />
      </g>
    </svg>
  )
}

// 작은 손그림 아이콘 (currentColor)
export function DoodleIcon({ name, size = 30 }) {
  const modern = useTheme() === 'modern'
  const paths = {
    photo: 'M6 11 h5 l2 -3 h6 l2 3 h5 v14 h-20 z M16 22 a4 4 0 1 0 0.1 0',
    video: 'M5 9 h15 v14 h-15 z M20 14 l7 -4 v12 l-7 -4',
    settings: 'M6 10 h20 M6 16 h20 M6 22 h20 M12 10 a2.5 2.5 0 1 0 0.1 0 M21 16 a2.5 2.5 0 1 0 0.1 0 M10 22 a2.5 2.5 0 1 0 0.1 0',
    grape: 'M16 5 v4 M16 7 q4 -4 8 -1 M11 14 a3.5 3.5 0 1 0 0.1 0 M21 14 a3.5 3.5 0 1 0 0.1 0 M16 21 a3.5 3.5 0 1 0 0.1 0',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs><Wobble id={`di-${name}`} /></defs>
      <path filter={modern ? undefined : `url(#di-${name})`} d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
