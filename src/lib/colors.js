// 골마다 다른 포도 색 (수채화 [가운데, 가장자리]). 내 알 = me(진하게), 친구 알 = friend(연하게)
export const GOAL_COLORS = [
  // aura: 바깥으로 번지는 오로라 빛, rim: 윗가장자리 림 라이트
  { name: 'grape', me: ['#C8B2F2', '#7F5FCF'], friend: ['#F1EAFC', '#C9B5EE'], ink: '#5A3A9E', label: '#6B4FB0', aura: '#E08CFF', rim: '#8FE6FF' },
  { name: 'berry', me: ['#F7C3DF', '#D0679F'], friend: ['#FDEAF3', '#EDB4D2'], ink: '#A8417A', label: '#A8417A', aura: '#FF8FC8', rim: '#FFD6F0' },
  { name: 'blueberry', me: ['#BCD0F6', '#5C7ED0'], friend: ['#EAF0FD', '#B7C9EF'], ink: '#3F5DAE', label: '#3F5DAE', aura: '#C78BFF', rim: '#7FE9FF' },
  { name: 'green grape', me: ['#CDEBB6', '#6CAA4B'], friend: ['#F0F8E8', '#C4E2AE'], ink: '#4E8A33', label: '#4E8A33', aura: '#9FF0C2', rim: '#EEFFB0' },
  { name: 'peach', me: ['#FFD5B3', '#DD884B'], friend: ['#FFF2E6', '#F4C8A4'], ink: '#B9652B', label: '#B9652B', aura: '#FFAE85', rim: '#FFEBA6' },
]
export const colorOf = (i) => GOAL_COLORS[(i ?? 0) % GOAL_COLORS.length]
