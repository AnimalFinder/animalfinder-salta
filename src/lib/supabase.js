import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
})

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────
export const authHelpers = {
  signUp: async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone } }
    })
    return { data, error }
  },

  signIn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
    return { data, error }
  }
}

// ── ANIMALS HELPERS ───────────────────────────────────────────────────────────
export const animalsHelpers = {
  getAll: async ({ type, species, zone, search, limit = 50 } = {}) => {
    let query = supabase
      .from('animals')
      .select(`*, profiles(username, full_name, avatar_url, is_ong, ong_name, verified)`)
      .eq('status', 'activo')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type && type !== 'all') query = query.eq('type', type)
    if (species && species !== 'all') query = query.eq('species', species)
    if (zone && zone !== 'Todas las zonas') query = query.eq('zone', zone)
    if (search) query = query.or(`name.ilike.%${search}%,breed.ilike.%${search}%,description.ilike.%${search}%,zone.ilike.%${search}%`)

    const { data, error } = await query
    return { data, error }
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('animals')
      .select(`*, profiles(username, full_name, avatar_url, phone, is_ong, ong_name, verified)`)
      .eq('id', id)
      .single()
    if (data) supabase.rpc('increment_views', { animal_id: id })
    return { data, error }
  },

  create: async (animalData) => {
    const { data, error } = await supabase
      .from('animals')
      .insert([animalData])
      .select()
      .single()
    return { data, error }
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('animals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  markResolved: async (id) => {
    const { data, error } = await supabase
      .from('animals')
      .update({ status: 'resuelto', updated_at: new Date().toISOString() })
      .eq('id', id)
    return { data, error }
  },

  getFavorites: async (userId) => {
    const { data, error } = await supabase
      .from('favorites')
      .select(`animal_id, animals(*, profiles(username, full_name))`)
      .eq('user_id', userId)
    return { data: data?.map(f => f.animals) || [], error }
  },

  toggleFavorite: async (userId, animalId) => {
    const { data, error } = await supabase.rpc('toggle_favorite', {
      p_user_id: userId,
      p_animal_id: animalId
    })
    return { isFavorite: data, error }
  },

  getUserFavoriteIds: async (userId) => {
    const { data } = await supabase
      .from('favorites')
      .select('animal_id')
      .eq('user_id', userId)
    return data?.map(f => f.animal_id) || []
  }
}

// ── COMMENTS HELPERS ──────────────────────────────────────────────────────────
export const commentsHelpers = {
  getByAnimal: async (animalId) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`*, profiles(username, full_name, avatar_url)`)
      .eq('animal_id', animalId)
      .order('created_at', { ascending: true })
    return { data, error }
  },

  create: async (commentData) => {
    const { data, error } = await supabase
      .from('comments')
      .insert([commentData])
      .select(`*, profiles(username, full_name, avatar_url)`)
      .single()
    return { data, error }
  }
}

// ── REALTIME SUBSCRIPTIONS ────────────────────────────────────────────────────
export const subscribeToAnimals = (callback) => {
  return supabase
    .channel('animals-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'animals' }, callback)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'animals' }, callback)
    .subscribe()
}

export const subscribeToComments = (animalId, callback) => {
  return supabase
    .channel(`comments-${animalId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'comments',
      filter: `animal_id=eq.${animalId}`
    }, callback)
    .subscribe()
}
