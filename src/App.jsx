import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, animalsHelpers, commentsHelpers } from './lib/supabase'
import { uploadImage } from './lib/cloudinary'
import { useAnimals } from './hooks/useAnimals'
import { useAuth, AuthProvider } from './hooks/useAuth'
import { TYPE_CONFIG, SOURCE_CONFIG, ZONES } from './lib/seedData'

// ── FORMAT DATE ───────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return ''
  const diff = Math.floor((new Date() - new Date(d)) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return `Hace ${diff} días`
}

// ── GLOBAL STYLES ─────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --primary: #FF6B2C; --primary-dark: #E55A1F; --primary-light: #FFF0E8;
        --secondary: #1A1A2E; --accent: #00D4AA;
        --bg: #F8F7F4; --card: #FFFFFF; --border: #EDEBE6;
        --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
        --shadow-md: 0 8px 24px rgba(0,0,0,0.10);
        --shadow-lg: 0 20px 60px rgba(0,0,0,0.15);
        --radius: 16px; --radius-sm: 10px; --radius-lg: 24px;
      }
      html { scroll-behavior: smooth; }
      body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: #1A1A2E; -webkit-font-smoothing: antialiased; }
      .sora { font-family: 'Sora', sans-serif; }
      ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #DEDBD5; border-radius: 99px; }

      @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes slideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      @keyframes glow { 0%,100%{box-shadow:0 0 0 0 rgba(255,107,44,.4)} 50%{box-shadow:0 0 0 10px rgba(255,107,44,0)} }

      .fade-up { animation: fadeUp .4s ease forwards; }
      .fade-in { animation: fadeIn .3s ease forwards; }
      .slide-up { animation: slideUp .4s cubic-bezier(.16,1,.3,1) forwards; }
      .spin { animation: spin 1s linear infinite; }
      .bounce-slow { animation: bounce 2.5s ease-in-out infinite; }
      .glow-btn { animation: glow 2s ease-in-out infinite; }

      .glass { background: rgba(255,255,255,.88); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,.6); }
      .card-lift { transition: transform .25s ease, box-shadow .25s ease; }
      .card-lift:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }

      .skeleton { background: linear-gradient(90deg,#f0ede8 25%,#fafaf8 50%,#f0ede8 75%); background-size:200% 100%; animation: shimmer 1.4s infinite; }
      @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }

      .input { width:100%; border:2px solid var(--border); border-radius:var(--radius-sm); padding:11px 14px; font-size:14px; font-family:'DM Sans',sans-serif; background:white; color:#1A1A2E; outline:none; transition:border-color .2s, box-shadow .2s; }
      .input:focus { border-color:var(--primary); box-shadow:0 0 0 4px rgba(255,107,44,.1); }
      .input::placeholder { color:#B0ADA8; }
      .select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:36px; cursor:pointer; }

      .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:11px 18px; border-radius:var(--radius-sm); font-weight:600; font-size:14px; font-family:'DM Sans',sans-serif; border:none; cursor:pointer; transition:all .2s; }
      .btn-primary { background:var(--primary); color:white; box-shadow:0 4px 14px rgba(255,107,44,.3); }
      .btn-primary:hover { background:var(--primary-dark); transform:translateY(-1px); box-shadow:0 6px 18px rgba(255,107,44,.4); }
      .btn-ghost { background:white; color:#6B7280; border:2px solid var(--border); }
      .btn-ghost:hover { background:#F9F7F4; color:#1A1A2E; }
      .btn-dark { background:#1A1A2E; color:white; box-shadow:0 4px 14px rgba(26,26,46,.25); }
      .btn-dark:hover { background:#2D2D4E; transform:translateY(-1px); }

      .tag { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:600; }
      .badge { position:absolute; top:-5px; right:-5px; min-width:18px; height:18px; border-radius:99px; background:var(--primary); color:white; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; border:2px solid white; }

      .live-dot { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#10B981; }
      .live-dot::before { content:''; width:7px; height:7px; border-radius:50%; background:#10B981; display:inline-block; animation:pulse 1.5s ease-in-out infinite; }

      .stagger > * { opacity:0; animation: fadeUp .35s ease forwards; }
      .stagger > *:nth-child(1){animation-delay:.04s} .stagger > *:nth-child(2){animation-delay:.08s}
      .stagger > *:nth-child(3){animation-delay:.12s} .stagger > *:nth-child(4){animation-delay:.16s}
      .stagger > *:nth-child(5){animation-delay:.20s} .stagger > *:nth-child(6){animation-delay:.24s}

      .leaflet-container { font-family:'DM Sans',sans-serif !important; border-radius:var(--radius-lg); }
      .leaflet-popup-content-wrapper { border-radius:14px !important; box-shadow:var(--shadow-md) !important; font-family:'DM Sans',sans-serif !important; }
    `}</style>
  )
}

// ── AUTH MODAL ────────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // login | register
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true); setError(null)
    try {
      if (mode === 'login') {
        const { error } = await signIn({ email: form.email, password: form.password })
        if (error) throw error
        onClose()
      } else {
        const { error } = await signUp({ email: form.email, password: form.password, fullName: form.fullName, phone: form.phone })
        if (error) throw error
        setSuccess('¡Registro exitoso! Revisá tu email para confirmar tu cuenta.')
      }
    } catch (err) {
      setError(err.message || 'Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,26,46,.7)', zIndex:80, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose} className="fade-in">
      <div style={{ background:'white', borderRadius:24, width:'100%', maxWidth:400, overflow:'hidden', boxShadow:'0 30px 80px rgba(0,0,0,.25)' }} onClick={e=>e.stopPropagation()} className="slide-up">
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1A1A2E,#2D2D4E)', padding:'28px 24px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🐾</div>
          <div className="sora" style={{ fontSize:20, fontWeight:800, color:'white' }}>AnimalFinder</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginTop:4 }}>
            {mode === 'login' ? 'Iniciá sesión en tu cuenta' : 'Creá tu cuenta gratuita'}
          </div>
        </div>

        <div style={{ padding:24 }}>
          {/* Tabs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, background:'#F8F7F4', borderRadius:10, padding:4, marginBottom:20 }}>
            {[['login','Ingresar'],['register','Registrarse']].map(([id, label]) => (
              <button key={id} onClick={() => { setMode(id); setError(null); setSuccess(null) }} style={{
                padding:'9px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, fontFamily:"'DM Sans',sans-serif", transition:'all .2s',
                background: mode === id ? 'white' : 'transparent',
                color: mode === id ? '#1A1A2E' : '#9CA3AF',
                boxShadow: mode === id ? '0 2px 8px rgba(0,0,0,.08)' : 'none'
              }}>{label}</button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {mode === 'register' && (
              <input className="input" placeholder="Tu nombre completo" value={form.fullName} onChange={e => update('fullName', e.target.value)} />
            )}
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => update('email', e.target.value)} />
            <input className="input" type="password" placeholder="Contraseña" value={form.password} onChange={e => update('password', e.target.value)} />
            {mode === 'register' && (
              <input className="input" type="tel" placeholder="Teléfono (opcional)" value={form.phone} onChange={e => update('phone', e.target.value)} />
            )}

            {error && <div style={{ background:'#FFF0F1', border:'1px solid #FFD5D8', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#C0392B' }}>⚠️ {error}</div>}
            {success && <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#065F46' }}>✅ {success}</div>}

            <button onClick={handleSubmit} className="btn btn-dark" style={{ width:'100%', marginTop:4 }} disabled={loading}>
              {loading ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%' }} className="spin" /> Procesando...</> : mode === 'login' ? 'Ingresar →' : 'Crear cuenta →'}
            </button>

            <button onClick={onClose} className="btn btn-ghost" style={{ width:'100%' }}>Cancelar</button>
          </div>

          <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#9CA3AF' }}>
            AnimalFinder Salta · por <strong style={{ color:'var(--primary)' }}>Emmanuel Farías</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ANIMAL CARD ───────────────────────────────────────────────────────────────
function AnimalCard({ animal, onOpen, onFav, favs, delay = 0 }) {
  const isFav = favs.includes(animal.id)
  const src = SOURCE_CONFIG[animal.source] || SOURCE_CONFIG.manual
  const c = TYPE_CONFIG[animal.type]

  return (
    <div className="card-lift" onClick={() => onOpen(animal)} style={{
      background:'white', borderRadius:20, overflow:'hidden',
      boxShadow:'var(--shadow-sm)', cursor:'pointer', border:'1px solid var(--border)',
      opacity:0, animation:`fadeUp .4s ease ${delay}s forwards`
    }}>
      <div style={{ position:'relative', height:196, overflow:'hidden' }}>
        <img src={animal.photos?.[0]} alt={animal.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .5s ease' }}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.07)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.38) 0%,transparent 55%)' }} />
        <div style={{ position:'absolute', top:10, left:10 }}>
          <span className="tag" style={{ background:c.bg, color:c.text, border:`1px solid ${c.color}33`, fontSize:11 }}>{c.icon} {c.label}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onFav(animal.id) }} style={{
          position:'absolute', top:10, right:10, width:32, height:32, borderRadius:'50%',
          background: isFav ? 'var(--primary)' : 'rgba(255,255,255,.9)', border:'none',
          cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all .2s', boxShadow:'0 2px 8px rgba(0,0,0,.15)'
        }}>{isFav ? '♥' : '♡'}</button>
        {animal.reward && (
          <div style={{ position:'absolute', bottom:10, right:10, background:'#F59E0B', color:'white', fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:99 }}>💰 Recompensa</div>
        )}
        {animal.verified && (
          <div style={{ position:'absolute', bottom:10, left:10, background:'rgba(16,185,129,.92)', color:'white', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99 }}>✓ Verificado</div>
        )}
      </div>

      <div style={{ padding:'13px 15px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div className="sora" style={{ fontWeight:800, fontSize:15, color:'#1A1A2E' }}>{animal.name}</div>
            <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>{animal.breed} · {animal.color}</div>
          </div>
          <div style={{ fontSize:11, color:'#B0ADA8', flexShrink:0, marginLeft:8 }}>{formatDate(animal.date)}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:8, fontSize:12, color:'#6B7280' }}>
          <span>📍</span>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{animal.zone}</span>
        </div>
        <p style={{ fontSize:12, color:'#4B5563', marginTop:7, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', lineHeight:1.55 }}>
          {animal.description}
        </p>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, paddingTop:9, borderTop:'1px solid var(--border)' }}>
          <span style={{ fontSize:11, color:'#B0ADA8' }}>👁 {animal.views} · ❤️ {animal.likes}</span>
          <span style={{ fontSize:11, fontWeight:700, color:src.color }}>{src.icon} {src.label}</span>
        </div>
      </div>
    </div>
  )
}

// ── AI ANALYSIS ───────────────────────────────────────────────────────────────
function AIAnalysis({ animal, onClose }) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: `Sos un experto en mascotas perdidas en Argentina. Analizá este caso y respondé SOLO con JSON válido sin markdown:
Animal: ${animal.name} (${animal.species} ${animal.breed}), ${animal.color}, ${animal.size}
Tipo: ${animal.type} | Zona: ${animal.zone}, Salta | Fecha: ${animal.date}
Descripción: ${animal.description}

{"urgencia":"alta|media|baja","probabilidad":0-100,"resumen":"1 oración","consejos":["...","...","..."],"zonas_busqueda":["zona1","zona2"],"alerta":"texto o null"}` }]
          })
        })
        const data = await res.json()
        const text = data.content?.[0]?.text || '{}'
        setResult(JSON.parse(text.replace(/```json|```/g, '').trim()))
      } catch {
        setError('No se pudo conectar con el análisis IA.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [animal])

  const urgColor = { alta: '#FF4757', media: '#F59E0B', baja: '#10B981' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,26,46,.72)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose} className="fade-in">
      <div style={{ background:'white', borderRadius:24, width:'100%', maxWidth:460, maxHeight:'88vh', overflow:'auto', boxShadow:'0 30px 80px rgba(0,0,0,.3)' }} onClick={e=>e.stopPropagation()} className="slide-up">
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#8B5CF6,#6366F1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
            <div>
              <div className="sora" style={{ fontWeight:800, fontSize:15 }}>Análisis con IA</div>
              <div style={{ fontSize:11, color:'#9CA3AF' }}>Claude · AnimalFinder AI Engine</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', border:'none', background:'#F0EDE8', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>

        <div style={{ padding:22 }}>
          {loading && <div style={{ textAlign:'center', padding:'36px 0' }}>
            <div style={{ width:44, height:44, border:'4px solid #F0EDE8', borderTopColor:'#8B5CF6', borderRadius:'50%', margin:'0 auto 14px' }} className="spin" />
            <div style={{ fontWeight:600, color:'#1A1A2E', marginBottom:4 }}>Analizando caso con IA...</div>
            <div style={{ fontSize:13, color:'#9CA3AF' }}>Procesando con Claude API</div>
          </div>}

          {error && <div style={{ background:'#FFF0F1', border:'1px solid #FFD5D8', borderRadius:12, padding:14, color:'#C0392B', fontSize:13 }}>⚠️ {error}</div>}

          {result && <div style={{ display:'flex', flexDirection:'column', gap:14 }} className="stagger">
            <div style={{ background:'linear-gradient(135deg,#F5F3FF,#EDE9FE)', borderRadius:14, padding:14, border:'1px solid #DDD6FE' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6D28D9', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Resumen IA</div>
              <div style={{ fontSize:13, color:'#1A1A2E', lineHeight:1.6 }}>{result.resumen}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'#FAFAF8', borderRadius:12, padding:13, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Urgencia</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:urgColor[result.urgencia] || '#F59E0B' }} />
                  <span style={{ fontWeight:800, fontSize:15, color:urgColor[result.urgencia] || '#F59E0B', textTransform:'capitalize' }}>{result.urgencia}</span>
                </div>
              </div>
              <div style={{ background:'#FAFAF8', borderRadius:12, padding:13, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Prob. Recuperación</div>
                <div className="sora" style={{ fontWeight:900, fontSize:22, color:'#10B981' }}>{result.probabilidad}%</div>
              </div>
            </div>
            {result.alerta && <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:13, display:'flex', gap:10 }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div style={{ fontSize:13, color:'#92400E', lineHeight:1.5 }}>{result.alerta}</div>
            </div>}
            {result.consejos?.length > 0 && <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1A1A2E', marginBottom:8 }}>💡 Consejos</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {result.consejos.map((c, i) => (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', background:'#F9F7F4', borderRadius:10, padding:11 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--primary)', color:'white', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    <div style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>{c}</div>
                  </div>
                ))}
              </div>
            </div>}
            {result.zonas_busqueda?.length > 0 && <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1A1A2E', marginBottom:7 }}>📍 Zonas sugeridas</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {result.zonas_busqueda.map((z, i) => <span key={i} className="tag" style={{ background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE' }}>📍 {z}</span>)}
              </div>
            </div>}
            <div style={{ fontSize:11, color:'#B0ADA8', textAlign:'center', paddingTop:8, borderTop:'1px solid var(--border)' }}>
              Powered by Claude AI · AnimalFinder v2.0 · por Emmanuel Farías
            </div>
          </div>}
        </div>
      </div>
    </div>
  )
}

// ── ANIMAL MODAL ──────────────────────────────────────────────────────────────
function AnimalModal({ animal, onClose, onFav, favs }) {
  const { user } = useAuth()
  const [showAI, setShowAI] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (!animal) return null
  const isFav = favs.includes(animal.id)
  const c = TYPE_CONFIG[animal.type]

  const shareWA = () => window.open(`https://wa.me/?text=🐾 *${animal.name}* – ${c.label} en Salta%0A${animal.description?.slice(0,200)}%0A📍 ${animal.address}%0AContacto: ${animal.phone}%0A%0APublicado en AnimalFinder Salta – por Emmanuel Farías%0Ahttps://animalfinder-salta.vercel.app`, '_blank')

  const submitComment = async () => {
    if (!newComment.trim() || !user) return
    setSubmitting(true)
    const { data } = await commentsHelpers.create({ animal_id: animal.id, user_id: user.id, content: newComment })
    if (data) { setComments(prev => [...prev, data]); setNewComment('') }
    setSubmitting(false)
  }

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(26,26,46,.65)', zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose} className="fade-in">
        <div style={{ background:'white', width:'100%', maxWidth:580, maxHeight:'92vh', overflow:'auto', borderRadius:'22px 22px 0 0', boxShadow:'0 -20px 60px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()} className="slide-up">
          {/* Hero */}
          <div style={{ position:'relative', height:250 }}>
            <img src={animal.photos?.[0]} alt={animal.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 55%)' }} />
            <button onClick={onClose} style={{ position:'absolute', top:14, right:14, width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.9)', border:'none', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            <div style={{ position:'absolute', top:14, left:14 }}>
              <span className="tag" style={{ background:c.bg, color:c.text, border:`1px solid ${c.color}33` }}>{c.icon} {c.label}</span>
            </div>
            {animal.verified && <div style={{ position:'absolute', bottom:14, left:14, background:'rgba(16,185,129,.92)', color:'white', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99 }}>✓ Verificado por AnimalFinder</div>}
          </div>

          <div style={{ padding:'20px 22px 32px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <h2 className="sora" style={{ fontSize:24, fontWeight:900, color:'#1A1A2E' }}>{animal.name}</h2>
                <p style={{ fontSize:13, color:'#6B7280', marginTop:3 }}>{animal.breed} · {animal.color} · {animal.size} · {animal.age}</p>
              </div>
              <button onClick={() => onFav(animal.id)} style={{ width:42, height:42, borderRadius:'50%', border:`2px solid ${isFav?'var(--primary)':'var(--border)'}`, background:isFav?'var(--primary)':'white', cursor:'pointer', fontSize:19, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', flexShrink:0 }}>
                {isFav ? '♥' : '♡'}
              </button>
            </div>

            {animal.reward && <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:13, padding:'11px 15px', display:'flex', alignItems:'center', gap:11, marginBottom:14 }}>
              <span style={{ fontSize:26 }}>💰</span>
              <div><div style={{ fontWeight:700, fontSize:13, color:'#92400E' }}>Recompensa ofrecida</div><div style={{ fontSize:12, color:'#B45309', marginTop:2 }}>{animal.reward}</div></div>
            </div>}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:13 }}>
              {[['Especie / Género', `${animal.species} · ${animal.gender}`], ['Publicado', formatDate(animal.date)]].map(([label, value]) => (
                <div key={label} style={{ background:'#FAFAF8', borderRadius:11, padding:'11px 13px', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, color:'#B0ADA8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1A1A2E', textTransform:'capitalize' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background:'#FAFAF8', borderRadius:11, padding:'11px 14px', border:'1px solid var(--border)', marginBottom:13 }}>
              <div style={{ fontSize:10, color:'#B0ADA8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>📍 Ubicación</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#1A1A2E' }}>{animal.address}</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{animal.zone}</div>
            </div>

            <div style={{ marginBottom:13 }}>
              <div style={{ fontSize:10, color:'#B0ADA8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:7 }}>Descripción</div>
              <p style={{ fontSize:13, color:'#374151', lineHeight:1.7 }}>{animal.description}</p>
            </div>

            {/* AI Button */}
            <button onClick={() => setShowAI(true)} style={{ width:'100%', background:'linear-gradient(135deg,#8B5CF6,#6366F1)', color:'white', border:'none', borderRadius:12, padding:'12px 18px', fontWeight:700, fontSize:13, cursor:'pointer', marginBottom:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:"'DM Sans',sans-serif", boxShadow:'0 4px 14px rgba(139,92,246,.32)' }}>
              🤖 Analizar con Inteligencia Artificial
            </button>

            {/* Contact */}
            <div style={{ background:'linear-gradient(135deg,#FFF0E8,#FFF9F5)', border:'1px solid #FFD5B0', borderRadius:13, padding:'14px 16px', marginBottom:13 }}>
              <div style={{ fontSize:10, color:'var(--primary)', fontWeight:800, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:7 }}>📞 Contacto</div>
              <div style={{ fontWeight:700, fontSize:15, color:'#1A1A2E' }}>{animal.user || animal.profiles?.full_name || 'Usuario AnimalFinder'}</div>
              <div style={{ fontSize:13, color:'#6B7280', marginTop:3 }}>Tel: {animal.phone}</div>
            </div>

            {/* Actions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <button onClick={shareWA} className="btn" style={{ background:'#25D366', color:'white', boxShadow:'0 4px 14px rgba(37,211,102,.3)' }}>💬 WhatsApp</button>
              <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=https://animalfinder-salta.vercel.app`,'_blank')} className="btn" style={{ background:'#1877F2', color:'white', boxShadow:'0 4px 14px rgba(24,119,242,.3)' }}>📘 Compartir</button>
            </div>

            {/* Comments */}
            {user && <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>💬 Pistas y comentarios</div>
              {comments.map((cm, i) => (
                <div key={i} style={{ background:'#F9F7F4', borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--primary)' }}>{cm.profiles?.full_name || 'Usuario'}</div>
                  <div style={{ fontSize:13, color:'#374151', marginTop:3 }}>{cm.content}</div>
                </div>
              ))}
              <div style={{ display:'flex', gap:8 }}>
                <input className="input" placeholder="Dejá una pista o comentario..." value={newComment} onChange={e => setNewComment(e.target.value)} style={{ flex:1 }} />
                <button onClick={submitComment} className="btn btn-primary" disabled={submitting}>Enviar</button>
              </div>
            </div>}

            <button onClick={onClose} className="btn btn-ghost" style={{ width:'100%', marginTop:10 }}>Cerrar</button>
          </div>
        </div>
      </div>
      {showAI && <AIAnalysis animal={animal} onClose={() => setShowAI(false)} />}
    </>
  )
}

// ── PUBLISH MODAL ─────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
    <div><label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }}>{label}</label>{children}</div>
  )
function PublishModal({ onClose, onPublish }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ type:'perdido', species:'perro', name:'', breed:'', color:'', size:'mediano', age:'', gender:'macho', zone:'Centro Histórico', address:'', description:'', phone: profile?.phone || '', reward:'' })
  const [step, setStep] = useState(1)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()
  const update = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), [])
  const [step, setStep] = useState(1)

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.phone) { alert('Completá nombre, descripción y teléfono.'); return }
    setLoading(true)
    try {
      let photoUrl = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'

      // Subir a Cloudinary si hay imagen
      if (imageFile) {
        try {
          const result = await uploadImage(imageFile, setUploadProgress)
          photoUrl = result.url
        } catch {
          if (imagePreview) photoUrl = imagePreview
        }
      }

      const animalData = {
        ...form,
        user_id: user?.id || null,
        photos: [photoUrl],
        date: new Date().toISOString().split('T')[0],
        lat: -24.787 + (Math.random() - 0.5) * 0.05,
        lng: -65.409 + (Math.random() - 0.5) * 0.05,
        source: 'manual',
        verified: false,
        likes: 0,
        views: 0,
        user: profile?.full_name || 'Usuario AnimalFinder'
      }

      // Guardar en Supabase
      let savedAnimal = { ...animalData, id: Date.now().toString() }
      if (user) {
        const { data } = await animalsHelpers.create(animalData)
        if (data) savedAnimal = data
      }

      onPublish(savedAnimal)
      onClose()
    } catch (err) {
      alert('Error al publicar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, children }) => (
    <div><label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }}>{label}</label>{children}</div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,26,46,.65)', zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center' }} className="fade-in">
      <div style={{ background:'white', width:'100%', maxWidth:540, maxHeight:'92vh', overflow:'auto', borderRadius:'22px 22px 0 0', boxShadow:'0 -20px 60px rgba(0,0,0,.2)' }} className="slide-up">
        <div style={{ padding:'18px 22px 0', position:'sticky', top:0, background:'white', zIndex:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <h2 className="sora" style={{ fontSize:19, fontWeight:800, color:'#1A1A2E' }}>Publicar aviso</h2>
              <p style={{ fontSize:12, color:'#B0ADA8', marginTop:2 }}>Paso {step} de 2</p>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%', border:'none', background:'#F0EDE8', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
          <div style={{ height:3, background:'var(--border)', borderRadius:99, marginBottom:18, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${step/2*100}%`, background:'var(--primary)', borderRadius:99, transition:'width .3s ease' }} />
          </div>
        </div>

        <div style={{ padding:'0 22px 30px', display:'flex', flexDirection:'column', gap:14 }}>
          {step === 1 && <div style={{ display:'flex', flexDirection:'column', gap:14 }} className="stagger">
            <Field label="Tipo de aviso *">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
                {['perdido','encontrado','adopcion'].map(t => (
                  <button key={t} onClick={() => update('type', t)} style={{ padding:'9px 4px', borderRadius:11, fontSize:12, fontWeight:700, border:`2px solid ${form.type===t?'var(--primary)':'var(--border)'}`, background:form.type===t?'var(--primary)':'white', color:form.type===t?'white':'#6B7280', cursor:'pointer', transition:'all .2s', fontFamily:"'DM Sans',sans-serif" }}>
                    {TYPE_CONFIG[t].icon}<br/>{TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
              <Field label="Especie *"><select className="input select" value={form.species} onChange={e=>update('species',e.target.value)}><option value="perro">🐶 Perro</option><option value="gato">🐱 Gato</option><option value="otro">🐾 Otro</option></select></Field>
              <Field label="Género *"><select className="input select" value={form.gender} onChange={e=>update('gender',e.target.value)}><option value="macho">Macho</option><option value="hembra">Hembra</option><option value="desconocido">Desconocido</option></select></Field>
            </div>
            <Field label="Nombre"><input className="input" placeholder="Coco, Luna, Sin nombre..." value={form.name} onChange={e=>update('name',e.target.value)} /></Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
              <Field label="Raza"><input className="input" placeholder="Mestizo, Labrador..." value={form.breed} onChange={e=>update('breed',e.target.value)} /></Field>
              <Field label="Color"><input className="input" placeholder="Negro, blanco..." value={form.color} onChange={e=>update('color',e.target.value)} /></Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
              <Field label="Tamaño"><select className="input select" value={form.size} onChange={e=>update('size',e.target.value)}><option value="pequeño">Pequeño</option><option value="mediano">Mediano</option><option value="grande">Grande</option></select></Field>
              <Field label="Edad aprox."><input className="input" placeholder="3 meses, 2 años..." value={form.age} onChange={e=>update('age',e.target.value)} /></Field>
            </div>
            <Field label="Foto del animal">
              <div onClick={() => fileRef.current?.click()} style={{ border:'2px dashed var(--border)', borderRadius:12, padding:18, textAlign:'center', cursor:'pointer', background:'#FAFAF8', transition:'border-color .2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                {imagePreview ? <img src={imagePreview} alt="preview" style={{ height:80, borderRadius:8, objectFit:'cover' }} /> : <><div style={{ fontSize:30, marginBottom:6 }}>📸</div><div style={{ fontSize:13, color:'#B0ADA8', fontWeight:600 }}>Tocá para subir foto</div><div style={{ fontSize:11, color:'#C9C7C2', marginTop:3 }}>Se sube a Cloudinary</div></>}
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
              </div>
            </Field>
            <button onClick={() => setStep(2)} className="btn btn-dark" style={{ width:'100%' }}>Siguiente →</button>
          </div>}

          {step === 2 && <div style={{ display:'flex', flexDirection:'column', gap:14 }} className="stagger">
            <Field label="Zona / Barrio *"><select className="input select" value={form.zone} onChange={e=>update('zone',e.target.value)}>{ZONES.slice(1).map(z=><option key={z} value={z}>{z}</option>)}</select></Field>
            <Field label="Dirección aproximada"><input className="input" placeholder="Av. Entre Ríos y Mitre" value={form.address} onChange={e=>update('address',e.target.value)} /></Field>
            <Field label="Descripción *"><textarea className="input" style={{ height:95, resize:'none' }} placeholder="Describí al animal, señas particulares, cuándo y dónde fue visto..." value={form.description} onChange={e=>update('description',e.target.value)} /></Field>
            <Field label="Teléfono de contacto *"><input className="input" type="tel" placeholder="387-4XXXXXX" value={form.phone} onChange={e=>update('phone',e.target.value)} /></Field>
            {form.type === 'perdido' && <Field label="Recompensa (opcional)"><input className="input" placeholder="Ej: $10.000" value={form.reward} onChange={e=>update('reward',e.target.value)} /></Field>}

            {loading && uploadProgress > 0 && (
              <div>
                <div style={{ fontSize:12, color:'#6B7280', marginBottom:5 }}>Subiendo foto... {uploadProgress}%</div>
                <div style={{ height:4, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${uploadProgress}%`, background:'var(--primary)', transition:'width .3s', borderRadius:99 }} />
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={() => setStep(1)} className="btn btn-ghost">← Atrás</button>
              <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
                {loading ? <><div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%' }} className="spin" /> Publicando...</> : 'Publicar 🐾'}
              </button>
            </div>
          </div>}
        </div>
      </div>
    </div>
  )
}

// ── MAP VIEW ──────────────────────────────────────────────────────────────────
function MapView({ animals, onOpen }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (error || mapInstanceRef.current) return
    const init = () => {
      try {
        if (!window.L) { setError(true); return }
        const L = window.L
        const map = L.map(mapRef.current).setView([-24.787, -65.409], 13)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(map)
        mapInstanceRef.current = map
        animals.forEach(a => {
          const color = TYPE_CONFIG[a.type]?.color || '#FF6B2C'
          const icon = L.divIcon({ className:'', html:`<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:${color};border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.25);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:13px;">${a.species==='gato'?'🐱':'🐶'}</span></div>`, iconSize:[34,34], iconAnchor:[17,34] })
          L.marker([a.lat,a.lng],{icon}).addTo(map)
            .bindPopup(`<div style="font-family:'DM Sans',sans-serif;padding:4px"><b>${a.name}</b><br><span style="color:${color};font-size:12px;font-weight:600">${TYPE_CONFIG[a.type]?.label}</span><br><span style="font-size:12px;color:#6B7280">${a.zone}</span></div>`)
            .on('click', () => onOpen(a))
        })
        setLoaded(true)
      } catch { setError(true) }
    }
    if (window.L) { init(); return }
    const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
    const script = document.createElement('script'); script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload=init; script.onerror=()=>setError(true); document.head.appendChild(script)
  }, [])

  return (
    <div style={{ position:'relative' }}>
      <div ref={mapRef} style={{ width:'100%', height:420, borderRadius:20, overflow:'hidden', border:'1px solid var(--border)' }} />
      {!loaded && !error && <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F8F7F4', borderRadius:20 }}>
        <div style={{ width:38, height:38, border:'4px solid var(--border)', borderTopColor:'var(--primary)', borderRadius:'50%', marginBottom:10 }} className="spin" />
        <div style={{ fontSize:13, color:'#6B7280', fontWeight:600 }}>Cargando mapa...</div>
      </div>}
    </div>
  )
}

// ── STATS BAR ─────────────────────────────────────────────────────────────────
function StatsBar({ animals }) {
  const stats = [
    { label:'Perdidos',    count:animals.filter(a=>a.type==='perdido').length,    bg:'#FFF0F1', text:'#C0392B', border:'#FFD5D8', icon:'🔴' },
    { label:'Encontrados', count:animals.filter(a=>a.type==='encontrado').length, bg:'#EFF6FF', text:'#1D4ED8', border:'#BFDBFE', icon:'🔵' },
    { label:'En Adopción', count:animals.filter(a=>a.type==='adopcion').length,   bg:'#ECFDF5', text:'#065F46', border:'#A7F3D0', icon:'🟢' },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }} className="stagger">
      {stats.map(s => (
        <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:15, padding:'13px 10px', textAlign:'center' }}>
          <div className="sora" style={{ fontSize:25, fontWeight:900, color:'#1A1A2E' }}>{s.count}</div>
          <div style={{ fontSize:11, fontWeight:700, color:s.text, marginTop:2 }}>{s.icon} {s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
function AppContent() {
  const { user, profile, signOut } = useAuth()
  const { animals, loading, lastSync, newCount, addAnimal, refreshAll } = useAnimals()
  const [view, setView] = useState('feed')
  const [filters, setFilters] = useState({ type:'all', species:'all', zone:'Todas las zonas', search:'' })
  const [activeSource, setActiveSource] = useState('all')
  const [selectedAnimal, setSelectedAnimal] = useState(null)
  const [showPublish, setShowPublish] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [favs, setFavs] = useState([])
  const [toast, setToast] = useState(null)
  const [notifs, setNotifs] = useState([
    { icon:'🐾', msg:'Nuevo caso en Barrio Belgrano: gatito negro encontrado', time:'Hace 5 min' },
    { icon:'🔔', msg:'Nala (Golden Retriever) tiene 67 personas ayudando', time:'Hace 12 min' },
    { icon:'✅', msg:'Firulais fue encontrado gracias a AnimalFinder', time:'Hace 1 hora' },
  ])
  const [showNotifs, setShowNotifs] = useState(false)

  const showToast = useCallback((msg, type='success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }, [])

  const toggleFav = useCallback((id) => {
    setFavs(f => {
      const next = f.includes(id) ? f.filter(x=>x!==id) : [...f,id]
      showToast(f.includes(id) ? 'Eliminado de favoritos' : '💛 Guardado en favoritos')
      return next
    })
  }, [showToast])

  const handlePublish = useCallback((data) => {
    addAnimal(data)
    setNotifs(prev => [{ icon:'🆕', msg:`Nuevo aviso: ${data.name} (${TYPE_CONFIG[data.type]?.label})`, time:'Ahora' }, ...prev])
    showToast('✅ ¡Aviso publicado!')
  }, [addAnimal, showToast])

  const updateFilter = useCallback((k, v) => setFilters(f => ({ ...f, [k]: v })), [])

  const filtered = animals.filter(a => {
    if (view === 'adopcion' && a.type !== 'adopcion') return false
    if (view === 'favoritos' && !favs.includes(a.id)) return false
    if (filters.type !== 'all' && a.type !== filters.type) return false
    if (filters.species !== 'all' && a.species !== filters.species) return false
    if (filters.zone !== 'Todas las zonas' && a.zone !== filters.zone) return false
    if (activeSource !== 'all' && a.source !== activeSource) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      return a.name?.toLowerCase().includes(q) || a.breed?.toLowerCase().includes(q) ||
             a.color?.toLowerCase().includes(q) || a.zone?.toLowerCase().includes(q) ||
             a.description?.toLowerCase().includes(q)
    }
    return true
  })

  const tabs = [
    { id:'feed',      icon:'🏠', label:'Inicio',    count:animals.length },
    { id:'map',       icon:'🗺️', label:'Mapa' },
    { id:'adopcion',  icon:'💚', label:'Adopción',  count:animals.filter(a=>a.type==='adopcion').length },
    { id:'favoritos', icon:'💛', label:'Guardados', count:favs.length },
  ]

  const lastSyncStr = lastSync
    ? `${Math.floor((new Date()-lastSync)/60000)} min`
    : 'Ahora'

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <GlobalStyles />

      {/* ── HEADER ── */}
      <header className="glass" style={{ position:'sticky', top:0, zIndex:50, borderBottom:'1px solid rgba(237,235,230,.8)' }}>
        <div style={{ maxWidth:920, margin:'0 auto', padding:'11px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, background:'linear-gradient(135deg,var(--primary),#FF4757)', borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 4px 12px rgba(255,107,44,.35)' }} className="bounce-slow">🐾</div>
            <div>
              <div className="sora" style={{ fontSize:19, fontWeight:900, color:'#1A1A2E', lineHeight:1 }}>AnimalFinder</div>
              <div style={{ fontSize:10, color:'var(--primary)', fontWeight:700, marginTop:1 }}>Salta · por Emmanuel Farías</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div className="live-dot" style={{ fontSize:11 }}>En vivo</div>

            {/* Notifs */}
            <div style={{ position:'relative' }}>
              <button onClick={() => setShowNotifs(v=>!v)} style={{ width:38, height:38, borderRadius:11, border:'1px solid var(--border)', background:'white', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                🔔
                {notifs.length > 0 && <div className="badge">{notifs.length > 9 ? '9+' : notifs.length}</div>}
              </button>
              {showNotifs && (
                <div style={{ position:'absolute', top:46, right:0, width:300, background:'white', borderRadius:18, boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)', overflow:'hidden', zIndex:60 }} className="fade-in">
                  <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div className="sora" style={{ fontWeight:800, fontSize:14 }}>Notificaciones</div>
                    <button onClick={() => { setNotifs([]); setShowNotifs(false) }} style={{ fontSize:11, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Limpiar</button>
                  </div>
                  <div style={{ maxHeight:320, overflow:'auto' }}>
                    {notifs.length === 0
                      ? <div style={{ padding:20, textAlign:'center', color:'#B0ADA8', fontSize:13 }}>Sin notificaciones</div>
                      : notifs.map((n,i) => (
                        <div key={i} style={{ padding:'12px 18px', borderBottom:'1px solid #FAFAF8', display:'flex', gap:10 }}>
                          <span style={{ fontSize:18 }}>{n.icon}</span>
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:'#1A1A2E', lineHeight:1.4 }}>{n.msg}</div>
                            <div style={{ fontSize:10, color:'#B0ADA8', marginTop:2 }}>{n.time}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Auth */}
            {user ? (
              <div style={{ position:'relative' }}>
                <button onClick={() => setShowUserMenu(v=>!v)} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:10, border:'1px solid var(--border)', background:'white', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),#FF4757)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:800 }}>
                    {(profile?.full_name || user.email)?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1A1A2E', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {profile?.full_name?.split(' ')[0] || 'Mi cuenta'}
                  </span>
                </button>
                {showUserMenu && (
                  <div style={{ position:'absolute', top:46, right:0, width:180, background:'white', borderRadius:14, boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)', overflow:'hidden', zIndex:60 }} className="fade-in">
                    <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#1A1A2E' }}>{profile?.full_name || 'Usuario'}</div>
                      <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{user.email}</div>
                    </div>
                    <button onClick={() => { setView('favoritos'); setShowUserMenu(false) }} style={{ width:'100%', padding:'11px 16px', border:'none', background:'none', cursor:'pointer', textAlign:'left', fontSize:13, fontFamily:"'DM Sans',sans-serif", color:'#374151' }}>💛 Mis favoritos</button>
                    <button onClick={() => { signOut(); setShowUserMenu(false) }} style={{ width:'100%', padding:'11px 16px', border:'none', background:'none', cursor:'pointer', textAlign:'left', fontSize:13, fontFamily:"'DM Sans',sans-serif", color:'#FF4757' }}>🚪 Cerrar sesión</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="btn btn-ghost" style={{ fontSize:13, padding:'8px 14px' }}>Ingresar</button>
            )}

            <button onClick={() => { if(!user){setShowAuth(true);showToast('Iniciá sesión para publicar','info');return}; setShowPublish(true) }} className="btn btn-primary glow-btn">
              + Publicar
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth:920, margin:'0 auto', padding:'0 16px 100px' }}>

        {/* Hero */}
        <div style={{ marginTop:18, background:'linear-gradient(135deg,#1A1A2E 0%,#16213E 60%,#0F3460 100%)', borderRadius:22, padding:'26px 22px', color:'white', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-50, right:-50, width:220, height:220, borderRadius:'50%', background:'rgba(255,107,44,.08)' }} />
          <div style={{ position:'absolute', bottom:-40, left:100, width:140, height:140, borderRadius:'50%', background:'rgba(0,212,170,.06)' }} />
          <div style={{ position:'relative' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(16,185,129,.15)', border:'1px solid rgba(16,185,129,.3)', borderRadius:99, padding:'4px 12px', fontSize:11, fontWeight:700, color:'#10B981', marginBottom:12 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', display:'inline-block' }} />
              SISTEMA ACTIVO · {animals.length} avisos · Salta Capital
            </div>
            <h1 className="sora" style={{ fontSize:26, fontWeight:900, lineHeight:1.2, marginBottom:10 }}>
              ¿Perdiste tu mascota?<br />
              <span style={{ color:'#FF6B2C' }}>Encontrala en Salta 🐾</span>
            </h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.65)', marginBottom:16, lineHeight:1.6 }}>
              Plataforma comunitaria con IA · Petfinder · Reddit · ONGs locales
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[['🔴 Perdidos',()=>{setView('feed');updateFilter('type','perdido')},'rgba(255,71,87,.2)','rgba(255,71,87,.4)'],
                ['🟢 Adopción',()=>setView('adopcion'),'rgba(16,185,129,.2)','rgba(16,185,129,.4)'],
                ['🗺️ Ver mapa',()=>setView('map'),'rgba(59,130,246,.2)','rgba(59,130,246,.4)']].map(([label,fn,bg,border])=>(
                <button key={label} onClick={fn} style={{ background:bg, border:`1px solid ${border}`, color:'white', padding:'7px 13px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* New from external sources banner */}
        {newCount > 0 && (
          <div style={{ marginTop:12, background:'linear-gradient(135deg,#8B5CF6,#6366F1)', borderRadius:14, padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white' }} className="fade-up">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>🤖</span>
              <span style={{ fontSize:13, fontWeight:700 }}>{newCount} nuevo{newCount>1?'s':''} aviso{newCount>1?'s':''} detectado{newCount>1?'s':''} de fuentes externas</span>
            </div>
            <button onClick={refreshAll} style={{ background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)', color:'white', padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Ver →</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:7, marginTop:14, overflowX:'auto', paddingBottom:2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setView(t.id); if(t.id!=='adopcion') updateFilter('type','all') }} style={{
              display:'flex', alignItems:'center', gap:6, padding:'9px 15px', borderRadius:11, fontSize:13, fontWeight:700,
              border:'none', cursor:'pointer', whiteSpace:'nowrap', transition:'all .2s', fontFamily:"'DM Sans',sans-serif",
              background: view===t.id ? '#1A1A2E' : 'white',
              color: view===t.id ? 'white' : '#6B7280',
              boxShadow: view===t.id ? '0 4px 14px rgba(26,26,46,.22)' : '0 2px 6px rgba(0,0,0,.04)',
              border: view===t.id ? 'none' : '1px solid var(--border)'
            }}>
              {t.icon} {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span style={{ fontSize:11, fontWeight:800, padding:'2px 7px', borderRadius:99, background:view===t.id?'rgba(255,255,255,.2)':'#F0EDE8', color:view===t.id?'white':'#6B7280' }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        {(view==='feed'||view==='adopcion') && <div style={{ marginTop:18 }}><StatsBar animals={animals} /></div>}

        {/* Filters */}
        {view !== 'map' && (
          <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:14 }}>
            <input type="text" placeholder="🔍 Buscar por nombre, raza, color, barrio..." value={filters.search} onChange={e=>updateFilter('search',e.target.value)} className="input" />
            <div style={{ display:'grid', gridTemplateColumns:view==='feed'?'1fr 1fr 1fr':'1fr 1fr', gap:8 }}>
              {view==='feed' && <select className="input select" value={filters.type} onChange={e=>updateFilter('type',e.target.value)}><option value="all">Todos los tipos</option><option value="perdido">🔴 Perdidos</option><option value="encontrado">🔵 Encontrados</option><option value="adopcion">🟢 En adopción</option></select>}
              <select className="input select" value={filters.species} onChange={e=>updateFilter('species',e.target.value)}><option value="all">Todas las especies</option><option value="perro">🐶 Perros</option><option value="gato">🐱 Gatos</option></select>
              <select className="input select" value={filters.zone} onChange={e=>updateFilter('zone',e.target.value)}>{ZONES.map(z=><option key={z} value={z}>{z}</option>)}</select>
            </div>
            {/* Source filter */}
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
              {[['all','📋 Todos'],['manual','👤 Usuarios'],['ong','🏠 ONGs'],['petfinder','🐾 Petfinder'],['reddit','🔗 Reddit'],['ai','🤖 IA']].map(([id,label])=>(
                <button key={id} onClick={()=>setActiveSource(id)} style={{ padding:'5px 12px', borderRadius:99, fontSize:12, fontWeight:700, border:`1px solid ${activeSource===id?'var(--primary)':'var(--border)'}`, background:activeSource===id?'var(--primary-light)':'white', color:activeSource===id?'var(--primary)':'#6B7280', cursor:'pointer', whiteSpace:'nowrap', transition:'all .2s', fontFamily:"'DM Sans',sans-serif" }}>{label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          {view === 'map' ? (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <h2 className="sora" style={{ fontSize:18, fontWeight:800, color:'#1A1A2E' }}>🗺️ Mapa en tiempo real</h2>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {Object.entries(TYPE_CONFIG).map(([k,v])=>(
                    <span key={k} className="tag" style={{ background:v.bg, color:v.text, border:`1px solid ${v.color}33` }}>{v.icon} {animals.filter(a=>a.type===k).length}</span>
                  ))}
                </div>
              </div>
              <MapView animals={animals} onOpen={setSelectedAnimal} />
              <p style={{ fontSize:11, color:'#B0ADA8', textAlign:'center', marginTop:8 }}>📍 Clic en los marcadores · Salta Capital, Argentina</p>
            </div>

          ) : loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ borderRadius:20, overflow:'hidden', border:'1px solid var(--border)' }}>
                  <div className="skeleton" style={{ height:196 }} />
                  <div style={{ padding:14 }}>
                    <div className="skeleton" style={{ height:16, borderRadius:8, marginBottom:8, width:'70%' }} />
                    <div className="skeleton" style={{ height:12, borderRadius:6, width:'50%' }} />
                  </div>
                </div>
              ))}
            </div>

          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'56px 20px' }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🐾</div>
              <div className="sora" style={{ fontSize:17, fontWeight:800, color:'#1A1A2E', marginBottom:6 }}>No encontramos avisos</div>
              <p style={{ fontSize:13, color:'#B0ADA8', marginBottom:18 }}>Intentá con otros filtros o publicá un aviso nuevo</p>
              <button onClick={() => { setFilters({type:'all',species:'all',zone:'Todas las zonas',search:''}); setActiveSource('all') }} className="btn btn-primary">Limpiar filtros</button>
            </div>

          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <p style={{ fontSize:13, color:'#6B7280', fontWeight:600 }}>{filtered.length} aviso{filtered.length!==1?'s':''} encontrado{filtered.length!==1?'s':''}</p>
                <div className="live-dot" style={{ fontSize:11 }}>Actualizado {lastSyncStr}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(278px,1fr))', gap:15 }}>
                {filtered.map((a,i) => <AnimalCard key={a.id} animal={a} onOpen={setSelectedAnimal} onFav={toggleFav} favs={favs} delay={Math.min(i*0.04,0.3)} />)}
              </div>

              {view==='feed' && (
                <div style={{ marginTop:28, background:'linear-gradient(135deg,#065F46,#047857)', borderRadius:20, padding:'22px', color:'white', textAlign:'center' }}>
                  <div style={{ fontSize:30, marginBottom:8 }}>💚</div>
                  <div className="sora" style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>Animales en adopción</div>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,.75)', marginBottom:14 }}>
                    {animals.filter(a=>a.type==='adopcion').length} animales esperando un hogar en Salta
                  </p>
                  <button onClick={()=>setView('adopcion')} style={{ background:'white', color:'#065F46', padding:'11px 22px', borderRadius:11, fontWeight:800, fontSize:13, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    Ver todos →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop:40, textAlign:'center', paddingBottom:16 }}>
          <div style={{ fontSize:20, marginBottom:6 }}>🐾</div>
          <div style={{ fontSize:12, color:'#B0ADA8', lineHeight:2 }}>
            <strong style={{ color:'#6B7280' }}>AnimalFinder Salta</strong> · Desarrollado por{' '}
            <strong style={{ color:'var(--primary)' }}>Emmanuel Farías</strong><br />
            Plataforma comunitaria sin fines de lucro · Salta Capital, Argentina · 2025<br />
            <span style={{ fontSize:11 }}>Tecnología: React · Supabase · Cloudinary · Petfinder API · Reddit API · Claude AI</span>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:12 }}>
            {[['📸','Instagram','https://instagram.com'],['📘','Facebook','https://facebook.com'],['🐦','Twitter/X','https://twitter.com'],['💬','WhatsApp','https://wa.me']].map(([icon,label,url])=>(
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', color:'#B0ADA8', fontSize:11, fontWeight:600, transition:'color .2s' }}
                onMouseEnter={e=>e.currentTarget.style.color='var(--primary)'}
                onMouseLeave={e=>e.currentTarget.style.color='#B0ADA8'}
              >
                <span style={{ fontSize:22 }}>{icon}</span>{label}
              </a>
            ))}
          </div>
        </div>
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav className="glass" style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, borderTop:'1px solid rgba(237,235,230,.8)' }}>
        <div style={{ maxWidth:920, margin:'0 auto', display:'flex' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setView(t.id); if(t.id!=='adopcion') updateFilter('type','all') }} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'9px 4px 11px',
              border:'none', background:'transparent', cursor:'pointer', transition:'all .2s', position:'relative',
              color: view===t.id ? 'var(--primary)' : '#B0ADA8'
            }}>
              <span style={{ fontSize:21, lineHeight:1, marginBottom:3 }}>{t.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>{t.label}</span>
              {t.count !== undefined && t.count > 0 && <div className="badge">{t.count > 9 ? '9+' : t.count}</div>}
              {view===t.id && <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:22, height:3, background:'var(--primary)', borderRadius:'3px 3px 0 0' }} />}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MODALS ── */}
      {selectedAnimal && <AnimalModal animal={selectedAnimal} onClose={()=>setSelectedAnimal(null)} onFav={toggleFav} favs={favs} />}
      {showPublish && <PublishModal onClose={()=>setShowPublish(false)} onPublish={handlePublish} />}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} />}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position:'fixed', top:74, left:'50%', transform:'translateX(-50%)', zIndex:90, background:toast.type==='error'?'#FF4757':toast.type==='info'?'#3B82F6':'#1A1A2E', color:'white', padding:'11px 20px', borderRadius:11, fontWeight:700, fontSize:13, boxShadow:'0 8px 24px rgba(0,0,0,.2)', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }} className="fade-up">
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
