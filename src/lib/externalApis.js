// ── EXTERNAL APIs INTEGRATION ────────────────────────────────────────────────
// PawFinder Salta — por Emmanuel Farías

// ── PETFINDER API ─────────────────────────────────────────────────────────────
export const petfinderApi = {
  // Obtiene token de acceso
  getToken: async () => {
    try {
      const res = await fetch('https://api.petfinder.com/v2/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${import.meta.env.VITE_PETFINDER_KEY}&client_secret=${import.meta.env.VITE_PETFINDER_SECRET}`
      })
      const data = await res.json()
      return data.access_token
    } catch {
      return null
    }
  },

  // Busca animales en Argentina (más cercano disponible en su API)
  getAnimals: async ({ type = 'dog', limit = 20 } = {}) => {
    try {
      const token = await petfinderApi.getToken()
      if (!token) return []

      const res = await fetch(
        `https://api.petfinder.com/v2/animals?type=${type}&country=AR&limit=${limit}&status=adoptable`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()

      return (data.animals || []).map(a => ({
        id: `pf_${a.id}`,
        type: 'adopcion',
        species: a.type === 'Dog' ? 'perro' : a.type === 'Cat' ? 'gato' : 'otro',
        name: a.name || 'Sin nombre',
        breed: a.breeds?.primary || 'Mestizo',
        color: a.colors?.primary || 'Sin especificar',
        size: { small: 'pequeño', medium: 'mediano', large: 'grande', xlarge: 'grande' }[a.size?.toLowerCase()] || 'mediano',
        age: { baby: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior' }[a.age?.toLowerCase()] || 'Adulto',
        gender: a.gender === 'Male' ? 'macho' : 'hembra',
        zone: a.contact?.address?.city || 'Argentina',
        address: `${a.contact?.address?.city || ''}, ${a.contact?.address?.country || 'Argentina'}`,
        lat: -24.787 + (Math.random() - 0.5) * 0.1,
        lng: -65.409 + (Math.random() - 0.5) * 0.1,
        date: new Date().toISOString().split('T')[0],
        description: a.description || `${a.name} está en adopción. ${a.tags?.join(', ') || ''}`,
        phone: a.contact?.phone || 'Consultar',
        photos: a.photos?.map(p => p.medium) || ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'],
        user: a.organization_id ? 'Petfinder ONG' : 'Usuario Petfinder',
        userId: null,
        likes: 0,
        views: 0,
        verified: true,
        source: 'petfinder',
        external_id: String(a.id),
        reward: null
      }))
    } catch (err) {
      console.error('Petfinder API error:', err)
      return []
    }
  }
}

// ── REDDIT API ────────────────────────────────────────────────────────────────
export const redditApi = {
  // Subreddits relevantes para Argentina/Salta
  SUBREDDITS: ['argentina', 'salta', 'mascotasargentina', 'perrosargentina'],
  KEYWORDS: ['perdido', 'perdida', 'extraviado', 'busco', 'adopcion', 'adoptar', 'encontré', 'encontre', 'mascota', 'perro', 'gato'],

  getPosts: async () => {
    const results = []

    for (const subreddit of redditApi.SUBREDDITS) {
      try {
        const res = await fetch(
          `https://www.reddit.com/r/${subreddit}/search.json?q=mascota+perdida+salta&sort=new&limit=10&t=week`,
          { headers: { 'User-Agent': 'PawFinder-Salta/2.0 (by Emmanuel Farías)' } }
        )
        if (!res.ok) continue
        const data = await res.json()

        const posts = (data?.data?.children || [])
          .map(p => p.data)
          .filter(p => {
            const text = `${p.title} ${p.selftext}`.toLowerCase()
            return redditApi.KEYWORDS.some(k => text.includes(k))
          })

        for (const post of posts) {
          const text = `${post.title} ${post.selftext}`.toLowerCase()
          const type = text.includes('adopc') ? 'adopcion' : text.includes('encontr') ? 'encontrado' : 'perdido'
          const species = text.includes('gato') || text.includes('gatito') ? 'gato' : 'perro'

          results.push({
            id: `reddit_${post.id}`,
            type,
            species,
            name: 'Sin nombre',
            breed: 'Mestizo',
            color: 'Sin especificar',
            size: 'mediano',
            age: 'Adulto',
            gender: 'desconocido',
            zone: 'Salta Capital',
            address: 'Salta, Argentina',
            lat: -24.787 + (Math.random() - 0.5) * 0.06,
            lng: -65.409 + (Math.random() - 0.5) * 0.06,
            date: new Date(post.created_utc * 1000).toISOString().split('T')[0],
            description: post.selftext?.slice(0, 300) || post.title,
            phone: 'Ver publicación original',
            photos: post.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)
              ? [post.url]
              : ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'],
            user: `u/${post.author}`,
            userId: null,
            likes: post.score || 0,
            views: post.num_comments || 0,
            verified: false,
            source: 'reddit',
            external_id: post.id,
            reward: null,
            redditUrl: `https://reddit.com${post.permalink}`
          })
        }
      } catch (err) {
        console.warn(`Reddit r/${subreddit} error:`, err)
      }
    }

    return results
  }
}

// ── ADOPT A PET (simulado con datos reales de estructura) ─────────────────────
export const adoptAPetApi = {
  // AdoptAPet no tiene API pública gratuita disponible globalmente,
  // pero podemos preparar la estructura para cuando se consiga acceso
  getAnimals: async () => {
    // Retorna array vacío hasta tener credenciales
    // Una vez registrado en https://www.adoptapet.com/rescue/
    // reemplazá esto con llamadas reales a su API
    console.info('AdoptAPet: Pendiente de credenciales. Registrate en adoptapet.com/rescue')
    return []
  }
}

// ── AGGREGATOR: COMBINA TODAS LAS FUENTES ────────────────────────────────────
export const fetchExternalAnimals = async () => {
  const results = await Promise.allSettled([
    petfinderApi.getAnimals({ type: 'dog', limit: 10 }),
    petfinderApi.getAnimals({ type: 'cat', limit: 10 }),
    redditApi.getPosts(),
    adoptAPetApi.getAnimals()
  ])

  const allAnimals = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value || [])

  // Deduplicar por external_id
  const seen = new Set()
  return allAnimals.filter(a => {
    if (!a.external_id || seen.has(a.external_id)) return false
    seen.add(a.external_id)
    return true
  })
}
