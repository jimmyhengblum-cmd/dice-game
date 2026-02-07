import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(gameId) {
  const [game, setGame] = useState(null)
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!gameId) return

    // Charger les données initiales
    loadInitialData()

    // S'abonner aux changements en temps réel
    const gameChannel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          console.log('Game update:', payload)
          if (payload.eventType === 'UPDATE') {
            setGame(payload.new)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('Team update:', payload)
          loadTeams()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('Player update:', payload)
          loadPlayers()
          loadTeams() // Recharger les équipes pour mettre à jour les joueurs
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('New event:', payload)
          setEvents(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(gameChannel)
    }
  }, [gameId])

  async function loadInitialData() {
    await Promise.all([
      loadGame(),
      loadTeams(),
      loadPlayers(),
      loadEvents()
    ])
  }

  async function loadGame() {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()
    
    if (!error && data) {
      setGame(data)
    }
  }

  async function loadTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(*)')
      .eq('game_id', gameId)
      .order('turn_order')
    
    if (!error && data) {
      setTeams(data)
    }
  }

  async function loadPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
    
    if (!error && data) {
      setPlayers(data)
    }
  }

  async function loadEvents() {
    const { data, error } = await supabase
      .from('game_events')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })
      .limit(50)
    
    if (!error && data) {
      setEvents(data)
    }
  }

  return {
    game,
    teams,
    players,
    events,
    reload: loadInitialData
  }
}
