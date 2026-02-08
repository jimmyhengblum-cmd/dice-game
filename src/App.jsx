import { useState, useEffect } from 'react'
import { Lobby } from './components/Lobby/Lobby'
import { GameBoard } from './components/Game/GameBoard'
import { useRealtime } from './hooks/useRealtime'
import { db, supabase } from './lib/supabase'

function App() {
  const [gameId, setGameId] = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [screen, setScreen] = useState('welcome') // 'welcome', 'lobby', 'game'
  const [mode, setMode] = useState(null) // 'create' ou 'join'

  const { game, teams, players, events, reload } = useRealtime(gameId)

  // Vérifier si un code de salle est dans l'URL au chargement
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlRoomCode = urlParams.get('room')
    
    if (urlRoomCode) {
      setRoomCode(urlRoomCode)
      setMode('join')
    }
  }, [])

  useEffect(() => {
    if (game?.status === 'playing' && screen === 'lobby') {
      setScreen('game')
    }
  }, [game?.status])

  useEffect(() => {
    if (currentPlayer && players.length > 0) {
      const updated = players.find(p => p.id === currentPlayer.id)
      if (updated) {
        setCurrentPlayer(updated)
      }
    }
  }, [players])

  // Générer un code de salle aléatoire
  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Créer une nouvelle partie
  const handleCreateGame = async (e) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsCreating(true)

    try {
      // Générer un code unique
      const code = generateRoomCode()
      
      // Créer la partie avec le code
      const { data: newGame, error } = await supabase
        .from('games')
        .insert({ 
          status: 'lobby',
          room_code: code
        })
        .select()
        .single()

      if (error) throw error

      setGameId(newGame.id)
      
      // Ajouter le joueur
      const player = await db.addPlayer(newGame.id, username.trim())
      setCurrentPlayer(player)

      // Mettre à jour l'URL avec le code
      window.history.pushState({}, '', `?room=${code}`)
      setRoomCode(code)
      
      setScreen('lobby')
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      alert('Erreur lors de la création de la partie: ' + error.message)
    } finally {
      setIsCreating(false)
    }
  }

  // Rejoindre une partie existante
  const handleJoinGame = async (e) => {
    e.preventDefault()
    if (!username.trim() || !roomCode.trim()) return

    setIsJoining(true)

    try {
      // Chercher la partie avec ce code
      const { data: existingGame, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .single()

      if (error || !existingGame) {
        alert('Partie non trouvée ! Vérifiez le code.')
        setIsJoining(false)
        return
      }

      if (existingGame.status === 'finished') {
        alert('Cette partie est terminée.')
        setIsJoining(false)
        return
      }

      setGameId(existingGame.id)
      
      // Vérifier si le joueur existe déjà dans cette partie
      const { data: existingPlayer, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', existingGame.id)
        .eq('username', username.trim())
        .single()

      let player
      if (existingPlayer) {
        // Le joueur existe déjà, le réutiliser
        player = existingPlayer
      } else if (playerError?.code !== 'PGRST116') {
        // Une autre erreur s'est produite (pas "not found")
        throw playerError
      } else {
        // Le joueur n'existe pas, en créer un nouveau
        player = await db.addPlayer(existingGame.id, username.trim())
      }
      setCurrentPlayer(player)

      // Mettre à jour l'URL
      window.history.pushState({}, '', `?room=${roomCode.toUpperCase()}`)
      
      // Aller au lobby ou au jeu selon le statut
      setScreen(existingGame.status === 'playing' ? 'game' : 'lobby')
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la connexion: ' + error.message)
    } finally {
      setIsJoining(false)
    }
  }

  // Copier le lien d'invitation
  const copyInviteLink = () => {
    const link = window.location.href
    navigator.clipboard.writeText(link)
      .then(() => alert('✅ Lien copié ! Partagez-le avec vos amis.'))
      .catch(() => alert('❌ Erreur lors de la copie'))
  }

  return (
    <div className="min-h-screen">
      {screen === 'welcome' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass soft-shadow rounded-3xl p-12 max-w-md w-full">
            <div className="text-center mb-8">
              <h1 className="text-6xl mb-3">🎲</h1>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-pink-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                Dice Game
              </h1>
              <p className="text-gray-600 text-sm font-medium">
                Jeu de plateau multijoueur chill
              </p>
            </div>

            {!mode && (
              <div className="space-y-3">
                <button
                  onClick={() => setMode('create')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  🎮 Créer une partie
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-400 to-green-500 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  🚪 Rejoindre une partie
                </button>
              </div>
            )}

            {mode === 'create' && (
              <form onSubmit={handleCreateGame} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Votre pseudo
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Entrez votre pseudo"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/50"
                    maxLength={20}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating || !username.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-2xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isCreating ? 'Création...' : 'Créer la partie'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                >
                  ← Retour
                </button>
              </form>
            )}

            {mode === 'join' && (
              <form onSubmit={handleJoinGame} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Votre pseudo
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Entrez votre pseudo"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/50"
                    maxLength={20}
                    autoFocus={!roomCode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code de la partie
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC123"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/50 uppercase"
                    maxLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isJoining || !username.trim() || !roomCode.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-400 to-green-500 text-white rounded-2xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isJoining ? 'Connexion...' : 'Rejoindre'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                >
                  ← Retour
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {screen === 'lobby' && game && (
        <>
          {/* Bannière de partage */}
          <div className="glass border-b border-white/20 py-4 px-4 sticky top-0 z-40">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 flex-wrap">
              <span className="font-semibold text-gray-700">
                📌 Code: <span className="font-bold text-blue-600">{roomCode}</span>
              </span>
              <button
                onClick={copyInviteLink}
                className="px-4 py-1.5 glass rounded-xl font-medium text-sm hover:scale-105 transition-all duration-300"
              >
                📋 Copier le lien
              </button>
            </div>
          </div>
          
          <Lobby
            gameId={gameId}
            currentPlayer={currentPlayer}
            teams={teams}
            players={players}
            onGameStart={() => setScreen('game')}
          />
        </>
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
