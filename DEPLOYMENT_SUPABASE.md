# 🛠️ Guide de Migration Supabase - Correctifs Multijoueur

Ce document contient les instructions SQL et l'étape-à-étape pour appliquer les correctifs du jeu multijoueur.

---

## 📋 Vue d'ensemble des changements

Les 4 correctifs requièrent l'ajout de 3 colonnes à la table `games` :

| Colonne | Type | Default | Description |
|---------|------|---------|-------------|
| `current_roller_id` | UUID | NULL | ID du joueur autorisé à lancer ce tour |
| `has_rolled_this_turn` | BOOLEAN | FALSE | Bloquer les relances multiples |
| `room_code` | TEXT | NULL | Code unique pour rejoindre la partie |

---

## 🔧 Instructions Étape par Étape

### Étape 1 : Accéder à Supabase

1. **Ouvrez** : [dashboard.supabase.com](https://dashboard.supabase.com)
2. **Connectez-vous** à votre compte
3. **Sélectionnez** votre projet "dice-game"
4. **Cliquez** sur **SQL Editor** (icône > < en bas à gauche)

### Étape 2 : Exécuter le script de migration

**Copiez** ce script complet :

```sql
-- ================================================
-- MIGRATION v2.0 : Correctifs Multijoueur Temps Réel
-- ================================================
-- Date: 2026-02-07
-- Modifications: Ajout colonnes pour correctifs 1-4

BEGIN;

-- Ajouter la colonne pour Correctif #3 : Lanceur aléatoire
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS current_roller_id UUID;

-- Ajouter la colonne pour Correctif #2 : Blocage double-clic
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS has_rolled_this_turn BOOLEAN DEFAULT FALSE;

-- Ajouter/vérifier la colonne room_code (peut déjà exister)
-- ALTER TABLE public.games
-- ADD COLUMN IF NOT EXISTS room_code TEXT UNIQUE;

-- Créer index pour performance (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_games_current_roller 
ON public.games(current_roller_id);

CREATE INDEX IF NOT EXISTS idx_games_has_rolled 
ON public.games(has_rolled_this_turn);

-- Initialiser les parties existantes
UPDATE public.games 
SET has_rolled_this_turn = FALSE, current_roller_id = NULL 
WHERE has_rolled_this_turn IS NULL 
OR current_roller_id IS NULL;

-- Vérification
SELECT 
  'Migration OK' as status,
  COUNT(*) as total_games,
  SUM(CASE WHEN has_rolled_this_turn = TRUE THEN 1 ELSE 0 END) as rolled_this_turn
FROM public.games;

COMMIT;
```

**Dans la console SQL Supabase** :
1. **Collez** le script dans l'éditeur
2. **Cliquez** sur le bouton bleu **Execute** (ou Ctrl+Enter)
3. **Attendez** que le script se termine
4. Vous devriez voir : `Migration OK | X total_games`

### Étape 3 : Vérifier les modifications

**Exécutez** cette requête de validation :

```sql
-- Vérifier les colonnes
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'games' 
AND schema = 'public'
AND column_name IN ('current_roller_id', 'has_rolled_this_turn', 'room_code')
ORDER BY ordinal_position;
```

**Résultat attendu** :

```
column_name           | data_type | is_nullable | column_default
----------------------+-----------+-------------+---------------
current_roller_id     | uuid      | YES         | NULL
has_rolled_this_turn  | boolean   | YES         | false
room_code             | text      | YES         | NULL
```

### Étape 4 : Activer Realtime

**Réaltime est ESSENTIEL pour la synchronisation temps réel**

1. **Accédez** : Database → **Replication** (sidebar)
2. **Sous** "Publications" → **supabase_realtime**
3. **Vérifiez** que ces tables ont le toggle ✅ **actif** :
   - [ ] `public.games`
   - [ ] `public.teams`
   - [ ] `public.players`
   - [ ] `public.game_events`

**Si un toggle est éteint** 🔴 :
1. Cliquez sur le toggle pour l'allumer 🟢
2. Attendez 5-10 secondes
3. Rafraîchissez la page (F5)
4. Confirmez que c'est toujours actif ✅

### Étape 5 : Vérifier les données

**Exécutez** :

```sql
-- Voir une partie en cours (si existe)
SELECT 
  id,
  status,
  current_team_id,
  current_roller_id,
  has_rolled_this_turn,
  room_code,
  created_at,
  updated_at
FROM public.games
WHERE status IN ('playing', 'lobby')
LIMIT 3;
```

---

## 🧪 Tests de Validation

### Test 1 : Vérifier les colonnes

```sql
-- Devrait retourner 3 lignes
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'games'
AND column_name IN ('current_roller_id', 'has_rolled_this_turn', 'room_code');

-- Résultat: column_count = 3
```

### Test 2 : Vérifier la synchronisation

**Dans DevTools du navigateur (F12)** :

```javascript
// Ouvrir Console
// Créer une partie, puis:

// Devrait voir (après un lancer):
console.log('Game update avec:', {
  current_roller_id: 'xxx-xxx-xxx',
  has_rolled_this_turn: true,
  // ...
})

// Si vous voyez des undefined: Realtime pas actif
```

### Test 3 : Simuler le flux complet

1. **Créer une partie** avec 2 joueurs
2. **Démarrer** la partie
3. **Attendre** que le lanceur soit sélectionné
4. **Lancer les dés** avec ce joueur
5. **Vérifier dans Supabase** :

```sql
-- Vérifier les événements créés
SELECT 
  event_type,
  data->>'username' as player,
  data->>'dice1' as d1,
  data->>'dice2' as d2,
  created_at
FROM public.game_events
WHERE game_id = 'YOUR_GAME_ID'  -- Remplacer par l'ID de la partie
ORDER BY created_at DESC
LIMIT 10;

-- Devrait voir: dice_roll, roller_selected, etc.
```

---

## 🔄 Rollback (Si problème)

Si vous avez besoin de revenir en arrière :

```sql
-- ⚠️ ATTENTION: Ceci supprime les colonnes!
-- Ne pas exécuter sauf si vraiment nécessaire

BEGIN;

UPDATE public.games 
SET current_roller_id = NULL, has_rolled_this_turn = DEFAULT;

-- Optionnel selon vos besoins:
-- ALTER TABLE public.games DROP COLUMN IF EXISTS current_roller_id CASCADE;
-- ALTER TABLE public.games DROP COLUMN IF EXISTS has_rolled_this_turn CASCADE;

COMMIT;
```

---

## 📊 Monitoring Post-Migration

### 1. Vérifier les statistiques

```sql
-- Nombre de parties par statut
SELECT 
  status,
  COUNT(*) as count,
  SUM(CASE WHEN current_roller_id IS NOT NULL THEN 1 ELSE 0 END) as with_roller
FROM public.games
GROUP BY status;
```

### 2. Vérifier les performances

**Supabase Dashboard** → **Monitoring** :

- Realtime Connections : Doit = nombre de joueurs
- Database CPU : Doit rester < 50%
- API Response Time : Doit rester < 500ms

### 3. Vérifier les logs

**Supabase Dashboard** → **Logs** :

Chercher pour des erreurs comme :
- `permission denied`
- `relation "games" does not exist`
- `duplicate key value`

---

## ✅ Checklist Pré-Production

- [ ] Colonnes ajoutées ✅
- [ ] Realtime activé pour toutes les tables ✅
- [ ] Migration testée localement ✅
- [ ] Pas d'erreurs de permission ✅
- [ ] Index créés pour performance ✅
- [ ] Données existantes migrées ✅
- [ ] Tests de sync effectués ✅
- [ ] Backups sauvegardés ✅

---

## 🚀 Prochaines étapes

1. **Redémarrer le frontend** :
   ```bash
   npm run dev
   ```

2. **Tester tous les 4 correctifs** :
   - Synchronisation dés
   - Double-clic bloqué
   - Lanceur aléatoire
   - Duel automatique

3. **Vérifier la console** (F12) :
   - Aucune erreur
   - Logs de sync visibles

4. **Consulter les guides** :
   - [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Tests détaillés
   - [UPDATES.md](./UPDATES.md) - Vue d'ensemble des changes
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Détails techniques

---

## 💡 Tips & Tricks

### Rapide check de santé

```sql
-- Copier-coller pour vérification rapide
SELECT 
  COUNT(*) as games,
  COUNT(DISTINCT current_team_id) as teams,
  COUNT(DISTINCT current_roller_id) as rollers,
  SUM(CASE WHEN has_rolled_this_turn = TRUE THEN 1 ELSE 0 END) as rolled
FROM public.games WHERE status = 'playing';
```

### Déboguer une partie en cours

```sql
-- Si une partie pose problème:
SELECT 
  g.id,
  g.status,
  g.current_roller_id,
  g.has_rolled_this_turn,
  p.username,
  t.name as team_name
FROM public.games g
LEFT JOIN public.players p ON p.id = g.current_roller_id
LEFT JOIN public.teams t ON t.id = g.current_team_id
WHERE g.id = 'YOUR_GAME_ID';
```

### Réinitialiser une partie bloquée

```sql
-- Si une partie est "stuck":
UPDATE public.games
SET 
  current_roller_id = NULL,
  has_rolled_this_turn = FALSE
WHERE id = 'YOUR_GAME_ID';
```

---

## 📞 Support Rapide

| Problème | Solution |
|----------|----------|
| **Colonnes pas créées** | Vérifier syntaxe SQL, exécuter migration |
| **Realtime pas actif** | Database → Replication → Cocher les tables |
| **Events pas synchronisés** | Vérifier console DevTools, rafraîchir page |
| **Erreur permission denied** | Vérifier RLS policies (Database → Auth) |
| **Partie bloquée** | Exécuter query de reset ci-dessus |

---

## 🎓 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/sql-editor)

---

**Vous êtes maintenant prêt à utiliser la v2.0 du jeu ! 🎲✨**
