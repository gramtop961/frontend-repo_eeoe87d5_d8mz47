import { useEffect, useMemo, useRef, useState } from 'react'

function Avatar({ url, name, size = 10 }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-white/10 flex items-center justify-center text-white overflow-hidden`}> 
      {url ? <img src={url} alt={name} className="w-full h-full object-cover"/> : <span className="text-sm">{name?.[0]?.toUpperCase()}</span>}
    </div>
  )
}

function MediaBubble({ m }) {
  if (m.kind === 'image') return <img src={m.media_url} className="max-w-full rounded-xl" />
  if (m.kind === 'video') return (
    <video src={m.media_url} controls className="max-w-full rounded-xl" />
  )
  if (m.kind === 'audio' || m.kind === 'voice') return (
    <audio src={m.media_url} controls className="w-64" />
  )
  return <a href={m.media_url} className="underline" target="_blank" rel="noreferrer">{m.kind} attachment</a>
}

export default function Home({ me: initialMe, onLogout }) {
  const [me, setMe] = useState(initialMe)

  // Search / conversations / chat
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [convos, setConvos] = useState([])
  const [active, setActive] = useState(null)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)

  // Profile editor
  const [pName, setPName] = useState('')
  const [pUsername, setPUsername] = useState('')
  const [pNumber, setPNumber] = useState('')
  const [pBio, setPBio] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const fileInputRef = useRef(null)
  const avatarInputRef = useRef(null)

  const backend = import.meta.env.VITE_BACKEND_URL
  const token = localStorage.getItem('token')
  const authHeader = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token])

  useEffect(() => {
    setMe(initialMe)
    setPName(initialMe?.name || '')
    setPUsername(initialMe?.username || '')
    setPNumber(initialMe?.number || '')
    setPBio(initialMe?.bio || '')
  }, [initialMe])

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

  const sendText = async () => {
    if (!active || !text.trim()) return
    setSending(true)
    const res = await fetch(`${backend}/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ to_identifier: active.id, kind: 'text', text })
    })
    const data = await res.json()
    setSending(false)
    if (res.ok) {
      setMessages(prev => [...prev, { id: data.id, sender_id: me.id, receiver_id: active.id, kind: 'text', text, created_at: data.created_at }])
      setText('')
      loadConvos()
    } else {
      alert(data.detail || 'Failed to send')
    }
  }

  const attachAndSend = async (file) => {
    if (!file || !active) return
    try {
      const form = new FormData()
      form.append('file', file)
      const up = await fetch(`${backend}/upload`, { method: 'POST', headers: authHeader, body: form })
      const upData = await up.json()
      if (!up.ok) throw new Error(upData.detail || 'Upload failed')
      const media_url = `${backend}${upData.url}`
      const kind = upData.kind || 'image'
      const res = await fetch(`${backend}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ to_identifier: active.id, kind, media_url })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Send failed')
      setMessages(prev => [...prev, { id: data.id, sender_id: me.id, receiver_id: active.id, kind, media_url, created_at: data.created_at }])
      loadConvos()
    } catch (e) {
      alert(e.message)
    }
  }

  const onPickFile = () => fileInputRef.current?.click()
  const onPickAvatar = () => avatarInputRef.current?.click()

  const onAvatarSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const form = new FormData()
      form.append('file', file)
      const up = await fetch(`${backend}/upload`, { method: 'POST', headers: authHeader, body: form })
      const upData = await up.json()
      if (!up.ok) throw new Error(upData.detail || 'Upload failed')
      const url = `${backend}${upData.url}`
      const res = await fetch(`${backend}/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ avatar_url: url }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to update')
      setMe(data)
    } catch (e) {
      alert(e.message)
    }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch(`${backend}/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: pName, username: pUsername, number: pNumber, bio: pBio })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to save')
      setMe(data)
      alert('Profile saved')
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingProfile(false)
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
    <div className="min-h-screen grid md:grid-cols-[360px_1fr] bg-slate-900 text-white">
      <aside className="border-r border-white/10 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar url={me.avatar_url} name={me.name} size={12}/>
            <button onClick={onPickAvatar} className="absolute -bottom-1 -right-1 text-[10px] bg-blue-600 rounded-full px-2 py-1">Edit</button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />
          </div>
          <div>
            <div className="font-semibold">{me.name}</div>
            <div className="text-xs text-blue-200/70">@{me.username}</div>
          </div>
          <button className="ml-auto text-xs text-red-300 hover:text-red-400" onClick={onLogout}>Logout</button>
        </div>

        <div className="bg-white/5 rounded-2xl p-3 space-y-2">
          <div className="text-xs uppercase tracking-wide text-blue-200/60">Your profile</div>
          <input value={pName} onChange={e=>setPName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-xl bg-white/10 outline-none" />
          <input value={pUsername} onChange={e=>setPUsername(e.target.value)} placeholder="Username" className="w-full px-3 py-2 rounded-xl bg-white/10 outline-none" />
          <input value={pNumber} onChange={e=>setPNumber(e.target.value)} placeholder="Phone number" className="w-full px-3 py-2 rounded-xl bg-white/10 outline-none" />
          <textarea value={pBio} onChange={e=>setPBio(e.target.value)} placeholder="Bio" className="w-full px-3 py-2 rounded-xl bg-white/10 outline-none" rows={2} />
          <button disabled={savingProfile} onClick={saveProfile} className="w-full text-sm bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl py-2 disabled:opacity-60">{savingProfile? 'Saving...' : 'Save profile'}</button>
        </div>

        <div className="relative">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search username, phone, name" className="w-full px-4 py-2 rounded-xl bg-white/10 outline-none placeholder-blue-200/60"/>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-blue-200/60 mb-2">People</div>
          <div className="space-y-2 max-h-[28vh] overflow-auto pr-1">
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
          <div className="space-y-2 max-h-[22vh] overflow-auto pr-1">
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
                    <MediaBubble m={m} />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <button onClick={onPickFile} title="Attach" className="px-3 py-3 rounded-xl bg-white/10 hover:bg-white/15">+
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={e=>{
                const file = e.target.files?.[0]; if (file) attachAndSend(file); e.target.value='';
              }} />
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" className="flex-1 px-4 py-3 rounded-xl bg-white/10 outline-none"/>
              <button disabled={sending} onClick={sendText} className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 disabled:opacity-60">Send</button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-blue-200/70">Select a chat or search users to start messaging</div>
        )}
      </main>
    </div>
  )
}
