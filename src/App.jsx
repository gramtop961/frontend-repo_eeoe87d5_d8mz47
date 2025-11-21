import { useEffect, useState } from 'react'
import Auth from './components/Auth'
import Home from './components/Home'
import AdminPanel from './components/AdminPanel'

function App() {
  const [session, setSession] = useState(null)
  const [me, setMe] = useState(null)

  const backend = import.meta.env.VITE_BACKEND_URL

  const fetchMe = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    const res = await fetch(`${backend}/me`, { headers: { 'Authorization': `Bearer ${token}` } })
    if (!res.ok) { localStorage.removeItem('token'); localStorage.removeItem('role'); setSession(null); return }
    const data = await res.json()
    setMe(data)
    setSession({ token, role: localStorage.getItem('role') || 'user' })
  }

  useEffect(() => { fetchMe() }, [])

  if (!session) return <Auth onAuth={fetchMe} />

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.reload() }

  if (session.role === 'admin') return <AdminPanel />

  return <Home me={me || {}} onLogout={logout} />
}

export default App
