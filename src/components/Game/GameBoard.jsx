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
    <div className="max-w-7xl mx-auto p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Zone principale de jeu */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Partie en cours
            </h1>

            {/* Équipe courante */}
            <div className="text-center mb-8">
              <div className="text-lg text-gray-600 mb-2">Tour de l'équipe :</div>
              <div className="text-3xl font-bold text-gray-800">
                {currentTeam?.name}
                {currentTeam?.is_catin && (
                  <span className="ml-3 text-2xl">💀</span>
                )}
              </div>
              {isMyTurn && (
                <div className="mt-2 text-green-600 font-semibold">
                  C'est votre tour !
                </div>
              )}
            </div>

            {/* Lanceur de dés */}
            {isMyTurn ? (
              <DiceRoller
                onRoll={handleDiceRoll}
                disabled={false}
              />
            ) : (
              // Affichage des dés pour les joueurs en attente
              <div className="flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
                <div className="text-center text-gray-600 mb-4">
                  <p>En attente du lancer de :</p>
                  <p className="font-bold text-lg text-gray-800 mt-1">
                    {currentTeam?.players?.[0]?.username || 'En attente...'}
                  </p>
                </div>
                
                {/* Affichage des dés lancés (temps réel) */}
                {diceToDisplay && (
                  <motion.div
                    key={diceToDisplay.timestamp}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="flex gap-6">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      >
                        <div className="relative bg-white rounded-lg shadow-lg border-4 border-gray-300 w-20 h-20 flex items-center justify-center">
                          <span className="text-4xl font-bold text-gray-800">{diceToDisplay.dice1}</span>
                        </div>
                      </motion.div>
                      <motion.div
                        animate={{ rotate: [0, -360] }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      >
                        <div className="relative bg-white rounded-lg shadow-lg border-4 border-gray-300 w-20 h-20 flex items-center justify-center">
                          <span className="text-4xl font-bold text-gray-800">{diceToDisplay.dice2}</span>
                        </div>
                      </motion.div>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold text-gray-700"
                    >
                      Total : {diceToDisplay.dice1 + diceToDisplay.dice2}
                    </motion.div>
                    
                    {diceToDisplay.analysis?.isDoubleSix && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-2xl"
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
                className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl"
              >
                <div className="text-center">
                  {lastRoll.isCatin && (
                    <div className="text-2xl font-bold text-red-600 mb-2">
                      💀 Vous êtes la CATIN ! 💀
                    </div>
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
        <div className="space-y-6">
          {/* Liste des équipes */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">Équipes</h2>
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    team.id === game.current_team_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800">
                      {team.name}
                    </span>
                    {team.is_catin && (
                      <span className="text-xl">💀</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {team.players?.length || 0} joueur(s)
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {team.players?.map((player) => (
                      <span
                        key={player.id}
                        className="text-xs px-2 py-1 bg-white rounded-full border border-gray-300"
                      >
                        {player.username}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historique des événements */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">Historique</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {events.slice(-10).reverse().map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="text-sm p-3 bg-gray-50 rounded-lg"
                  >
                    {getEventMessage(event.event_type, event.data)}
                  </motion.div>
                ))}
              </AnimatePresence>
              {events.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">
                  Aucun événement pour le moment
                </div>
              )}
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
