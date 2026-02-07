import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dice } from '../shared/Dice'
import { db } from '../../lib/supabase'
import { rollSingleDice, resolveDuel } from '../../lib/gameLogic'

export function DuelModal({ gameId, teams, currentTeamId, onClose, onComplete }) {
  const [step, setStep] = useState('select') // 'select', 'rolling', 'result'
  const [team1, setTeam1] = useState(null)
  const [team2, setTeam2] = useState(null)
  const [team1Roll, setTeam1Roll] = useState(null)
  const [team2Roll, setTeam2Roll] = useState(null)
  const [isRolling, setIsRolling] = useState(false)
  const [result, setResult] = useState(null)

  // Équipes disponibles pour le duel (toutes sauf celle qui a lancé le duel)
  const availableTeams = teams.filter(t => t.id !== currentTeamId)

  const handleTeamSelect = (teamId, position) => {
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

  const handleStartDuel = async () => {
    if (!team1 || !team2) return

    const team1Data = teams.find(t => t.id === team1)
    const team2Data = teams.find(t => t.id === team2)

    // Enregistrer le début du duel
    await db.createGameEvent(gameId, 'duel_start', {
      team1_id: team1,
      team2_id: team2,
      team1Name: team1Data.name,
      team2Name: team2Data.name
    })

    setStep('rolling')
    setIsRolling(true)

    // Simuler le lancer avec animation
    setTimeout(() => {
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
      db.createGameEvent(gameId, 'duel_result', {
        team1_id: team1,
        team2_id: team2,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
      >
        <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          ⚔️ DUEL ⚔️
        </h2>

        {step === 'select' && (
          <div>
            <p className="text-center text-gray-600 mb-6">
              Choisissez deux équipes qui vont s'affronter
            </p>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Sélection équipe 1 */}
              <div>
                <h3 className="font-bold text-center mb-3">Équipe 1</h3>
                <div className="space-y-2">
                  {availableTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id, 1)}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        team1 === team.id
                          ? 'border-blue-500 bg-blue-50 font-semibold'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélection équipe 2 */}
              <div>
                <h3 className="font-bold text-center mb-3">Équipe 2</h3>
                <div className="space-y-2">
                  {availableTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id, 2)}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        team2 === team.id
                          ? 'border-red-500 bg-red-50 font-semibold'
                          : 'border-gray-300 hover:border-red-300'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleStartDuel}
                disabled={!team1 || !team2}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all"
              >
                Lancer le duel !
              </button>
            </div>
          </div>
        )}

        {(step === 'rolling' || step === 'result') && (
          <div>
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Équipe 1 */}
              <div className="text-center">
                <h3 className="font-bold text-xl mb-4">
                  {teams.find(t => t.id === team1)?.name}
                </h3>
                <div className="flex justify-center">
                  <Dice
                    value={team1Roll}
                    isRolling={isRolling}
                    size={100}
                  />
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="text-4xl font-bold text-gray-400">VS</div>
              </div>

              {/* Équipe 2 */}
              <div className="text-center">
                <h3 className="font-bold text-xl mb-4">
                  {teams.find(t => t.id === team2)?.name}
                </h3>
                <div className="flex justify-center">
                  <Dice
                    value={team2Roll}
                    isRolling={isRolling}
                    size={100}
                  />
                </div>
              </div>
            </div>

            {step === 'result' && result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-center mb-6">
                  {result.winner === 'tie' ? (
                    <div className="text-2xl font-bold text-gray-600">
                      Égalité ! 🤝
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-green-600">
                      {teams.find(t => t.id === (result.winner === 'team1' ? team1 : team2))?.name} remporte le duel ! 🏆
                    </div>
                  )}
                </div>

                <button
                  onClick={handleFinish}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
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
