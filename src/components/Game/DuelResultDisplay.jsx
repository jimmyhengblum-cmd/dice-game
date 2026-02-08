import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dice } from '../shared/Dice'

export function DuelResultDisplay({ duelEvent }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (duelEvent && duelEvent.data) {
      setIsVisible(true)
      // Afficher le résultat pendant 5 secondes
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [duelEvent])

  if (!duelEvent?.data || !isVisible) return null

  const { team1Name, team2Name, team1Roll, team2Roll, winner } = duelEvent.data

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
          >
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              ⚔️ RÉSULTAT DU DUEL ⚔️
            </h2>

            {/* Affichage des résultats */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Équipe 1 */}
              <div className="text-center">
                <h3 className="font-bold text-xl mb-4">{team1Name}</h3>
                <div className="flex justify-center mb-4">
                  <Dice
                    value={team1Roll}
                    isRolling={false}
                    size={100}
                  />
                </div>
                <div className="text-3xl font-bold text-gray-800">{team1Roll}</div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="text-4xl font-bold text-gray-400">VS</div>
              </div>

              {/* Équipe 2 */}
              <div className="text-center">
                <h3 className="font-bold text-xl mb-4">{team2Name}</h3>
                <div className="flex justify-center mb-4">
                  <Dice
                    value={team2Roll}
                    isRolling={false}
                    size={100}
                  />
                </div>
                <div className="text-3xl font-bold text-gray-800">{team2Roll}</div>
              </div>
            </div>

            {/* Résultat */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              {winner === 'tie' ? (
                <div className="text-3xl font-bold text-gray-600">
                  Égalité ! 🤝
                </div>
              ) : (
                <div className="text-3xl font-bold text-green-600">
                  {winner === 'team1' ? team1Name : team2Name} remporte le duel ! 🏆
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
