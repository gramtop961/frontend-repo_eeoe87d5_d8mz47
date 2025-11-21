import { useEffect, useState } from 'react'

function Avatar({ url, name }) {
  return (
    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white overflow-hidden">
      {url ? <img src={url} alt={name} className="w-full h-full object-cover"/> : <span className="text-sm">{name?.[0]?.toUpperCase()}</span>}
    </div>
  )
}

export default function Home({ me, onLogout }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [convos, setConvos] = useState([])
  const [active, setActive] = useState(null)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])

  const backend = import.meta.env.VITE_BACKEND_URL
  const token = localStorage.getItem('token')

  const authHeader = { 'Authorization': `Bearer ${token}` }

  const loadConvos = async () => {
    const res = await fetch(`${backend}/messages/conversations`, { headers: authHeader })
    const data = await res.json()
    if (res.ok) setConvos(data)
  }

  const search = async () => {
    if (!q) { setResults([]); return }
    const res = await fetch(`${backend}/users/search?q=${encodeURIComponent(q)}`, { headers: authHeader })
    const data = await res.json()
    if (res.ok) setResults(data)
  }

  const openChat = async (user) => {
    setActive(user)
    const res = await fetch(`${backend}/messages/with/${user.id}`, { headers: authHeader })
    const data = await res.json()
    if (res.ok) setMessages(data.messages)
  }

  const send = async () => {
    if (!active || !text.trim()) return
    const res = await fetch(`${backend}/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ to_identifier: active.id, kind: 'text', text })
    })
    const data = await res.json()
    if (res.ok) {
      setMessages(prev => [...prev, { id: data.id, sender_id: me.id, receiver_id: active.id, kind: 'text', text, created_at: data.created_at }])
      setText('')
      loadConvos()
    } else {
      alert(data.detail || 'Failed to send')
    }
  }

  const block = async () => {
    if (!active) return
    const res = await fetch(`${backend}/block/${active.id}`, { method: 'POST', headers: authHeader })
    if (res.ok) { alert('Blocked'); setActive(null); loadConvos() }
  }
  const unblock = async () => {
    if (!active) return
    const res = await fetch(`${backend}/block/${active.id}`, { method: 'DELETE', headers: authHeader })
    if (res.ok) { alert('Unblocked'); openChat(active); loadConvos() }
  }

  useEffect(() => { loadConvos() }, [])
  useEffect(() => { const t = setTimeout(search, 300); return () => clearTimeout(t) }, [q])

  return (
    <div className="min-h-screen grid md:grid-cols-[320px_1fr] bg-slate-900 text-white">
      <aside className="border-r border-white/10 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar url={me.avatar_url} name={me.name}/>
          <div>
            <div className="font-semibold">{me.name}</div>
            <div className="text-xs text-blue-200/70">@{me.username}</div>
          </div>
          <button className="ml-auto text-xs text-red-300 hover:text-red-400" onClick={onLogout}>Logout</button>
        </div>

        <div className="relative">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search username, phone, name" className="w-full px-4 py-2 rounded-xl bg-white/10 outline-none placeholder-blue-200/60"/>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-blue-200/60 mb-2">People</div>
          <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
            {results.map(u => (
              <button key={u.id} onClick={()=>openChat(u)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                <Avatar url={u.avatar_url} name={u.name}/>
                <div className="text-left">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-blue-200/70">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-blue-200/60 mb-2">Recent</div>
          <div className="space-y-2 max-h-[30vh] overflow-auto pr-1">
            {convos.map(c => (
              <button key={c.other.id} onClick={()=>openChat(c.other)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                <Avatar url={c.other.avatar_url} name={c.other.name}/>
                <div className="text-left">
                  <div className="font-medium">{c.other.name}</div>
                  <div className="text-xs text-blue-200/70">{c.last.kind==='text'? c.last.text : c.last.kind}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="p-4 flex flex-col h-screen">
        {active ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <Avatar url={active.avatar_url} name={active.name}/>
              <div>
                <div className="font-semibold">{active.name}</div>
                <div className="text-xs text-blue-200/70">@{active.username}</div>
              </div>
              <div className="ml-auto flex gap-2">
                <button className="text-xs bg-white/10 px-3 py-1 rounded-lg hover:bg-white/15" onClick={block}>Block</button>
                <button className="text-xs bg-white/10 px-3 py-1 rounded-lg hover:bg-white/15" onClick={unblock}>Unblock</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto space-y-2 py-3">
              {messages.map(m => (
                <div key={m.id} className={`max-w-[70%] rounded-2xl px-4 py-2 ${m.sender_id===me.id? 'ml-auto bg-blue-600/80' : 'bg-white/10'}`}>
                  {m.kind==='text' ? (
                    <div>{m.text}</div>
                  ) : (
                    <a href={m.media_url} className="underline" target="_blank">{m.kind} attachment</a>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" className="flex-1 px-4 py-3 rounded-xl bg-white/10 outline-none"/>
              <button onClick={send} className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600">Send</button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-blue-200/70">Select a chat or search users to start messaging</div>
        )}
      </main>
    </div>
  )
}
