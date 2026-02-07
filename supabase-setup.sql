-- ================================================
-- SCRIPT DE CONFIGURATION SUPABASE
-- Jeu de Dés Multijoueur
-- ================================================

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- CRÉATION DES TABLES
-- ================================================

-- Table des parties
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'finished')),
  current_team_id UUID,
  current_roller_id UUID,
  has_rolled_this_turn BOOLEAN DEFAULT FALSE,
  room_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des équipes
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_catin BOOLEAN DEFAULT FALSE,
  turn_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(game_id, name),
  UNIQUE(game_id, turn_order)
);

-- Table des joueurs
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  is_connected BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des événements de jeu (historique)
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'dice_roll', 
    'duel_start', 
    'duel_result', 
    'team_turn', 
    'game_start',
    'game_end'
  )),
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- CRÉATION DES INDEX POUR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_teams_game ON teams(game_id);
CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_events_game ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON game_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_teams_turn_order ON teams(game_id, turn_order);

-- ================================================
-- ACTIVATION DE ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- ================================================
-- POLITIQUES RLS
-- Pour le MVP, on autorise tout le monde à tout faire
-- Dans une version de production, vous voudrez restreindre cela
-- ================================================

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Enable all for games" ON games;
DROP POLICY IF EXISTS "Enable all for teams" ON teams;
DROP POLICY IF EXISTS "Enable all for players" ON players;
DROP POLICY IF EXISTS "Enable all for game_events" ON game_events;

-- Créer les nouvelles politiques
CREATE POLICY "Enable all for games" 
  ON games FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable all for teams" 
  ON teams FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable all for players" 
  ON players FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable all for game_events" 
  ON game_events FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- ================================================
-- TRIGGERS ET FONCTIONS
-- ================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour games
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at 
  BEFORE UPDATE ON games 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour mettre à jour last_seen des joueurs
CREATE OR REPLACE FUNCTION update_player_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour players
DROP TRIGGER IF EXISTS update_players_last_seen ON players;
CREATE TRIGGER update_players_last_seen 
  BEFORE UPDATE ON players 
  FOR EACH ROW 
  EXECUTE FUNCTION update_player_last_seen();

-- ================================================
-- VUES UTILES (OPTIONNEL)
-- ================================================

-- Vue pour voir les parties actives avec leurs équipes
CREATE OR REPLACE VIEW active_games_with_teams AS
SELECT 
  g.id as game_id,
  g.status,
  g.created_at,
  COUNT(DISTINCT t.id) as team_count,
  COUNT(DISTINCT p.id) as player_count
FROM games g
LEFT JOIN teams t ON g.id = t.game_id
LEFT JOIN players p ON g.id = p.game_id
WHERE g.status != 'finished'
GROUP BY g.id, g.status, g.created_at;

-- ================================================
-- DONNÉES DE TEST (OPTIONNEL - à supprimer en prod)
-- ================================================

-- Décommentez ces lignes pour créer une partie de test

/*
-- Créer une partie de test
INSERT INTO games (id, status) 
VALUES ('00000000-0000-0000-0000-000000000001', 'lobby');

-- Créer des équipes de test
INSERT INTO teams (game_id, name, turn_order) VALUES
('00000000-0000-0000-0000-000000000001', 'Les Loups', 0),
('00000000-0000-0000-0000-000000000001', 'Les Aigles', 1);

-- Créer des joueurs de test
INSERT INTO players (game_id, team_id, username) VALUES
('00000000-0000-0000-0000-000000000001', 
 (SELECT id FROM teams WHERE name = 'Les Loups' LIMIT 1), 
 'Alice'),
('00000000-0000-0000-0000-000000000001', 
 (SELECT id FROM teams WHERE name = 'Les Aigles' LIMIT 1), 
 'Bob');
*/

-- ================================================
-- VÉRIFICATION
-- ================================================

-- Afficher les tables créées
SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
  AND table_name IN ('games', 'teams', 'players', 'game_events')
ORDER BY 
  table_name;

-- Afficher les index créés
SELECT 
  indexname 
FROM 
  pg_indexes 
WHERE 
  schemaname = 'public' 
  AND tablename IN ('games', 'teams', 'players', 'game_events')
ORDER BY 
  indexname;

-- ================================================
-- NOTES IMPORTANTES
-- ================================================

-- 1. N'oubliez pas d'activer Realtime pour toutes les tables dans l'interface Supabase :
--    Database > Replication > Activez pour : games, teams, players, game_events

-- 2. Les politiques RLS actuelles permettent tout pour simplifier le MVP
--    En production, vous devriez les restreindre selon vos besoins

-- 3. Pour nettoyer les anciennes parties (à exécuter manuellement si besoin) :
--    DELETE FROM games WHERE created_at < NOW() - INTERVAL '7 days' AND status = 'finished';

-- 4. Pour voir les statistiques :
--    SELECT * FROM active_games_with_teams;
