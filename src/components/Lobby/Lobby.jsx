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
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-500 via-pink-400 to-emerald-400 bg-clip-text text-transparent mb-2">
            Salle d'attente
          </h1>
          <p className="text-gray-600">
            Connecté en tant que <span className="font-semibold text-gray-700">{currentPlayer?.username}</span>
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-red-300 bg-red-50/40 text-red-700 px-6 py-4 rounded-2xl mb-8"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel gauche - Créer équipe */}
          <div className="lg:col-span-1">
            <div className="glass soft-shadow rounded-3xl p-8">
              <h2 className="text-xl font-bold mb-6 text-gray-800">➕ Créer une équipe</h2>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Nom de l'équipe"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/50"
                  maxLength={30}
                />
                <button
                  type="submit"
                  disabled={isCreating || !teamName.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isCreating ? 'Création...' : 'Créer'}
                </button>
              </form>
            </div>
          </div>

          {/* Panel central - Équipes */}
          <div className="lg:col-span-2">
            <div className="glass soft-shadow rounded-3xl p-8">
              <h2 className="text-xl font-bold mb-6 text-gray-800">
                👥 Équipes ({teams.length})
              </h2>
              
              {teams.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="text-4xl mb-3">🏗️</div>
                  <p className="font-medium">Créez la première équipe pour commencer !</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {teams.map((team) => (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="glass border border-blue-200/50 rounded-2xl p-5 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-800">
                            {team.name}
                          </h3>
                          {team.is_catin && (
                            <span className="px-3 py-1 bg-red-100/80 text-red-700 text-xs font-bold rounded-lg">
                              💀 CATIN
                            </span>
                          )}
                        </div>

                        <div className="mb-3">
                          <div className="text-xs font-semibold text-gray-600 mb-2">
                            ({team.players?.length || 0} joueur{(team.players?.length || 0) > 1 ? 's' : ''})
                          </div>
                          {team.players && team.players.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {team.players.map((player) => (
                                <span
                                  key={player.id}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                    player.id === currentPlayer?.id
                                      ? 'bg-blue-200/80 text-blue-700'
                                      : 'bg-gray-100/80 text-gray-700'
                                  }`}
                                >
                                  {player.username}
                                  {player.id === currentPlayer?.id && ' ✨'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic">
                              Aucun joueur
                            </div>
                          )}
                        </div>

                        {currentPlayer?.team_id !== team.id && (
                          <button
                            onClick={() => handleJoinTeam(team.id)}
                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all duration-300"
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
          </div>
        </div>

        {/* Joueurs sans équipe */}
        {players.filter(p => !p.team_id).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass soft-shadow rounded-3xl p-8 mt-8"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              ❓ Joueurs sans équipe ({players.filter(p => !p.team_id).length})
            </h2>
            <div className="flex flex-wrap gap-3">
              {players.filter(p => !p.team_id).map((player) => (
                <span
                  key={player.id}
                  className="px-4 py-2 bg-yellow-200/60 text-yellow-800 rounded-xl font-semibold text-sm"
                >
                  {player.username}
                  {player.id === currentPlayer?.id && ' (vous)'}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bouton Démarrer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mt-12"
        >
          <button
            onClick={handleStartGame}
            disabled={teams.length < 2}
            className="px-10 py-4 bg-gradient-to-r from-emerald-400 to-green-500 text-white rounded-3xl font-bold text-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            🎮 Démarrer la partie
          </button>
        </motion.div>
      </div>
    </div>
  )
}
