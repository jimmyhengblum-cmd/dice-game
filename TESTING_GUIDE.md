# 🧪 Guide de Test - Vérification des 4 Correctifs

## 📌 Préparation

### 1. Mettez à jour la base de données Supabase

Dans console Supabase (SQL Editor), exécutez :

```sql
-- Ajouter les colonnes manquantes
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS current_roller_id UUID;

ALTER TABLE games
ADD COLUMN IF NOT EXISTS has_rolled_this_turn BOOLEAN DEFAULT FALSE;

ALTER TABLE games
ADD COLUMN IF NOT EXISTS room_code TEXT UNIQUE;

-- Vérifier les colonnes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'games' 
ORDER BY ordinal_position;
```

### 2. Redémarrez l'application

```bash
npm run dev
```

---

## ✅ TEST 1 : Synchronisation de l'animation des dés

### Scénario
1. Créez une partie avec 2 équipes (min 2 joueurs par équipe)
2. Ouvrez la partie dans 2 navigateurs/fenêtres différentes
3. Un joueur lance les dés

### Vérification
- ✅ Les DEUX fenêtres montrent LA MÊME animation au MÊME moment
- ✅ Les dés affichent les mêmes valeurs (ex : 3 et 5)
- ✅ L'historique (droite) s'actualise en temps réel chez tous les joueurs
- ✅ Le message "⚔️ Peut lancer un duel !" apparaît chez tous si sum = 7

### Résultat attendu
```
[Joueur 1] a lancé 3 et 5 (Historique)
[Joueur 2 - Fenêtre 2] voit aussi : Joueur 1 a lancé 3 et 5
```

---

## ✅ TEST 2 : Double-clic / Blocage Multi-lancer

### Scénario
1. Créez une partie avec au moins 1 équipe avec 2+ joueurs
2. Démarrez la partie
3. Le lanceur désigné clique rapidement 2 fois sur "Lancer les dés"

### Vérification - Côté Frontend
- ✅ Après le 1er clic : bouton passe à "Lance effectué"
- ✅ Bouton devient gris et désactivé
- ✅ Le 2e clic n'a AUCUN effet
- ✅ L'animation se joue UNE SEULE fois

### Vérification - Côté Backend
- ✅ Dans `game_events` : un SEUL événement `dice_roll` est créé
- ✅ Pas d'événement dupliqué dans la table
- ✅ La colonne `has_rolled_this_turn` passe à TRUE dans `games`

### Résultat attendu
```
[Joueur lance] Lancer les dés → click
[1s plus tard] Les dés s'animent
[Bouton] Sort du lancer, devient gris pendant la transition vers le tour suivant
```

---

## ✅ TEST 3 : Sélection du lanceur (Aléatoire par équipe)

### Scénario
1. Créez une partie avec 1 équipe ayant 3 joueurs (A, B, C)
2. Démarrez la partie
3. Observez qui peut lancer les dés

### Vérification - Premier tour
- ✅ UN SEUL joueur a le bouton actif (vert avec ✓)
- ✅ Ce joueur voit : "✓ C'est votre tour de lancer"
- ✅ Les autres joueurs voient : "Tour de : [Nom du lanceur sélectionné]"
- ✅ Les autres équipes ont le bouton grisé

### Vérification - Tour suivant (après lancer)
- ✅ Un AUTRE lanceur aléatoire est sélectionné dans la même équipe
- ✅ L'historique affiche : "Pierre de Équipe1 lance les dés"
- ✅ Les autres joueurs sont notifiés via l'historique

### Vérification - Équipe différente
1. L'équipe 2 devient active après le tour
2. UN joueur de l'équipe 2 est sélectionné aléatoirement
3. Les joueurs de l'équipe 1 voient les boutons grisés

### Résultat attendu
```
[Tour 1] Alice (équipe 1) sélectionnée aléatoirement → Peut lancer
[Tour 2] Bob (équipe 1) sélectionné aléatoirement → Peut lancer (peut être Alice à nouveau)
[Historique] "Alice de Équipe 1 lance les dés" → "Bob de Équipe 1 lance les dés"
```

---

## ✅ TEST 4 : Correction du système de duel

### Scénario A : 2 Équipes (Duel Automatique)

1. Créez une partie avec EXACTEMENT 2 équipes
2. Lanceur lancent et obtient une SOMME = 7 (ex: 3+4, 2+5, 1+6)

### Vérification - Mode 2 équipes
- ✅ Modal apparaît immédiatement
- ✅ Les 2 équipes sont PRÉ-SÉLECTIONNÉES
- ✅ Texte : "Duel automatique entre les deux équipes !"
- ✅ AUCUN bouton de sélection n'apparaît
- ✅ Duel démarre automatiquement après 0.5s
- ✅ Les 2 équipes lancent un dé

### Résultat attendu
```
Duel modal
├─ Texte: "Duel automatique entre les deux équipes !"
├─ Équipe A: ⚔️ : Équipe B
└─ (Auto-lancement, pas de boutons)
```

---

### Scénario B : 3+ Équipes (Duel Manuel avec Validation)

1. Créez une partie avec 3+ équipes
2. Lanceur lancent et obtient une SOMME = 7

### Vérification - Mode > 2 équipes
- ✅ Modal avec 2 colonnes d'équipes
- ✅ Texte : "Choisissez deux équipes qui vont s'affronter"
- ✅ Vous pouvez sélectionner Équipe A vs Équipe B
- ✅ Vous CANNOT sélectionner Équipe A vs Équipe A
- ✅ Bouton "Lancer le duel" d'abord grisé
- ✅ Bouton s'active après avoir sélectionné 2 équipes DIFFÉRENTES
- ✅ Duel se joue comme prévu

### Vérification - Cas invalide
- ✅ Si vous cliquez sur la même équipe des deux côtés → bouton désactivé
- ✅ Vous voyez les erreurs dans console (validation)
- ✅ Pas de duel lancé

### Résultat attendu
```
Duel modal (3+ équipes)
├─ Colonne 1: [A] [B] [C]
├─ Colonne 2: [A] [B] [C]
├─ Sélection A vs B → ✅ Valide
├─ Sélection A vs A → ❌ Invalide
└─ Duel lance correctement après confirmation
```

---

## 🔍 Vérification Approfondie (Console Dev)

### Ouvrez DevTools (F12) → Console

### Test 1 : Événements Realtime
```javascript
// Lancez un dé et vérifiez dans la console
console.log('Game update:', payload)
// Vous devez voir: Game update: {id, current_team_id, current_roller_id, has_rolled_this_turn, ...}
```

### Test 2 : État du jeu
```javascript
// Dans GameBoard, vérifiez:
console.log('currentRollerId:', game.current_roller_id)
console.log('hasAlreadyRolled:', game.has_rolled_this_turn)
```

### Test 3 : Événements de lancer
```javascript
// Chaque lancer doit créer un événement:
console.log('New event:', {event_type: 'dice_roll', data: {...}})
```

---

## 📊 Validation Supabase

### Dans l'interface Supabase

1. **Table `games`** → Ouvrir une partie en cours
   - √ `current_roller_id` doit avoir une valeur (UUID d'un joueur)
   - √ `has_rolled_this_turn` doit être TRUE après un lancer, FALSE après le tour suivant
   - √ `room_code` doit avoir une valeur

2. **Table `game_events`** → Filtrer par `game_id`
   - √ Événement `dice_roll` créé UNE FOIS par lancer
   - √ Événement `roller_selected` créé au début du tour
   - √ Événement `duel_start` créé si sum = 7
   - √ Pas de doublons

3. **Realtime Settings**
   - √ Vérifier que `games`, `teams`, `players`, `game_events` sont activées

---

## ⚠️ Problèmes Connus / Dépannage

### Problème : "Autre joueur ne voit pas l'animation"
- **Cause probable** : Realtime n'est pas activé
- **Solution** : Supabase → Database → Replication → Cocher `games`, `teams`, `players`, `game_events`

### Problème : "Bouton reste bloqué après le lancer"
- **Cause probable** : `has_rolled_this_turn` n'est pas réinitialisé
- **Solution** : Vérifier que `resetRollerState()` est appelé dans `nextTurn()`

### Problème : "Lanceur ne change pas"
- **Cause probable** : `selectRandomRoller()` retourne toujours le même
- **Solution** : Vérifier que `useEffect` s'exécute quand `game.current_team_id` change

### Problème : "Duel ne démarre pas automatiquement (2 équipes)"
- **Cause probable** : `autoStarted` state bloque le hook
- **Solution** : Vérifier que `useEffect` dans DuelModal s'exécute correctement

---

## ✅ Checklist de Validation Finale

### Frontend
- [ ] Pas d'erreurs dans la console
- [ ] Pas d'erreurs TypeScript
- [ ] Props sont passées correctement

### Gameplay
- [ ] Test 1 : Animation synchrone ❓
- [ ] Test 2 : Double-click bloqué ❓
- [ ] Test 3 : Lanceur aléatoire ❓
- [ ] Test 4 : Duel automatique (2 équipes) ❓
- [ ] Test 4b : Duel manuel avec validation (3+ équipes) ❓

### Base de données
- [ ] Colonnes créées
- [ ] Realtime activé
- [ ] Données cohérentes

---

## 🎉 Résumé

Tous les correctifs ont été implémentés et sont prêts pour le test. Les 4 fonctionnalités doivent fonctionner de manière synchrone et sécurisée.

**Bonne chance et bon test ! 🚀**
