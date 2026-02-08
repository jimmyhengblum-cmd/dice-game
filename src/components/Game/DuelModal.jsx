import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Dice } from '../shared/Dice'
import { db } from '../../lib/supabase'
import { rollSingleDice, resolveDuel, getValidDuelOptions, isValidDuelSelection } from '../../lib/gameLogic'

export function DuelModal({ gameId, teams, currentTeamId, onClose, onComplete }) {
  const [step, setStep] = useState('select') // 'select', 'rolling', 'result'
  const [team1, setTeam1] = useState(null)
  const [team2, setTeam2] = useState(null)
  const [team1Roll, setTeam1Roll] = useState(null)
  const [team2Roll, setTeam2Roll] = useState(null)
  const [isRolling, setIsRolling] = useState(false)
  const [result, setResult] = useState(null)
  const [autoStarted, setAutoStarted] = useState(false)

  // Déterminer les options de duel valides
  const duelOptions = getValidDuelOptions(teams, currentTeamId)
  const isTwoTeamsMode = teams.length === 2
  const availableTeams = teams.filter(t => t.id !== currentTeamId)

  // Si 2 équipes, démarrer automatiquement le duel
  useEffect(() => {
    if (isTwoTeamsMode && duelOptions.length > 0 && !autoStarted) {
      const { team1: t1, team2: t2 } = duelOptions[0]
      setTeam1(t1)
      setTeam2(t2)
      setAutoStarted(true)
      setStep('select') // Laisser voir un instant avant de lancer
      
      // Auto-démarrer après 1 seconde
      setTimeout(() => {
        handleStartDuel(t1, t2)
      }, 500)
    }
  }, [isTwoTeamsMode, duelOptions, autoStarted])

  const handleTeamSelect = (teamId, position) => {
    if (isTwoTeamsMode) return // Bloque la sélection en mode 2 équipes

    if (position === 1) {
      setTeam1(teamId)
      // Réinitialiser team2 si c'est la même
      if (team2 === teamId) setTeam2(null)
    } else {
      setTeam2(teamId)
      // Réinitialiser team1 si c'est la même
      if (team1 === teamId) setTeam1(null)
    }
  }

  const handleStartDuel = async (t1 = team1, t2 = team2) => {
    if (!t1 || !t2) return

    // Valider la sélection
    if (!isValidDuelSelection(t1, t2, currentTeamId, teams)) {
      alert('Sélection de duel invalide')
      return
    }

    const team1Data = teams.find(t => t.id === t1)
    const team2Data = teams.find(t => t.id === t2)

    // Enregistrer le début du duel
    await db.createGameEvent(gameId, 'duel_start', {
      team1_id: t1,
      team2_id: t2,
      team1Name: team1Data.name,
      team2Name: team2Data.name
    })

    setStep('rolling')
    setIsRolling(true)

    // Simuler le lancer avec animation
    setTimeout(async () => {
      const roll1 = rollSingleDice()
      const roll2 = rollSingleDice()
      
      setTeam1Roll(roll1)
      setTeam2Roll(roll2)
      setIsRolling(false)

      // Résoudre le duel
      const duelResult = resolveDuel(roll1, roll2)
      setResult(duelResult)

      // Déterminer le gagnant
      let winnerName = 'Égalité'
      if (duelResult.winner === 'team1') {
        winnerName = team1Data.name
      } else if (duelResult.winner === 'team2') {
        winnerName = team2Data.name
      }

      // Enregistrer le résultat
      await db.createGameEvent(gameId, 'duel_result', {
        team1_id: t1,
        team2_id: t2,
        team1Roll: roll1,
        team2Roll: roll2,
        winner: duelResult.winner,
        winnerName,
        team1Name: team1Data.name,
        team2Name: team2Data.name
      })

      setStep('result')
    }, 1500)
  }

  const handleFinish = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass soft-shadow rounded-3xl p-10 max-w-2xl w-full border border-white/20"
      >
        <h2 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
          ⚔️ DUEL ⚔️
        </h2>

        {step === 'select' && (
          <div>
            {isTwoTeamsMode ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-gray-700 mb-8 font-medium">
                  Duel automatique entre les deux équipes !
                </p>
                <div className="flex justify-center items-center gap-6 mb-8">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
                  >
                    {teams.find(t => t.id === team1)?.name}
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-3xl"
                  >
                    ⚔️
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent"
                  >
                    {teams.find(t => t.id === team2)?.name}
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <div>
                <p className="text-center text-gray-700 mb-8 font-medium">
                  Choisissez deux équipes qui vont s'affronter
                </p>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  {/* Sélection équipe 1 */}
                  <div>
                    <h3 className="font-bold text-center mb-4 text-gray-800">Team 1</h3>
                    <div className="space-y-2">
                      {availableTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => handleTeamSelect(team.id, 1)}
                          className={`w-full p-3 rounded-2xl border-2 transition-all font-medium ${
                            team1 === team.id
                              ? 'glass border-blue-400 bg-blue-100/40'
                              : 'glass border-gray-200/50 hover:border-blue-300'
                          }`}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sélection équipe 2 */}
                  <div>
                    <h3 className="font-bold text-center mb-4 text-gray-800">Team 2</h3>
                    <div className="space-y-2">
                      {availableTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => handleTeamSelect(team.id, 2)}
                          className={`w-full p-3 rounded-2xl border-2 transition-all font-medium ${
                            team2 === team.id
                              ? 'glass border-red-400 bg-red-100/40'
                              : 'glass border-gray-200/50 hover:border-red-300'
                          }`}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isTwoTeamsMode && (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 glass rounded-2xl font-semibold hover:scale-105 transition-all border border-gray-300/30"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleStartDuel(team1, team2)}
                  disabled={!team1 || !team2}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Lancer le duel !
                </button>
              </div>
            )}
          </div>
        )}

        {(step === 'rolling' || step === 'result') && (
          <div>
            <div className="grid grid-cols-2 gap-8 mb-10">
              {/* Équipe 1 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <h3 className="font-bold text-xl mb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  {teams.find(t => t.id === team1)?.name}
                </h3>
                <div className="flex justify-center">
                  <Dice
                    value={team1Roll}
                    isRolling={isRolling}
                    size={120}
                  />
                </div>
              </motion.div>

              {/* VS */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center justify-center"
              >
                <div className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  VS
                </div>
              </motion.div>

              {/* Équipe 2 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <h3 className="font-bold text-xl mb-6 bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">
                  {teams.find(t => t.id === team2)?.name}
                </h3>
                <div className="flex justify-center">
                  <Dice
                    value={team2Roll}
                    isRolling={isRolling}
                    size={120}
                  />
                </div>
              </motion.div>
            </div>

            {step === 'result' && result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-center mb-8 p-6 glass rounded-2xl border border-yellow-300/30">
                  {result.winner === 'tie' ? (
                    <div className="text-3xl font-bold bg-gradient-to-r from-gray-500 to-gray-600 bg-clip-text text-transparent">
                      Égalité ! 🤝
                    </div>
                  ) : (
                    <div className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                      {teams.find(t => t.id === (result.winner === 'team1' ? team1 : team2))?.name} remporte le duel ! 🏆
                    </div>
                  )}
                </div>

                <button
                  onClick={handleFinish}
                  className="w-full px-6 py-4 bg-gradient-to-r from-emerald-400 to-green-500 text-white rounded-2xl font-bold hover:shadow-lg hover:scale-105 transition-all"
                >
                  Continuer
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
