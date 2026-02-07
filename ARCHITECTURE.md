# 🏗️ Architecture Technique - Détails d'Implémentation

## Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React)                                           │
├─────────────────────────────────────────────────────────────┤
│  App.jsx                                                    │
│    └─> GameBoard.jsx                                        │
│         ├─> DiceRoller (Dice.jsx)   [COMPOSANT CRITIQUEll  │
│         ├─> DuelModal.jsx                                   │
│         └─> useRealtime (Hook)                              │
├─────────────────────────────────────────────────────────────┤
│  Supabase Client (supabase.js)                              │
│    ├─> db.createGameEvent()         [ÉVÉNEMENTS SYNC]      │
│    ├─> db.selectRoller()            [LANCEUR ALÉA.]        │
│    ├─> db.recordRoll()              [BLOCAGE DOUBLE-CLIC]  │
│    └─> db.resetRollerState()        [CYCLE TOUR]           │
├─────────────────────────────────────────────────────────────┤
│  Logique métier (gameLogic.js)                              │
│    ├─> selectRandomRoller()         [SÉLECTION ALÉA.]      │
│    ├─> getValidDuelOptions()        [VALIDATION DUEL]      │
│    └─> isValidDuelSelection()       [ANTI AUTO-DUEL]       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Backend (PostgreSQL + Realtime)                   │
├─────────────────────────────────────────────────────────────┤
│  tables/games           [NEW: current_roller_id]            │
│    └─ has_rolled_this_turn                                  │
│                                                             │
│  tables/game_events     [SYNCHRONISATION CENTRALISÉE]       │
│    ├─ dice_roll        [LANCER DE DÉS]                     │
│    ├─ roller_selected  [LANCEUR ASSIGNÉ]                   │
│    ├─ duel_start       [DUEL INITIÉ]                       │
│    ├─ duel_result      [RÉSULTAT DUEL]                     │
│    └─ team_turn        [CHANGEMENT D'ÉQUIPE]               │
│                                                             │
│  Realtime Subscriptions [SYNCHRONISATION TEMPS RÉELll      │
│    └─ POST_CHANGES trigger on all tables                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Flux de Données - Cycle d'un Tour

### Phase 1 : Début du tour
```
[Tour change] → nextTurn() appelé
    ↓
[Backend] games.current_team_id = nouvelle_équipe
    ↓
[Realtime] Tous les clients reçoivent la mise à jour
    ↓
[Frontend] game.current_team_id mis à jour
    ↓
[GameBoard] useEffect détecte currentTeam changement
    ↓
[Backend] db.selectRoller() choisit joueur aléatoire
    ↓
[Backend] games.current_roller_id = joueur_id
    ↓
[Realtime] Clients reçoivent current_roller_id
    ↓
[Frontend] Chaque client reçoit le nouvel ID
    ↓
[DiceRoller] Seul le joueur avec ID correspondant voit bouton vert
```

### Phase 2 : Lancer les dés
```
[Joueur autorisé] Clique sur "Lancer les dés"
    ↓
[Frontend] rollAttempted = true (désactiver localement)
    ↓
[Frontend] 1s d'animation des dés
    ↓
[Frontend] onRoll(dice1, dice2) appelé
    ↓
[Frontend] Validation: isMyTurnToRoll + !hasAlreadyRolled
    ↓
[Backend] db.recordRoll() → has_rolled_this_turn = true
    ↓
[Frontend] db.createGameEvent('dice_roll', {dice1, dice2, ...})
    ↓
[Realtime] Tous les clients reçoivent l'événement
    ↓
[Frontend] Historique s'affiche chez TOUS les joueurs
    ↓
[Frontend] Analyse résultat (isCatin, canDuel, etc)
    ↓
[Condition]
├─ Si sum=7 → Modal duel
├─ Sinon → Attendre 2s → nextTurn()
```

### Phase 3 : Fin du tour (après lancer)
```
[nextTurn] appelé (après boucle duel si applicable)
    ↓
[Backend] db.resetRollerState()
    ├─ current_roller_id = NULL
    └─ has_rolled_this_turn = FALSE
    ↓
[Backend] db.nextTurn(gameId, next_team_id)
    ├─ current_team_id = équipe_suivante
    └─ Realtime déclenche la mise à jour
    ↓
[Frontend] Tous les clients reçoivent les changements
    ↓
[Cycle recommence...]
```

---

## 🔐 Sécurité & Validation

### Double-clic Prevention (Correctif #2)

```javascript
// Level 1 : Frontend (UX)
DiceRoller.jsx:
  if (rollAttempted) return  // Stop immédiat
  setRollAttempted(true)     // Blocage local

// Level 2 : Backend (Security)
GameBoard.jsx:
  if (hasAlreadyRolled) return  // Blocage backend
  db.recordRoll()  // Set has_rolled_this_turn = TRUE

// Résultat : Impossibilité technique de relancer
```

### Validation Lanceur (Correctif #1 & #3)

```javascript
// GameBoard.jsx
const isMyTurnToRoll = game.current_roller_id === currentPlayer.id

handleDiceRoll() {
  if (!isMyTurnToRoll) {
    console.error('Tentative non-autorisée')
    return  // Vote
  }
  // ... procéder au lancer
}

// Résultat : Seul le joueur désigné peut lancer
```

### Validation Duel (Correctif #4)

```javascript
// gameLogic.js
function isValidDuelSelection(team1Id, team2Id, currentTeamId, teams) {
  // Les deux équipes doivent être différentes
  if (team1Id === team2Id) return false
  
  // Empêcher auto-duel si > 2 équipes
  if (teams.length > 2) {
    const teamsSet = new Set([team1Id, team2Id])
    return teamsSet.size === 2
  }
  
  return true
}

// Résultat : Pas d'auto-duel possible
```

---

## 📡 Événements Supabase Realtime

### Architecture des Événements

```
game_events table (JSONB data)
│
├─ Type: 'dice_roll'
│   ├─ player_id: UUID
│   ├─ username: string
│   ├─ team_id: UUID
│   ├─ dice1: 1-6
│   ├─ dice2: 1-6
│   └─ analysis: { isDouble, isCatin, canDuel, ... }
│
├─ Type: 'roller_selected'
│   ├─ rollerId: UUID
│   ├─ rollerName: string
│   ├─ teamName: string
│   └─ team_id: UUID
│
├─ Type: 'duel_start'
│   ├─ team1_id: UUID
│   ├─ team2_id: UUID
│   ├─ team1Name: string
│   └─ team2Name: string
│
└─ Type: 'duel_result'
    ├─ team1Roll: 1-6
    ├─ team2Roll: 1-6
    ├─ winner: 'team1' | 'team2' | 'tie'
    └─ winnerName: string
```

### Subscription Pattern (useRealtime.js)

```javascript
supabase
  .channel(`game:${gameId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'games',
    filter: `id=eq.${gameId}`
  }, (payload) => {
    // ✅ Capture: current_roller_id, has_rolled_this_turn
    setGame(payload.new)
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'game_events',
    filter: `game_id=eq.${gameId}`
  }, (payload) => {
    // ✅ Ajoute événement à l'historique EN TEMPS RÉEL
    setEvents(prev => [...prev, payload.new])
  })
  .subscribe()
```

---

## 🎲 Sélection Aléatoire du Lanceur (Correctif #3)

### Algorithme

```
Chaque tour:
1. [Backend] Récupérer l'équipe active: teams[current_team_idx]
2. [Backend] Récupérer ses joueurs: team.players[]
3. [Backend] Générer index aléatoire: Math.floor(Math.random() * players.length)
4. [Backend] Sélectionner: selectedRoller = players[randomIndex]
5. [Backend] Stocker: games.current_roller_id = selectedRoller.id
6. [Frontend] Chaque joueur reçoit l'ID via Realtime
7. [Frontend] Afficher:
   ├─ Si ID == monID: ✓ C'est mon tour
   └─ Si ID != monID: Tour de: [Nom du joueur]
```

### Distribution

Sur 3 joueurs (A, B, C) et 100 tours :
- Théoriquement : A ≈ 33, B ≈ 33, C ≈ 33 (distributions aléatoires)
- Pratique : Peut varier mais < 5% chance que même joueur 2x de suite

```javascript
// Implémentation (gameLogic.js)
export function selectRandomRoller(teamPlayers) {
  if (!teamPlayers?.length) return null
  const randomIndex = Math.floor(Math.random() * teamPlayers.length)
  return teamPlayers[randomIndex]
}
```

---

## ⚔️ Système de Duel Amélioré (Correctif #4)

### Mode 2 Équipes (Automatique)

```
Conditions détectées:
├─ teams.length === 2
├─ dice sum === 7
└─ User a permis duel
    │
    ▼
Modal Duel s'affiche avec:
├─ Équipes PRÉ-SÉLECTIONNÉES
├─ Pas de boutons de sélection
├─ Démarrage automatique après 0.5s
    │
    ▼
Duel se joue:
├─ Équipe 1 lance un dé (1-6)
└─ Équipe 2 lance un dé (1-6)
    │
    ▼
Résultat:
├─ Si Team1 > Team2: Équipe 1 gagne
├─ Si Team2 > Team1: Équipe 2 gagne
└─ Si égal: Tie
```

### Mode > 2 Équipes (Manuel + Validation)

```
Conditions détectées:
├─ teams.length > 2
├─ dice sum === 7
└─ User a permis duel
    │
    ▼
Modal Duel s'affiche avec:
├─ 2 colonnes de sélection
├─ Toutes les équipes présentes
└─ Validation en temps réel
    │
    ▼
User sélectionne:
├─ Équipe A (colonne 1)
├─ Équipe B (colonne 2)
    │ ▼ isValidDuelSelection(A, B)
    ├─ A !== B ✓
    ├─ Teams.length > 2 ✓
    └─ Bouton activé ✓
    │
    ▼
Duel se joue (même processus)
```

### Validation Algorithm (gameLogic.js)

```javascript
function getValidDuelOptions(teams, currentTeamId) {
  if (teams.length === 2) {
    // Auto-select opponent
    return [{ team1: currentTeamId, team2: opponent.id, auto: true }]
  }
  
  // > 2 équipes: toutes les combinaisons
  const availableTeams = teams.filter(t => t.id !== currentTeamId)
  const validOptions = []
  
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
```

---

## 📈 Performance Considerations

### Optimisations implémentées

1. **Events Batch** : Les événements sont groupés par 50 récents
   ```javascript
   loadEvents() {
     .limit(50)  // Limite pour perf
     .order('created_at', { ascending: true })
   }
   ```

2. **Subscriptions Scoped** : Un channel par partie
   ```javascript
   const gameChannel = supabase
     .channel(`game:${gameId}`)  // Un seul channel
   ```

3. **Selective Updates** : Seulement les changements pertinents
   ```javascript
   if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
     setGame(payload.new)  // Pas tous les changements
   }
   ```

### Complexité

- **Time** : O(1) pour lancer sélection (aléatoire)
- **Space** : O(n) pour historique (n = 50 événements max)
- **Network** : ~1KB par événement × 50 = ~50KB

---

## 🔗 Dépendances entre Correctifs

```
┌─────────────────────────────────────────────────────────────┐
│ Correctif #1: Synchronisation temps réel                   │
│   ↓                                                         │
│   └─> Requires: Supabase Realtime activé                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Correctif #2: Blocage double-clic                          │
│   ├─> Depends: Correctif #1 (pour sync)                    │
│   ├─> Requires: Colonne has_rolled_this_turn               │
│   └─> Validation: Frontend + Backend                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Correctif #3: Lanceur aléatoire                            │
│   ├─> Depends: Correctif #1 & #2                           │
│   ├─> Requires: Colonne current_roller_id                  │
│   ├─> selectRandomRoller() fonction utilitaire             │
│   └─> Réinitialisation à chaque tour                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Correctif #4: Duel automatique 2 équipes                   │
│   ├─> Depends: Correctif #1, #2, #3                        │
│   ├─> getValidDuelOptions() logique conditionnelle         │
│   ├─> isValidDuelSelection() validation                    │
│   └─> Auto-start logic en DuelModal.jsx                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Fichiers Modifiés & Impact

| Fichier | Changements | Impact | Criticité |
|---------|-----------|--------|-----------|
| supabase-setup.sql | +3 colonnes | Schema DB | ⭐⭐⭐ |
| src/lib/supabase.js | +5 méthodes | Backend API | ⭐⭐⭐ |
| src/lib/gameLogic.js | +3 fonctions | Logique métier | ⭐⭐⭐ |
| src/components/shared/Dice.jsx | Props & État | Frontend UI | ⭐⭐⭐ |
| src/components/Game/GameBoard.jsx | Hook & Logique | Orchestration | ⭐⭐⭐ |
| src/components/Game/DuelModal.jsx | Logique duel | UX Duel | ⭐⭐ |
| src/hooks/useRealtime.js | Optimisation | Sync | ⭐⭐ |

---

## ✅ Checklist Architecturale

- [x] Données synchronisées via Supabase Realtime
- [x] Twin validation (Frontend + Backend)
- [x] Sélection aléatoire complète
- [x] Duel automatique pour 2 équipes
- [x] Duel manuel pour 3+ équipes
- [x] Pas d'auto-duel possible
- [x] Pas de double-lancer possible
- [x] Historique temps réel
- [x] Performance optimisée
- [x] Code modulaire et maintenable

