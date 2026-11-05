import { MAX_GOALS, newGoalId, nextColor } from '../lib/goals.js'
import { colorOf } from '../lib/colors.js'

// 골 목록 편집: 제목 + 주 몇 번 (최대 5개)
export default function GoalsEditor({ goals, onChange, disabled }) {
  const set = (i, patch) => onChange(goals.map((g, k) => (k === i ? { ...g, ...patch } : g)))
  return (
    <div className="goals-editor">
      {goals.map((g, i) => (
        <div key={g.id} className="goal-edit">
          <div className="goal-edit-top">
            <i className="goal-dot" style={{ background: colorOf(g.color).me[1] }} />
            <input
              value={g.title}
              onChange={(e) => set(i, { title: e.target.value })}
              placeholder={i === 0 ? 'e.g. Work out 30 min' : 'e.g. Read 20 pages'}
              maxLength={40}
              required={i === 0}
              disabled={disabled}
              aria-label={`Goal ${i + 1}`}
            />
            {goals.length > 1 && !disabled && (
              <button type="button" className="icon-btn goal-remove" onClick={() => onChange(goals.filter((_, k) => k !== i))} aria-label="Remove goal">×</button>
            )}
          </div>
          <div className="chips small" role="group" aria-label="Times a week">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button type="button" key={n} className={n === g.target ? 'on' : ''} onClick={() => set(i, { target: n })} disabled={disabled}>{n}</button>
            ))}
            <span className="mono muted">×/week</span>
          </div>
        </div>
      ))}
      {!disabled && goals.length < MAX_GOALS && (
        <button type="button" className="link-mono add-goal" onClick={() => onChange([...goals, { id: newGoalId(), title: '', target: 3, color: nextColor(goals) }])}>
          + add another goal
        </button>
      )}
    </div>
  )
}
