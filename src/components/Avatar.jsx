const COLORS = ['#F4A5AE', '#A5C8F4', '#B8E0A5', '#F4D6A5', '#C9B2F0', '#A5E6DC']
export default function Avatar({ name = '?', photo, size = 28 }) {
  const style = { width: size, height: size, fontSize: size * 0.45 }
  if (photo) return <img className="avatar" src={photo} alt={name} style={style} referrerPolicy="no-referrer" />
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  return <span className="avatar" style={{ ...style, background: color }}>{[...name][0]}</span>
}
