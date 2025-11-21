import { useEffect, useState } from 'react'

export default function AdminPanel() {
  const backend = import.meta.env.VITE_BACKEND_URL
  const token = localStorage.getItem('token')
  const authHeader = { 'Authorization': `Bearer ${token}` }

  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [ru, rl] = await Promise.all([
      fetch(`${backend}/admin/users`, { headers: authHeader }),
      fetch(`${backend}/admin/logs`, { headers: authHeader })
    ])
    const u = await ru.json()
    const l = await rl.json()
    if (ru.ok) setUsers(u)
    if (rl.ok) setLogs(l)
    setLoading(false)
  }

  const suspend = async (id) => {
    const res = await fetch(`${backend}/admin/suspend/${id}`, { method: 'POST', headers: authHeader })
    if (res.ok) load()
  }
  const activate = async (id) => {
    const res = await fetch(`${backend}/admin/activate/${id}`, { method: 'POST', headers: authHeader })
    if (res.ok) load()
  }

  const downloadBackup = () => {
    window.open(`${backend}/admin/backup.pdf?token=${token}`, '_blank')
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="p-6 text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <button onClick={downloadBackup} className="ml-auto bg-white/10 px-3 py-1 rounded-lg hover:bg-white/15">Download PDF Backup</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-sm uppercase tracking-wide text-blue-200/60 mb-3">Users</div>
          <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div>
                  <div className="font-semibold">{u.name} @{u.username}</div>
                  <div className="text-xs text-blue-200/70">Active: {String(u.is_active)} | Admin: {String(u.is_admin)} | IP: {u.last_ip || '-'}</div>
                </div>
                <div className="ml-auto flex gap-2">
                  {u.is_active ? (
                    <button className="text-xs bg-red-600/80 px-3 py-1 rounded-lg" onClick={()=>suspend(u.id)}>Suspend</button>
                  ) : (
                    <button className="text-xs bg-green-600/80 px-3 py-1 rounded-lg" onClick={()=>activate(u.id)}>Activate</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-sm uppercase tracking-wide text-blue-200/60 mb-3">Admin Activity</div>
          <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
            {logs.map(l => (
              <div key={l.id} className="p-2 bg-white/5 rounded-xl">
                <div className="font-semibold">{l.action}</div>
                <div className="text-xs text-blue-200/70">Target: {l.target_id} | When: {new Date(l.created_at).toLocaleString()}</div>
                <div className="text-xs text-blue-200/80">{l.details}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
