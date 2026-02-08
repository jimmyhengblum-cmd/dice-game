import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DiceRoller } from '../shared/Dice'
import { DuelModal } from './DuelModal'
import { DuelResultDisplay } from './DuelResultDisplay'
import { db } from '../../lib/supabase'
import { analyzeDiceRoll, getNextTeam, getEventMessage } from '../../lib/gameLogic'

export function GameBoard({ gameId, game, teams, currentPlayer, events }) {
  const [showDuelModal, setShowDuelModal] = useState(false)
  const [lastRoll, setLastRoll] = useState(null)
  const [diceToDisplay, setDiceToDisplay] = useState(null)
  const [lastDuelEvent, setLastDuelEvent] = useState(null)

  const currentTeam = teams.find(t => t.id === game.current_team_id)
  const isMyTurn = currentPlayer?.team_id === game.current_team_id

  // Écouter les événements dice_roll pour synchroniser l'animation
  useEffect(() => {
    if (!events.length) return

    // Chercher le dernier événement dice_roll
    const lastDiceEvent = [...events]
      .reverse()
      .find(e => e.event_type === 'dice_roll')

    if (lastDiceEvent && lastDiceEvent.data) {
      const { dice1, dice2, analysis } = lastDiceEvent.data
      
      // Mettre à jour l'affichage des dés
      setDiceToDisplay({ dice1, dice2, analysis, timestamp: lastDiceEvent.created_at })
      setLastRoll(analysis)
    }
  }, [events])

  // Écouter les événements duel_result pour afficher le résultat
  useEffect(() => {
    if (!events.length) return

    // Chercher le dernier événement duel_result
    const latestDuelEvent = [...events]
      .reverse()
      .find(e => e.event_type === 'duel_result')

    if (latestDuelEvent && latestDuelEvent.id !== lastDuelEvent?.id) {
      setLastDuelEvent(latestDuelEvent)
    }
  }, [events, lastDuelEvent])

  const handleDiceRoll = async (dice1, dice2) => {
    // Validation simple : c'est mon tour ?
    if (!isMyTurn) {
      console.error('Ce n\'est pas votre tour')
      return
    }

    try {
      const analysis = analyzeDiceRoll(dice1, dice2)

      // Enregistrer l'événement temps réel
      await db.createGameEvent(gameId, 'dice_roll', {
        player_id: currentPlayer.id,
        username: currentPlayer.username,
        team_id: currentPlayer.team_id,
        dice1,
        dice2,
        analysis
      })

      // Gérer le statut Catin
      if (analysis.isCatin) {
        await db.resetAllCatinStatuses(gameId)
        await db.setCatinStatus(currentPlayer.team_id, true)
      }

      // Si la somme = 7, proposer un duel
      if (analysis.canDuel && teams.length >= 2) {
        setShowDuelModal(true)
      } else {
        // Passer au tour suivant automatiquement
        setTimeout(() => {
          nextTurn()
        }, 2000)
      }
    } catch (error) {
      console.error('Erreur lors du lancer:', error)
    }
  }

  const nextTurn = async () => {
    const next = getNextTeam(teams, game.current_team_id)
    
    // Passer au tour suivant
    await db.nextTurn(gameId, next.id)
    
    // Réinitialiser les états locaux
    setLastRoll(null)
    setDiceToDisplay(null)
    
    await db.createGameEvent(gameId, 'team_turn', {
      team_id: next.id,
      teamName: next.name
    })
  }

  const handleDuelComplete = async () => {
    setShowDuelModal(false)
    setTimeout(() => {
      nextTurn()
    }, 1000)
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Zone principale de jeu */}
          <div className="lg:col-span-2">
            <div className="glass soft-shadow rounded-3xl p-8">
              <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-500 via-pink-400 to-emerald-400 bg-clip-text text-transparent">
                🎮 Partie en cours
              </h1>

              {/* Équipe courante */}
              <motion.div
                key={currentTeam?.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center mb-10 p-6 glass rounded-2xl border border-blue-200/50"
              >
                <div className="text-sm font-semibold text-gray-600 mb-2">📌 Tour actuel</div>
                <div className="text-4xl font-bold text-gray-800 mb-2">
                  {currentTeam?.name}
                </div>
                {currentTeam?.is_catin && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-3xl inline-block ml-2"
                  >
                    💀
                  </motion.span>
                )}
                {isMyTurn && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-emerald-400 to-green-500 text-white rounded-xl font-bold inline-block"
                  >
                    ✨ C'est votre tour !
                  </motion.div>
                )}
              </motion.div>

              {/* Lanceur de dés */}
              {isMyTurn ? (
                <DiceRoller
                  onRoll={handleDiceRoll}
                  disabled={false}
                />
              ) : (
                // Affichage des dés pour les joueurs en attente
                <div className="flex flex-col items-center gap-6 p-8 glass rounded-2xl border border-blue-200/50">
                  <div className="text-center text-gray-600 mb-4">
                    <p className="text-sm font-medium">⏳ En attente du lancer de :</p>
                    <p className="font-bold text-lg text-gray-800 mt-2 bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">
                      {currentTeam?.players?.[0]?.username || 'En attente...'}
                    </p>
                  </div>
                  
                  {/* Affichage des dés lancés (temps réel) */}
                  {diceToDisplay && (
                    <motion.div
                      key={diceToDisplay.timestamp}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-4 w-full"
                    >
                      <div className="flex gap-6">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                          <div className="relative glass rounded-2xl border-2 border-blue-300 w-20 h-20 flex items-center justify-center">
                            <span className="text-4xl font-bold text-gray-800">{diceToDisplay.dice1}</span>
                          </div>
                        </motion.div>
                        <motion.div
                          animate={{ rotate: [0, -360] }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                          <div className="relative glass rounded-2xl border-2 border-pink-300 w-20 h-20 flex items-center justify-center">
                            <span className="text-4xl font-bold text-gray-800">{diceToDisplay.dice2}</span>
                          </div>
                        </motion.div>
                      </div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent"
                      >
                        Total : {diceToDisplay.dice1 + diceToDisplay.dice2}
                      </motion.div>
                      
                      {diceToDisplay.analysis?.isDoubleSix && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4 }}
                          className="text-3xl animate-bounce"
                        >
                          🎉 DOUBLE SIX ! 🎉
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Résultat du dernier lancer */}
              {lastRoll && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 glass rounded-2xl border border-orange-200/50"
                >
                  <div className="text-center space-y-3">
                    {lastRoll.isCatin && (
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent"
                      >
                        💀 Vous êtes la CATIN ! 💀
                      </motion.div>
                    )}
                    {lastRoll.canDuel && (
                      <div className="text-xl font-bold text-orange-600">
                        ⚔️ Vous pouvez lancer un duel !
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

        {/* Panneau latéral */}
        <div className="lg:col-span-2 space-y-6">
          {/* Liste des équipes */}
          <div className="glass soft-shadow rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-800">👥 Équipes</h2>
            <div className="space-y-3">
              {teams.map((team) => (
                <motion.div
                  key={team.id}
                  layout
                  className={`p-4 rounded-2xl transition-all border ${
                    team.id === game.current_team_id
                      ? 'glass border-blue-300/50 shadow-lg'
                      : 'glass border-gray-200/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800">
                      {team.name}
                    </span>
                    {team.is_catin && (
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-xl"
                      >
                        💀
                      </motion.span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    {team.players?.length || 0} joueur{(team.players?.length || 0) > 1 ? 's' : ''}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {team.players?.map((player) => (
                      <span
                        key={player.id}
                        className="text-xs px-2.5 py-1 bg-white/60 rounded-lg border border-gray-200"
                      >
                        {player.username}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Historique des événements */}
          <div className="glass soft-shadow rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-800">📜 Historique</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {events.slice(-10).reverse().map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="text-xs p-3 bg-white/50 rounded-lg border border-gray-200/30 text-gray-700"
                  >
                    {getEventMessage(event.event_type, event.data)}
                  </motion.div>
                ))}
              </AnimatePresence>
              {events.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-6 font-medium">
                  Aucun événement pour le moment
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Modal de duel */}
      {showDuelModal && (
        <DuelModal
          gameId={gameId}
          teams={teams}
          currentTeamId={game.current_team_id}
          onClose={() => setShowDuelModal(false)}
          onComplete={handleDuelComplete}
        />
      )}

      {/* Affichage du résultat du duel pour tous les joueurs */}
      <DuelResultDisplay duelEvent={lastDuelEvent} />
    </div>
  )
}