import { useState } from 'react'

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [number, setNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const backend = import.meta.env.VITE_BACKEND_URL

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let res
      if (mode === 'signup') {
        res = await fetch(`${backend}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, number, password })
        })
      } else {
        const identifier = username || number
        res = await fetch(`${backend}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      onAuth({ token: data.token, role: data.role, user: data.user })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{background: 'radial-gradient(1200px 600px at 10% 10%, rgba(59,130,246,0.4), transparent), radial-gradient(1000px 600px at 90% 90%, rgba(168,85,247,0.4), transparent)'}} />
      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Slash Messenger</h1>
        <p className="text-center text-blue-200/80 mb-6">Modern, lightweight, stylish</p>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-xl transition ${mode==='login' ? 'bg-blue-600 text-white' : 'bg-white/5 text-blue-200'}`}>Login</button>
          <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-xl transition ${mode==='signup' ? 'bg-blue-600 text-white' : 'bg-white/5 text-blue-200'}`}>Sign up</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode==='signup' && (
            <input value={name} onChange={e=>setName(e.target.value)} required placeholder="Full name" className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200/70 outline-none" />
          )}
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder={mode==='signup'?'Username':'Username or Number'} className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200/70 outline-none" />
          {mode==='signup' && (
            <input value={number} onChange={e=>setNumber(e.target.value)} required placeholder="Phone number" className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200/70 outline-none" />
          )}
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Password" className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200/70 outline-none" />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition">{loading? 'Please wait...': (mode==='signup'?'Create account':'Login')}</button>
        </form>

        <p className="text-xs text-blue-200/60 mt-4 text-center">Admin can login with username: online911 and password: onlinE@911</p>
      </div>
    </div>
  )
}
