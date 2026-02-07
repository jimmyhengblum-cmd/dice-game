// Logique du jeu

// Lancer deux dés
export function rollDice() {
  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  return { dice1, dice2 }
}

// Lancer un seul dé (pour les duels)
export function rollSingleDice() {
  return Math.floor(Math.random() * 6) + 1
}

// Vérifier si c'est un double
export function isDouble(dice1, dice2) {
  return dice1 === dice2
}

// Vérifier si c'est un double 6
export function isDoubleSix(dice1, dice2) {
  return dice1 === 6 && dice2 === 6
}

// Vérifier si c'est 4-1 ou 1-4 (Catin)
export function isCatin(dice1, dice2) {
  return (dice1 === 4 && dice2 === 1) || (dice1 === 1 && dice2 === 4)
}

// Vérifier si la somme = 7 (peut lancer un duel)
export function canStartDuel(dice1, dice2) {
  return dice1 + dice2 === 7
}

// Analyser le résultat du lancer
export function analyzeDiceRoll(dice1, dice2) {
  const sum = dice1 + dice2
  
  return {
    dice1,
    dice2,
    sum,
    isDouble: isDouble(dice1, dice2),
    isDoubleSix: isDoubleSix(dice1, dice2),
    isCatin: isCatin(dice1, dice2),
    canDuel: canStartDuel(dice1, dice2)
  }
}

// Résoudre un duel entre deux équipes
export function resolveDuel(team1Roll, team2Roll) {
  if (team1Roll > team2Roll) {
    return { winner: 'team1', team1Roll, team2Roll }
  } else if (team2Roll > team1Roll) {
    return { winner: 'team2', team1Roll, team2Roll }
  } else {
    return { winner: 'tie', team1Roll, team2Roll }
  }
}

// Déterminer l'équipe suivante
export function getNextTeam(teams, currentTeamId) {
  const currentIndex = teams.findIndex(t => t.id === currentTeamId)
  const nextIndex = (currentIndex + 1) % teams.length
  return teams[nextIndex]
}

// Générer un message d'événement pour l'historique
export function getEventMessage(eventType, data) {
  switch (eventType) {
    case 'dice_roll':
      const { username, dice1, dice2, analysis } = data
      let message = `${username} a lancé ${dice1} et ${dice2}`
      
      if (analysis.isDoubleSix) {
        message += ' 🎉 DOUBLE SIX !'
      } else if (analysis.isDouble) {
        message += ` 🎲 Double ${dice1} !`
      }
      
      if (analysis.isCatin) {
        message += ' 💀 CATIN !'
      }
      
      if (analysis.canDuel) {
        message += ' ⚔️ Peut lancer un duel !'
      }
      
      return message
    
    case 'duel_start':
      return `⚔️ Duel entre ${data.team1Name} et ${data.team2Name} !`
    
    case 'duel_result':
      if (data.winner === 'tie') {
        return `Égalité ! Les deux équipes ont fait ${data.team1Roll}`
      }
      return `${data.winnerName} remporte le duel ! (${data.team1Roll} vs ${data.team2Roll})`
    
    case 'team_turn':
      return `C'est au tour de l'équipe ${data.teamName}`
    
    case 'game_start':
      return '🎮 La partie commence !'
    
    case 'roller_selected':
      return `${data.rollerName} de ${data.teamName} lance les dés !`
    
    default:
      return ''
  }
}

// Sélectionner un lanceur aléatoire pour une équipe
export function selectRandomRoller(teamPlayers) {
  if (!teamPlayers || teamPlayers.length === 0) {
    return null
  }
  
  // Valider que les joueurs sont des objets valides
  const validPlayers = teamPlayers.filter(p => p && p.id && p.username)
  
  if (validPlayers.length === 0) {
    console.warn('Aucun joueur valide trouvé dans l\'équipe')
    return null
  }
  
  const randomIndex = Math.floor(Math.random() * validPlayers.length)
  return validPlayers[randomIndex]
}

// Valider qu'un joueur peut lancer
export function isValidRoller(playerId, teamPlayers) {
  return playerId && teamPlayers && teamPlayers.some(p => p?.id === playerId)
}

// Valider les duels pour cas 2 équipes
export function getValidDuelOptions(teams, currentTeamId) {
  if (teams.length === 2) {
    // Cas 2 équipes : duel automatique entre les 2 équipes
    const opponent = teams.find(t => t.id !== currentTeamId)
    return [
      { team1: currentTeamId, team2: opponent.id, auto: true }
    ]
  }

  // Cas > 2 équipes : offrir tous les duels valides (pas d'auto-duel)
  const validOptions = []
  const availableTeams = teams.filter(t => t.id !== currentTeamId)
  
  for (let i = 0; i < availableTeams.length; i++) {
    for (let j = i + 1; j < availableTeams.length; j++) {
      validOptions.push({
        team1: availableTeams[i].id,
        team2: availableTeams[j].id,
        auto: false
      })
    }
  }
  
  return validOptions
}

// Empêcher les duels d'une équipe contre elle-même
export function isValidDuelSelection(team1Id, team2Id, currentTeamId, teams) {
  // Les deux équipes doivent être différentes
  if (team1Id === team2Id) {
    return false
  }

  // Si 2 équipes : validation simple
  if (teams.length === 2) {
    const otherTeamId = teams.find(t => t.id !== currentTeamId)?.id
    return (team1Id === currentTeamId && team2Id === otherTeamId) ||
           (team2Id === currentTeamId && team1Id === otherTeamId)
  }

  // Si > 2 équipes : au moins une équipe n'est pas l'équipe courante
  const teamsSet = new Set([team1Id, team2Id])
  return teamsSet.size === 2 && !teamsSet.has(currentTeamId)
}

// Valider qu'une partie peut démarrer
export function canStartGame(teams) {
  // Au moins 2 équipes
  if (teams.length < 2) {
    return { valid: false, reason: 'Il faut au moins 2 équipes pour jouer' }
  }
  
  // Chaque équipe doit avoir au moins 1 joueur
  const teamsWithoutPlayers = teams.filter(t => !t.players || t.players.length === 0)
  if (teamsWithoutPlayers.length > 0) {
    return { valid: false, reason: 'Chaque équipe doit avoir au moins 1 joueur' }
  }
  
  return { valid: true }
}
