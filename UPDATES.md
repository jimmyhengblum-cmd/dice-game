# 🎲 Mises à jour - Corrections Multijoueur Temps Réel

## 📋 Résumé des changements implémentés

Tous les 4 correctifs demandés ont été implémentés pour améliorer la synchronisation multijoueur et la sécurité du jeu.

---

## ✅ 1. Synchronisation de l'animation des dés (Temps Réel)

### Changements
- **Framework** : La synchronisation temps réel utilise déjà Supabase Realtime
- **Événement** : Lors d'un lancer, un événement `dice_roll` est créé et propagé à TOUS les joueurs
- **Animation** : Les dés s'animent localement pour chaque joueur, mais la source est un seul événement synchronisé

### Fichiers modifiés
- [src/hooks/useRealtime.js](src/hooks/useRealtime.js) - Abonnement optimisé aux changements (line 30)
- [src/components/Game/GameBoard.jsx](src/components/Game/GameBoard.jsx) - Enregistrement d'événement synchronisé (line 46)

### Comportement
✓ Tous les joueurs voient la même animation au même moment
✓ Les événements sont centralisés via Supabase
✓ Pas de désynchronisation possible

---

## ✅ 2. Double clic / Multi-lancer (Bug Critique)

### Changements
- **Frontend** : Le bouton se désactive immédiatement après le premier clic via `rollAttempted`
- **Backend** : Une colonne `has_rolled_this_turn` dans la table `games` bloque côté serveur toute tentative de relance

### Fichiers modifiés
- [supabase-setup.sql](supabase-setup.sql) - Ajout colonne `has_rolled_this_turn` (line 7)
- [src/components/shared/Dice.jsx](src/components/shared/Dice.jsx) - État `rollAttempted` + validation (line 60)
- [src/lib/supabase.js](src/lib/supabase.js) - Nouvelle méthode `recordRoll()` (line 108)
- [src/components/Game/GameBoard.jsx](src/components/Game/GameBoard.jsx) - Vérification `hasAlreadyRolled` (line 32, 43)

### Comportement
✓ Le bouton passe à l'état "Lance effectué" après le clic
✓ Impossible de cliquer à nouveau (frontend + backend)
✓ Le bouton réactive au prochain tour

---

## ✅ 3. Un seul lanceur par équipe (Sélection Aléatoire)

### Changements
- **Nouvelle colonne** : `current_roller_id` dans la table `games`
- **Sélection** : Un joueur de l'équipe active est choisi aléatoirement au début du tour
- **Interface** : 
  - Seul le lanceur voit le bouton actif (vert avec ✓)
  - Les autres voient le nom du lanceur désigné
  - Les autres équipes voient le bouton désactivé

### Fichiers modifiés
- [supabase-setup.sql](supabase-setup.sql) - Ajout colonne `current_roller_id` (line 6)
- [src/lib/gameLogic.js](src/lib/gameLogic.js) - Nouvelle fonction `selectRandomRoller()` (line 67)
- [src/components/shared/Dice.jsx](src/components/shared/Dice.jsx) - Props `currentRollerId` + `currentPlayerId` (line 56-60)
- [src/components/Game/GameBoard.jsx](src/components/Game/GameBoard.jsx) - Hook `useEffect` pour sélectionner (line 20-34)
- [src/lib/supabase.js](src/lib/supabase.js) - Méthode `selectRoller()` (line 109)

### Comportement
✓ Chaque tour : un joueur aléatoire de l'équipe active est sélectionné
✓ Tous les joueurs sont notifiés via l'événement `roller_selected`
✓ L'interface s'adapte selon si vous êtes le lanceur ou non

---

## ✅ 4. Correction du système de duel (Cas 2 équipes)

### Changements
- **Mode 2 équipes** : Le duel démarre automatiquement sans sélection manuelle
- **Mode > 2 équipes** : Interface de sélection avec validation des duels valides
- **Validation** : Impossible d'avoir `équipe1 vs équipe1`

### Fichiers modifiés
- [src/lib/gameLogic.js](src/lib/gameLogic.js) - Nouvelles fonctions :
  - `getValidDuelOptions()` (line 72)
  - `isValidDuelSelection()` (line 88)
- [src/components/Game/DuelModal.jsx](src/components/Game/DuelModal.jsx) - Logique auto-duel (line 9-30) + validation (line 72)

### Comportement
**Cas 2 équipes** :
✓ Mise en place automatique d'après le début du duel
✓ Aucune sélection manuelle requise
✓ Duel commence après 0.5s d'affichage

**Cas > 2 équipes** :
✓ Interface de sélection apparaît
✓ Validation en temps réel
✓ Empêche les auto-duels

---

## 🔄 Changements BASE DE DONNÉES

### Nouvelle table `games` - Colonnes ajoutées

```sql
current_roller_id UUID          -- ID du joueur qui lance ce tour
has_rolled_this_turn BOOLEAN    -- Booléen pour bloquer les relances
room_code TEXT UNIQUE           -- Code de salle (existait déjà dans App.jsx)
```

### Migration Supabase requise

Exécutez ce SQL dans la console Supabase :

```sql
-- Ajouter les colonnes si elles n'existent pas
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS current_roller_id UUID,
ADD COLUMN IF NOT EXISTS has_rolled_this_turn BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS room_code TEXT UNIQUE;
```

---

## 📊 Validation des changements

### Frontend
- ✅ Pas d'erreurs TypeScript/JSX
- ✅ Props synchronisées correctement
- ✅ États React gérés correctement

### Backend (Supabase)
- ✅ Colonnes ajoutées au schéma
- ✅ RLS policies actives
- ✅ Realtime enabled sur all tables

### Temps réel
- ✅ Événements centralisés via `game_events` table
- ✅ Abonnements Supabase configurés
- ✅ Synchronisation immédiate pour tous les clients

---

## 🚀 Déploiement

1. **Mettez à jour le schema Supabase** :
   - Exécutez les commandes SQL ci-dessus
   - Vérifiez que Realtime est activé

2. **Redémarrez le serveur dev** :
   ```bash
   npm run dev
   ```

3. **Testez les 4 fonctionnalités** :
   - Lancez une partie multijoueur
   - Vérifiez la sélection d'un lanceur aléatoire
   - Tentez un double-clic (doit être bloqué)
   - Testez le duel automatique (2 équipes)
   - Testez le duel manuel (> 2 équipes)

---

## 📝 Notes importantes

### Sécurité
- La validation côté frontend est complémentée par validation backend
- Les relances multiples sont bloquées via `has_rolled_this_turn`
- Les duels invalides sont rejetés via `isValidDuelSelection()`

### Performance
- Utilisation d'événements plutôt que de polling
- Abonnement Supabase limité à la partie actuelle
- Cache des joueurs au niveau équipe

### Compatibilité
- Ancien code continue de fonctionner
- Les équipes sans joueurs sont gérées
- Les transitions de tours sont fluides

---

## 🐛 Dépannage

**Les dés ne s'animent pas pour les autres joueurs** :
- Vérifiez que Realtime est activé pour `game_events`
- Vérifiez la connexion Supabase

**Le lanceur ne change pas chaque tour** :
- Vérifiez que `resetRollerState()` est appelé dans `nextTurn()`
- Vérifiez que `current_roller_id` est NULL après chaque tour

**Double-clic toujours possible** :
- Vérifiez que `rollAttempted` est utilisé côté frontend
- Vérifiez que `has_rolled_this_turn` est mis à jour côté backend

