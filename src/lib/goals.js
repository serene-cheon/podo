// 한 방에 골 여러 개. 예전 방(goal/target 하나)도 'main' 골 하나로 그대로 동작하게.
export const MAX_GOALS = 5

export function goalsOf(room) {
  if (room?.goals?.length) return room.goals.map((g, i) => ({ ...g, color: g.color ?? i }))
  return [{ id: 'main', title: room?.goal || 'Goal', target: room?.target || 1, color: 0 }]
}

// 체크인이 어느 골에 속하는지. goalId 없는 예전 기록은 첫 번째 골, 삭제된 골이면 null
export function goalIdOf(c, goals) {
  if (!c.goalId) return goals[0].id
  return goals.some((g) => g.id === c.goalId) ? c.goalId : null
}

export const newGoalId = () => Math.random().toString(36).slice(2, 8)

// 저장용: 빈 제목 제거, 앞뒤 공백 제거
export function cleanGoals(goals) {
  return goals
    .map((g) => ({ id: g.id || newGoalId(), title: g.title.trim(), target: g.target, color: g.color ?? 0, mode: g.mode === 'personal' ? 'personal' : 'team' }))
    .filter((g) => g.title)
    .slice(0, MAX_GOALS)
}

// 방 문서에 같이 저장하는 값 (첫 골을 goal/target 에도 넣어서 예전 버전과 호환)
export const goalFields = (goals) => ({ goals, goal: goals[0].title, target: goals[0].target })

// 새 골 색: 아직 안 쓴 색 중 첫 번째
export function nextColor(goals) {
  const used = new Set(goals.map((g) => g.color))
  for (let i = 0; i < 5; i++) if (!used.has(i)) return i
  return goals.length % 5
}

// 방 호스트(여러 명 가능). 예전 방은 만든 사람(ownerId) 한 명
export const hostsOf = (room) => (room?.hostIds?.length ? room.hostIds : room?.ownerId ? [room.ownerId] : [])
export const isHostOf = (room, uid) => hostsOf(room).includes(uid)

// 개인 골: 멤버마다 자기 목표·횟수 (room.members[uid].goals[goalId] = { title, target })
export const isPersonal = (goal) => goal?.mode === 'personal'
export const myGoalOf = (room, goal, uid) => (isPersonal(goal) ? room?.members?.[uid]?.goals?.[goal.id] : null) || null
export const targetFor = (room, goal, uid) => myGoalOf(room, goal, uid)?.target || goal.target
export const titleFor = (room, goal, uid) => myGoalOf(room, goal, uid)?.title || goal.title
