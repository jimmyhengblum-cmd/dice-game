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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="glass soft-shadow rounded-3xl p-10 max-w-3xl w-full border border-white/20"
          >
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-bold text-center mb-10 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent"
            >
              ⚔️ RÉSULTAT DU DUEL ⚔️
            </motion.h2>

            {/* Affichage des résultats */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              {/* Équipe 1 */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h3 className="font-bold text-2xl mb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  {team1Name}
                </h3>
                <div className="flex justify-center mb-6">
                  <Dice
                    value={team1Roll}
                    isRolling={false}
                    size={140}
                  />
                </div>
                <div className="text-4xl font-bold text-gray-800">{team1Roll}</div>
              </motion.div>

              {/* VS */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center justify-center"
              >
                <div className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  VS
                </div>
              </motion.div>

              {/* Équipe 2 */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h3 className="font-bold text-2xl mb-6 bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">
                  {team2Name}
                </h3>
                <div className="flex justify-center mb-6">
                  <Dice
                    value={team2Roll}
                    isRolling={false}
                    size={140}
                  />
                </div>
                <div className="text-4xl font-bold text-gray-800">{team2Roll}</div>
              </motion.div>
            </div>

            {/* Résultat */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center p-6 glass rounded-2xl border border-yellow-300/30"
            >
              {winner === 'tie' ? (
                <div className="text-3xl font-bold bg-gradient-to-r from-gray-500 to-gray-600 bg-clip-text text-transparent">
                  Égalité ! 🤝
                </div>
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent"
                >
                  {winner === 'team1' ? team1Name : team2Name} remporte le duel ! 🏆
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
