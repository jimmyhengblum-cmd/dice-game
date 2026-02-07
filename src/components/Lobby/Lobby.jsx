import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../../lib/supabase'
import { canStartGame } from '../../lib/gameLogic'

export function Lobby({ gameId, currentPlayer, teams, players, onGameStart }) {
  const [teamName, setTeamName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    if (!teamName.trim()) return

    setIsCreating(true)
    setError('')

    try {
      const turnOrder = teams.length
      await db.createTeam(gameId, teamName.trim(), turnOrder)
      setTeamName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinTeam = async (teamId) => {
    if (!currentPlayer?.id) return

    try {
      await db.joinTeam(currentPlayer.id, teamId)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStartGame = async () => {
    const validation = canStartGame(teams)
    
    if (!validation.valid) {
      setError(validation.reason)
      return
    }

    try {
      const firstTeam = teams[0]
      await db.startGame(gameId, firstTeam.id)
      
      // Créer l'événement de début de partie
      await db.createGameEvent(gameId, 'game_start', {})
      
      if (onGameStart) onGameStart()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Salle d'attente
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Connecté en tant que <span className="font-semibold">{currentPlayer?.username}</span>
        </p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Formulaire de création d'équipe */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Créer une équipe</h2>
          <form onSubmit={handleCreateTeam} className="flex gap-3">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Nom de l'équipe"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={isCreating || !teamName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Création...' : 'Créer'}
            </button>
          </form>
        </div>

        {/* Liste des équipes */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Équipes ({teams.length})
          </h2>
          
          {teams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune équipe créée. Créez la première équipe pour commencer !
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {teams.map((team) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-800">
                        {team.name}
                      </h3>
                      {team.is_catin && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          💀 CATIN
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-gray-600 mb-2">
                        Joueurs ({team.players?.length || 0}) :
                      </div>
                      {team.players && team.players.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {team.players.map((player) => (
                            <span
                              key={player.id}
                              className={`px-3 py-1 rounded-full text-sm ${
                                player.id === currentPlayer?.id
                                  ? 'bg-blue-100 text-blue-700 font-semibold'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {player.username}
                              {player.id === currentPlayer?.id && ' (vous)'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">
                          Aucun joueur
                        </div>
                      )}
                    </div>

                    {currentPlayer?.team_id !== team.id && (
                      <button
                        onClick={() => handleJoinTeam(team.id)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
                      >
                        Rejoindre
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Joueurs sans équipe */}
        {players.filter(p => !p.team_id).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Joueurs sans équipe ({players.filter(p => !p.team_id).length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {players.filter(p => !p.team_id).map((player) => (
                <span
                  key={player.id}
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium"
                >
                  {player.username}
                  {player.id === currentPlayer?.id && ' (vous)'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bouton Démarrer */}
        <div className="flex justify-center">
          <button
            onClick={handleStartGame}
            disabled={teams.length < 2}
            className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
          >
            🎮 Démarrer la partie
          </button>
        </div>
      </div>
    </div>
  )
}
