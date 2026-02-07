import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper functions pour la base de données
export const db = {
  // Créer une nouvelle partie
  async createGame() {
    const { data, error } = await supabase
      .from('games')
      .insert({ status: 'lobby' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Créer une équipe
  async createTeam(gameId, teamName, turnOrder) {
    const { data, error } = await supabase
      .from('teams')
      .insert({ 
        game_id: gameId, 
        name: teamName,
        turn_order: turnOrder 
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Ajouter un joueur
  async addPlayer(gameId, username, teamId = null) {
    const { data, error } = await supabase
      .from('players')
      .insert({ 
        game_id: gameId, 
        username,
        team_id: teamId 
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Rejoindre une équipe
  async joinTeam(playerId, teamId) {
    const { data, error } = await supabase
      .from('players')
      .update({ team_id: teamId })
      .eq('id', playerId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Récupérer les équipes d'une partie
  async getTeams(gameId) {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(*)')
      .eq('game_id', gameId)
      .order('turn_order')
    
    if (error) throw error
    return data
  },

  // Récupérer les joueurs d'une partie
  async getPlayers(gameId) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
    
    if (error) throw error
    return data
  },

  // Démarrer la partie
  async startGame(gameId, firstTeamId) {
    const { data, error } = await supabase
      .from('games')
      .update({ 
        status: 'playing',
        current_team_id: firstTeamId 
      })
      .eq('id', gameId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Enregistrer un événement de jeu
  async createGameEvent(gameId, eventType, eventData) {
    const { data, error } = await supabase
      .from('game_events')
      .insert({ 
        game_id: gameId, 
        event_type: eventType,
        data: eventData 
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Passer au tour suivant
  async nextTurn(gameId, nextTeamId) {
    const { data, error } = await supabase
      .from('games')
      .update({ current_team_id: nextTeamId })
      .eq('id', gameId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Mettre à jour le statut Catin
  async setCatinStatus(teamId, isCatin) {
    const { data, error } = await supabase
      .from('teams')
      .update({ is_catin: isCatin })
      .eq('id', teamId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Réinitialiser tous les statuts Catin
  async resetAllCatinStatuses(gameId) {
    const { data, error } = await supabase
      .from('teams')
      .update({ is_catin: false })
      .eq('game_id', gameId)
      .select()
    
    if (error) throw error
    return data
  },

  // Sélectionner le lanceur pour le tour
  async selectRoller(gameId, rollerId) {
    const { data, error } = await supabase
      .from('games')
      .update({ 
        current_roller_id: rollerId,
        has_rolled_this_turn: false 
      })
      .eq('id', gameId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Enregistrer qu'un lancer a été fait
  async recordRoll(gameId) {
    const { data, error } = await supabase
      .from('games')
      .update({ has_rolled_this_turn: true })
      .eq('id', gameId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Vérifier si un lancer a déjà été fait ce tour
  async hasRolledThisTurn(gameId) {
    const { data, error } = await supabase
      .from('games')
      .select('has_rolled_this_turn')
      .eq('id', gameId)
      .single()
    
    if (error) throw error
    return data?.has_rolled_this_turn ?? false
  },

  // Réinitialiser l'état de lancer pour le prochain tour
  async resetRollerState(gameId) {
    const { data, error } = await supabase
      .from('games')
      .update({ 
        current_roller_id: null,
        has_rolled_this_turn: false 
      })
      .eq('id', gameId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
