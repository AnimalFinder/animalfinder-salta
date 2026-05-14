import { useState, useEffect, useCallback, useRef } from 'react'
import { animalsHelpers, subscribeToAnimals } from '../lib/supabase'
import { fetchExternalAnimals } from '../lib/externalApis'
import { SEED_ANIMALS } from '../lib/seedData'

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutos

export function useAnimals() {
  const [animals, setAnimals] = useState(SEED_ANIMALS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [newCount, setNewCount] = useState(0)
  const subscriptionRef = useRef(null)

  // Cargar animales de Supabase
  const loadFromSupabase = useCallback(async (filters = {}) => {
    try {
      const { data, error } = await animalsHelpers.getAll(filters)
      if (error) throw error
      if (data && data.length > 0) {
        setAnimals(prev => {
          // Merge: Supabase primero, luego externos que no estén duplicados
          const supabaseIds = new Set(data.map(a => a.id))
          const externalOnly = prev.filter(a => a.source !== 'manual' && !supabaseIds.has(a.id))
          return [...data, ...externalOnly]
        })
      }
    } catch (err) {
      // Si Supabase no está configurado, usar seed data
      console.warn('Supabase no configurado, usando datos locales:', err.message)
      setAnimals(SEED_ANIMALS)
    }
  }, [])

  // Cargar desde APIs externas
  const loadFromExternal = useCallback(async () => {
    try {
      const external = await fetchExternalAnimals()
      if (external.length > 0) {
        setAnimals(prev => {
          const existingIds = new Set(prev.map(a => a.external_id || a.id))
          const newOnes = external.filter(a => !existingIds.has(a.external_id))
          if (newOnes.length > 0) setNewCount(c => c + newOnes.length)
          return [...prev, ...newOnes]
        })
      }
    } catch (err) {
      console.warn('Error cargando APIs externas:', err)
    }
  }, [])

  // Carga inicial
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadFromSupabase()
      await loadFromExternal()
      setLastSync(new Date())
      setLoading(false)
    }
    init()
  }, [])

  // Suscripción Realtime de Supabase
  useEffect(() => {
    subscriptionRef.current = subscribeToAnimals((payload) => {
      if (payload.eventType === 'INSERT') {
        const newAnimal = payload.new
        setAnimals(prev => {
          const exists = prev.some(a => a.id === newAnimal.id)
          if (exists) return prev
          setNewCount(c => c + 1)
          return [newAnimal, ...prev]
        })
      } else if (payload.eventType === 'UPDATE') {
        setAnimals(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a))
      }
    })
    return () => subscriptionRef.current?.unsubscribe()
  }, [])

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(async () => {
      await loadFromSupabase()
      await loadFromExternal()
      setLastSync(new Date())
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [loadFromSupabase, loadFromExternal])

  const addAnimal = useCallback((animal) => {
    setAnimals(prev => [animal, ...prev])
  }, [])

  const updateAnimal = useCallback((id, updates) => {
    setAnimals(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }, [])

  const removeAnimal = useCallback((id) => {
    setAnimals(prev => prev.filter(a => a.id !== id))
  }, [])

  const refreshAll = useCallback(async () => {
    await loadFromSupabase()
    await loadFromExternal()
    setLastSync(new Date())
    setNewCount(0)
  }, [loadFromSupabase, loadFromExternal])

  return {
    animals,
    loading,
    error,
    lastSync,
    newCount,
    addAnimal,
    updateAnimal,
    removeAnimal,
    refreshAll
  }
}
