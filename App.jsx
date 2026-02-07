import { useState, useEffect } from 'react'
import { Lobby } from './components/Lobby/Lobby'
import { GameBoard } from './components/Game/GameBoard'
import { useRealtime } from './hooks/useRealtime'
import { db } from './lib/supabase'

function App() {
  const [gameId, setGameId] = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [username, setUsername] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [screen, setScreen] = useState('welcome') // 'welcome', 'lobby', 'game'

  const { game, teams, players, events, reload } = useRealtime(gameId)

  useEffect(() => {
    if (game?.status === 'playing' && screen === 'lobby') {
      setScreen('game')
    }
  }, [game?.status])

  useEffect(() => {
    // Mettre à jour currentPlayer quand players change
    if (currentPlayer && players.length > 0) {
      const updated = players.find(p => p.id === currentPlayer.id)
      if (updated) {
        setCurrentPlayer(updated)
      }
    }
  }, [players])

  const handleJoinGame = async (e) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsJoining(true)

    try {
      // Créer une nouvelle partie
      const newGame = await db.createGame()
      setGameId(newGame.id)

      // Ajouter le joueur
      const player = await db.addPlayer(newGame.id, username.trim())
      setCurrentPlayer(player)

      setScreen('lobby')
    } catch (error) {
      console.error('Error joining game:', error)
      alert('Erreur lors de la connexion à la partie')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {screen === 'welcome' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full">
            <h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎲 Dice Game
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Un jeu de plateau multijoueur en ligne
            </p>

            <form onSubmit={handleJoinGame}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Votre pseudo
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Entrez votre pseudo"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={20}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isJoining || !username.trim()}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
              >
                {isJoining ? 'Connexion...' : 'Créer une partie'}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Invitez vos amis à rejoindre la partie !</p>
            </div>
          </div>
        </div>
      )}

      {screen === 'lobby' && game && (
        <Lobby
          gameId={gameId}
          currentPlayer={currentPlayer}
          teams={teams}
          players={players}
          onGameStart={() => setScreen('game')}
        />
      )}

      {screen === 'game' && game && (
        <GameBoard
          gameId={gameId}
          game={game}
          teams={teams}
          currentPlayer={currentPlayer}
          events={events}
        />
      )}
    </div>
  )
}

export default App
