import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DiceRoller } from '../shared/Dice'
import { DuelModal } from './DuelModal'
import { db } from '../../lib/supabase'
import { analyzeDiceRoll, getNextTeam, getEventMessage, selectRandomRoller, getValidDuelOptions } from '../../lib/gameLogic'

export function GameBoard({ gameId, game, teams, currentPlayer, events }) {
  const [showDuelModal, setShowDuelModal] = useState(false)
  const [lastRoll, setLastRoll] = useState(null)
  const [localRollerAnimation, setLocalRollerAnimation] = useState(null)

  const currentTeam = teams.find(t => t.id === game.current_team_id)
  const isMyTurn = currentPlayer?.team_id === game.current_team_id
  const isMyTurnToRoll = game.current_roller_id === currentPlayer?.id
  const hasAlreadyRolled = game.has_rolled_this_turn

  // Sélectionner un lanceur aléatoire au début du tour
  useEffect(() => {
    if (isMyTurn && !game.current_roller_id && currentTeam?.players?.length > 0) {
      const selectedRoller = selectRandomRoller(currentTeam.players)
      if (selectedRoller) {
        db.selectRoller(gameId, selectedRoller.id).then(() => {
          // Enregistrer l'événement
          db.createGameEvent(gameId, 'roller_selected', {
            rollerId: selectedRoller.id,
            rollerName: selectedRoller.username,
            teamName: currentTeam.name,
            team_id: currentTeam.id
          })
        })
      }
    }
  }, [game.current_team_id, game.current_roller_id, isMyTurn, currentTeam, gameId])

  const handleDiceRoll = async (dice1, dice2) => {
    // Validation côté frontend : vérifier que c'est bien ce joueur qui lance
    if (!isMyTurnToRoll) {
      console.error('Tentative non-autorisée de lancer les dés')
      return
    }

    // Bloquer les relances
    if (hasAlreadyRolled) {
      console.error('Un lancer a déjà été effectué ce tour')
      return
    }

    // Enregistrer le lancer comme effectué
    await db.recordRoll(gameId)

    const analysis = analyzeDiceRoll(dice1, dice2)
    setLastRoll(analysis)
    
    // Afficher localement l'animation
    setLocalRollerAnimation({ dice1, dice2, analysis })

    // Enregistrer l'événement (visible à tous les joueurs)
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

    // Si c'est un double 6, on peut ajouter une animation spéciale
    if (analysis.isDoubleSix) {
      // Animation spéciale déjà gérée dans le composant Dice
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
  }

  const nextTurn = async () => {
    const next = getNextTeam(teams, game.current_team_id)
    
    // Réinitialiser l'état du lanceur pour le prochain tour
    await db.resetRollerState(gameId)
    
    // Passer au tour suivant
    await db.nextTurn(gameId, next.id)
    
    await db.createGameEvent(gameId, 'team_turn', {
      team_id: next.id,
      teamName: next.name
    })

    setLastRoll(null)
    setLocalRollerAnimation(null)
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
            <DiceRoller
              onRoll={handleDiceRoll}
              disabled={!isMyTurn}
              currentPlayerName={isMyTurn && game.current_roller_id ? teams.find(t => t.id === game.current_team_id)?.players?.find(p => p.id === game.current_roller_id)?.username : null}
              currentRollerId={game.current_roller_id}
              currentPlayerId={currentPlayer?.id}
            />

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
    </div>
  )
}
