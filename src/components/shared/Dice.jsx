import { motion } from 'framer-motion'
import { useState } from 'react'

const diceFaces = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [25, 75], [75, 25], [75, 75]],
  5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
  6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
}

export function Dice({ value, isRolling, isSpecial = false, size = 80 }) {
  return (
    <motion.div
      className={`relative bg-white rounded-lg shadow-lg border-4 ${
        isSpecial ? 'border-yellow-400' : 'border-gray-300'
      }`}
      style={{ width: size, height: size }}
      animate={isRolling ? {
        rotate: [0, 360, 720, 1080],
        scale: [1, 1.1, 1, 1.1, 1]
      } : {
        rotate: 0,
        scale: 1
      }}
      transition={{
        duration: isRolling ? 1 : 0.3,
        ease: "easeInOut"
      }}
    >
      {value && diceFaces[value]?.map((pos, i) => (
        <div
          key={i}
          className={`absolute w-3 h-3 rounded-full ${
            isSpecial ? 'bg-yellow-500' : 'bg-gray-800'
          }`}
          style={{
            left: `${pos[0]}%`,
            top: `${pos[1]}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </motion.div>
  )
}

export function DiceRoller({ onRoll, disabled, currentPlayerName, currentRollerId, currentPlayerId }) {
  const [dice1, setDice1] = useState(null)
  const [dice2, setDice2] = useState(null)
  const [isRolling, setIsRolling] = useState(false)
  const [rollAttempted, setRollAttempted] = useState(false)

  // Déterminer si ce joueur est le lanceur autorisé
  const isAuthorizedRoller = currentRollerId && currentPlayerId && currentRollerId === currentPlayerId
  const isButtonDisabled = disabled || isRolling || rollAttempted || !isAuthorizedRoller

  const handleRoll = async () => {
    if (isButtonDisabled) return

    // Désactiver immédiatement
    setRollAttempted(true)
    setIsRolling(true)
    
    // Animation de roulement
    const rollInterval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1)
      setDice2(Math.floor(Math.random() * 6) + 1)
    }, 100)

    // Arrêter après 1 seconde et obtenir le résultat final
    setTimeout(() => {
      clearInterval(rollInterval)
      const finalDice1 = Math.floor(Math.random() * 6) + 1
      const finalDice2 = Math.floor(Math.random() * 6) + 1
      
      setDice1(finalDice1)
      setDice2(finalDice2)
      setIsRolling(false)
      
      if (onRoll) {
        onRoll(finalDice1, finalDice2)
      }
    }, 1000)
  }

  const isDouble = dice1 && dice2 && dice1 === dice2
  const isDoubleSix = dice1 === 6 && dice2 === 6

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
      <div className="flex gap-6">
        <Dice value={dice1} isRolling={isRolling} isSpecial={isDouble} />
        <Dice value={dice2} isRolling={isRolling} isSpecial={isDouble} />
      </div>

      {dice1 && dice2 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-3xl font-bold text-gray-700">
            {dice1 + dice2}
          </div>
          {isDoubleSix && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-2xl mt-2"
            >
              🎉 DOUBLE SIX ! 🎉
            </motion.div>
          )}
          {isDouble && !isDoubleSix && (
            <div className="text-lg text-purple-600 mt-2">
              🎲 Double {dice1} !
            </div>
          )}
        </motion.div>
      )}

      <button
        onClick={handleRoll}
        disabled={isButtonDisabled}
        className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
          isButtonDisabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
        }`}
      >
        {isRolling ? 'Lancement...' : rollAttempted ? 'Lance effectué' : 'Lancer les dés'}
      </button>

      {isAuthorizedRoller ? (
        <div className="text-sm text-green-600 font-semibold">
          ✓ C'est votre tour de lancer
        </div>
      ) : currentPlayerName && disabled ? (
        <div className="text-sm text-gray-600">
          Tour de : <span className="font-semibold">{currentPlayerName}</span>
        </div>
      ) : null}
    </div>
  )
}
