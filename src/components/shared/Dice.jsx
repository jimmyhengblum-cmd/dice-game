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
      className={`relative rounded-2xl font-bold flex items-center justify-center shadow-2xl border-2 ${
        isSpecial ? 'bg-gradient-to-br from-yellow-300 to-yellow-400 border-yellow-400' : 'bg-gradient-to-br from-blue-300 to-blue-400 border-blue-400'
      }`}
      style={{ 
        width: size, 
        height: size,
        borderColor: 'rgba(255,255,255,0.6)',
        boxShadow: isSpecial 
          ? '0 20px 40px rgba(251,146,60,0.4), inset -5px -5px 15px rgba(0,0,0,0.2)'
          : '0 20px 40px rgba(59,130,246,0.3), inset -5px -5px 15px rgba(0,0,0,0.15)'
      }}
      animate={isRolling ? {
        rotateX: [0, 360, 720, 1080],
        rotateY: [0, -360, -720, -1080],
        scale: [1, 1.15, 1, 1.15, 1]
      } : {
        rotateX: 0,
        rotateY: 0,
        scale: 1
      }}
      transition={{
        duration: isRolling ? 1 : 0.3,
        ease: "easeInOut"
      }}
    >
      {/* Highlight */}
      <div 
        className="absolute top-2 left-2 rounded-lg" 
        style={{
          width: Math.max(size * 0.3, 8), 
          height: Math.max(size * 0.3, 8),
          background: 'rgba(255,255,255,0.4)',
          filter: 'blur(6px)'
        }}
      />
      
      {/* Points du dé */}
      {value && diceFaces[value]?.map((pos, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${
            isSpecial ? 'bg-orange-500' : 'bg-gray-900'
          }`}
          style={{
            width: Math.max(size * 0.15, 6),
            height: Math.max(size * 0.15, 6),
            left: `${pos[0]}%`,
            top: `${pos[1]}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'
          }}
        />
      ))}
    </motion.div>
  )
}

export function DiceRoller({ onRoll, disabled }) {
  const [dice1, setDice1] = useState(null)
  const [dice2, setDice2] = useState(null)
  const [isRolling, setIsRolling] = useState(false)
  const [rollAttempted, setRollAttempted] = useState(false)

  const handleRoll = async () => {
    if (disabled || isRolling || rollAttempted) return

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
  const isButtonDisabled = disabled || isRolling || rollAttempted

  return (
    <div className="flex flex-col items-center gap-10 p-10 rounded-3xl border-2 border-blue-300/40" style={{
      background: 'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(168,85,247,0.08) 100%)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 10px 50px rgba(59,130,246,0.15), inset 0 1px 2px rgba(255,255,255,0.5)'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex gap-10"
      >
        <Dice value={dice1} isRolling={isRolling} isSpecial={isDouble} size={140} />
        <Dice value={dice2} isRolling={isRolling} isSpecial={isDouble} size={140} />
      </motion.div>

      {dice1 && dice2 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            {dice1 + dice2}
          </div>
          {isDoubleSix && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-4xl mt-4 animate-bounce"
            >
              🎉 DOUBLE SIX ! 🎉
            </motion.div>
          )}
          {isDouble && !isDoubleSix && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mt-3 font-bold"
            >
              🎲 Double {dice1} !
            </motion.div>
          )}
        </motion.div>
      )}

      <motion.button
        onClick={handleRoll}
        disabled={isButtonDisabled}
        whileHover={!isButtonDisabled ? { scale: 1.08, boxShadow: '0 20px 50px rgba(59,130,246,0.4)' } : {}}
        whileTap={!isButtonDisabled ? { scale: 0.94 } : {}}
        className={`px-12 py-5 rounded-2xl font-bold text-lg transition-all ${
          isButtonDisabled
            ? 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg cursor-pointer'
        }`}
      >
        {isRolling ? '⚡ Lancement...' : rollAttempted ? '✓ Lance effectué' : '🎲 Lancer les dés'}
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-semibold bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent"
      >
        ✨ C'est votre tour !
      </motion.div>
    </div>
  )
}
