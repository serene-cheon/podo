const COLORS = ['#A88BDB', '#D99BC8', '#8FC2A8', '#B9A58F', '#7F6BC0', '#C98FAE']
export default function Avatar({ name = '?', photo, size = 28 }) {
  const style = { width: size, height: size, fontSize: size * 0.45 }
  if (photo) return <img className="avatar" src={photo} alt={name} style={style} referrerPolicy="no-referrer" />
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  return <span className="avatar" style={{ ...style, background: color }}>{[...name][0]}</span>
}
