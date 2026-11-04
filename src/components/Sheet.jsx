// 아래에서 올라오는 시트
export default function Sheet({ title, onClose, children }) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sheet-handle" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  )
}
