import { useEffect, useMemo, useState } from 'react'

function getBackendBase() {
  const envUrl = import.meta.env.VITE_BACKEND_URL
  if (envUrl) return envUrl
  if (window.__BACKEND_URL) return window.__BACKEND_URL
  // Fallback to known live URL used in this session (safe constant fallback)
  return 'https://ta-01kakdebx0sdad4q2ysmsgb0ak-8000.wo-5obmq44uvor8g9k73vj913lx9.w.modal.host'
}

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [number, setNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [serverOk, setServerOk] = useState(null) // null = unknown, true/false

  const backend = useMemo(() => getBackendBase(), [])

  useEffect(() => {
    // Reset fields and messages when switching modes
    setError('')
    setHint('')
    setPassword('')
    if (mode === 'login') {
      setName('')
      setNumber('')
    }
  }, [mode])

  useEffect(() => {
    if (!backend) {
      setHint('Server URL is not configured. Please set VITE_BACKEND_URL and reload.')
      return
    }
    // Auto-ping on mount to surface connectivity status
    ;(async () => {
      const ok = await pingServer(backend)
      setServerOk(ok)
      if (!ok) setHint('Trying to reach the server... we will retry automatically.')
    })()
  }, [backend])

  async function pingServer(base) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 4500)
    try {
      // ultra-fast ping endpoint
      const res = await fetch(`${base}/ping`, { method: 'GET', signal: controller.signal })
      return res.ok
    } catch (e) {
      return false
    } finally {
      clearTimeout(t)
    }
  }

  async function withRetry(fn, retries = 2) {
    let lastErr
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn()
      } catch (e) {
        lastErr = e
        // small backoff
        await new Promise(r => setTimeout(r, 500 * (i + 1)))
      }
    }
    throw lastErr
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setHint('')

    if (!backend) {
      setError('Backend is not reachable. Please try again in a moment.')
      return
    }

    if (mode === 'login' && (!username.trim() || !password)) {
      setError('Please enter your username/phone and password')
      return
    }
    if (mode === 'signup') {
      if (!name.trim() || !username.trim() || !number.trim() || !password) {
        setError('Please fill in all signup fields')
        return
      }
    }

    setLoading(true)
    try {
      const alive = await pingServer(backend)
      setServerOk(alive)
      if (!alive) throw new Error('Could not reach the server')

      let res
      if (mode === 'signup') {
        res = await withRetry(() => fetch(`${backend}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, number, password })
        }))
      } else {
        const identifier = username.trim()
        res = await withRetry(() => fetch(`${backend}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        }))
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'Failed to authenticate')
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      onAuth && onAuth({ token: data.token, role: data.role, user: data.user })
    } catch (err) {
      const msg = String(err.message || '')
      if (msg.toLowerCase().includes('reach the server') || msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        setError('Could not reach the server. Please check your connection and try again.')
        setHint(`Server: ${backend}`)
      } else {
        setError(msg || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{background: 'radial-gradient(1200px 600px at 10% 10%, rgba(59,130,246,0.4), transparent), radial-gradient(1000px 600px at 90% 90%, rgba(168,85,247,0.4), transparent)'}} />
      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Slash Messenger</h1>
        <p className="text-center text-blue-200/80 mb-6">Modern, lightweight, stylish</p>

        {/* Server status indicator */}
        <div className="mb-4 text-sm">
          {serverOk === null && (
            <span className="text-blue-200/80">Checking server…</span>
          )}
          {serverOk === true && (
            <span className="text-emerald-300">Server reachable</span>
          )}
          {serverOk === false && (
            <span className="text-amber-300">Server not reachable yet. Retrying on submit…</span>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 rounded-xl transition ${mode==='login' ? 'bg-blue-600 text-white' : 'bg-white/5 text-blue-200 hover:bg-white/10'}`}>Login</button>
          <button type="button" onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-xl transition ${mode==='signup' ? 'bg-blue-600 text-white' : 'bg-white/5 text-blue-200 hover:bg-white/10'}`}>Sign up</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode==='signup' && (
            <input value={name} onChange={e=>setName(e.target.value)} required placeholder="Full name" className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200/70 outline-none" />
          )}

          {/* For login, this field serves as Username or Phone */}
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder={mode==='signup'?'Username':'Username or Phone'} className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200/70 outline-none" />

          {mode==='signup' && (
            <input value={number} onChange={e=>setNumber(e.target.value)} required placeholder="Phone number" className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200/70 outline-none" />
          )}

          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Password" className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200/70 outline-none" />

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {hint && <div className="text-yellow-300 text-xs">{hint}</div>}

          <button disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition disabled:opacity-60">{loading? 'Please wait...': (mode==='signup'?'Create account':'Login')}</button>
        </form>

        <div className="mt-4 text-xs text-blue-200/70 space-y-1">
          <p>Admin login: username <span className="font-mono">online911</span> and password <span className="font-mono">onlinE@911</span></p>
          {backend ? (
            <p>Server: <span className="font-mono break-all">{backend}</span></p>
          ) : (
            <p className="text-amber-300">No server URL configured</p>
          )}
        </div>
      </div>
    </div>
  )
}
