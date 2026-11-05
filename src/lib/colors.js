// 골마다 다른 포도 색 (수채화 [가운데, 가장자리]). 내 알 = me(진하게), 친구 알 = friend(연하게)
export const GOAL_COLORS = [
  { name: 'grape', me: ['#C8B2F2', '#7F5FCF'], friend: ['#F1EAFC', '#C9B5EE'], ink: '#5A3A9E', label: '#6B4FB0' },
  { name: 'berry', me: ['#F7C3DF', '#D0679F'], friend: ['#FDEAF3', '#EDB4D2'], ink: '#A8417A', label: '#A8417A' },
  { name: 'blueberry', me: ['#BCD0F6', '#5C7ED0'], friend: ['#EAF0FD', '#B7C9EF'], ink: '#3F5DAE', label: '#3F5DAE' },
  { name: 'green grape', me: ['#CDEBB6', '#6CAA4B'], friend: ['#F0F8E8', '#C4E2AE'], ink: '#4E8A33', label: '#4E8A33' },
  { name: 'peach', me: ['#FFD5B3', '#DD884B'], friend: ['#FFF2E6', '#F4C8A4'], ink: '#B9652B', label: '#B9652B' },
]
export const colorOf = (i) => GOAL_COLORS[(i ?? 0) % GOAL_COLORS.length]
