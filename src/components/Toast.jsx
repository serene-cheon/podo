import { useEffect, useState } from 'react'

export const toast = (msg) => window.dispatchEvent(new CustomEvent('podo-toast', { detail: msg }))

export default function Toast() {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    let t
    const on = (e) => { setMsg(e.detail); clearTimeout(t); t = setTimeout(() => setMsg(null), 2400) }
    window.addEventListener('podo-toast', on)
    return () => window.removeEventListener('podo-toast', on)
  }, [])
  return msg ? <div className="toast" role="status">{msg}</div> : null
}
