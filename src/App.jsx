import { useEffect, useState } from 'react'
import { loadApi } from './lib/api.js'
import { normalizeCode } from './lib/code.js'
import Toast from './components/Toast.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Join from './pages/Join.jsx'
import Room from './pages/Room.jsx'

// 아주 작은 해시 라우터: #/  #/room/CODE  #/join/CODE
function useRoute() {
  const read = () => location.hash.replace(/^#\/?/, '').split('/')
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export default function App() {
  const [api, setApi] = useState(null)
  const [user, setUser] = useState(undefined)
  const [page, param] = useRoute()

  useEffect(() => { loadApi().then(setApi) }, [])
  useEffect(() => api?.onAuth(setUser), [api])

  let view
  if (!api || user === undefined) view = <main className="page center-page"><img className="splash" src="/icon.svg" alt="" width="72" /></main>
  else if (!user) view = <Login api={api} />
  else if (page === 'room' && param) view = <Room key={param} api={api} user={user} id={normalizeCode(param)} />
  else if (page === 'join' && param) view = <Join key={param} api={api} user={user} id={normalizeCode(param)} />
  else view = <Home api={api} user={user} />

  return <>{view}<Toast /></>
}
