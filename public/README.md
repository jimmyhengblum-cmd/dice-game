# 🎲 Dice Game - Jeu Multijoueur en Temps Réel

Un jeu de plateau multijoueur en ligne inspiré d'un jeu de dés classique. Les joueurs forment des équipes et jouent à tour de rôle en lançant des dés avec des règles spéciales et des duels.

## 🎮 Fonctionnalités

- **Multijoueur en temps réel** : Tous les joueurs voient les actions en direct
- **Système d'équipes** : Créez et rejoignez des équipes avec vos amis
- **Lancers de dés animés** : Animations fluides avec Framer Motion
- **Règles spéciales** :
  - Doubles : Animation spéciale
  - Double 6 : Animation super spéciale
  - 4-1 ou 1-4 : Devient la "Catin"
  - Somme = 7 : Peut lancer un duel entre deux équipes
- **Système de duels** : Affrontements spectaculaires entre équipes
- **Historique des événements** : Suivez toutes les actions du jeu

## 🛠️ Stack Technique

- **Frontend** : React 18 + Vite
- **Styling** : Tailwind CSS
- **Animations** : Framer Motion
- **Backend & Base de données** : Supabase (PostgreSQL + Realtime)
- **État** : Zustand (optionnel, actuellement pas utilisé mais disponible)

## 📋 Prérequis

- Node.js 18+ et npm/yarn/pnpm
- Un compte Supabase (gratuit)
- Git

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <votre-repo>
cd dice-game
```

### 2. Installer les dépendances

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

### 3. Configuration Supabase

#### A. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez l'URL du projet et la clé anonyme (anon key)

#### B. Créer les tables

Dans le SQL Editor de Supabase, exécutez le script suivant :

```sql
-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des parties
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT DEFAULT 'lobby',
  current_team_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des équipes
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_catin BOOLEAN DEFAULT FALSE,
  turn_order INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des joueurs
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  is_connected BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des événements de jeu
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_teams_game ON teams(game_id);
CREATE INDEX idx_players_game ON players(game_id);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_events_game ON game_events(game_id);
CREATE INDEX idx_games_status ON games(status);

-- Activer Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (tout le monde peut tout faire pour simplifier le MVP)
CREATE POLICY "Enable all for games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for game_events" ON game_events FOR ALL USING (true) WITH CHECK (true);
```

#### C. Activer Realtime

1. Dans Supabase, allez dans **Database** > **Replication**
2. Activez la réplication pour les tables : `games`, `teams`, `players`, `game_events`

#### D. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditez le fichier `.env` :

```env
VITE_SUPABASE_URL=https://votre-project.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key
```

### 4. Lancer le projet en développement

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

Le jeu sera accessible sur `http://localhost:3000`

## 📦 Déploiement

### Option 1 : Vercel (Recommandé)

1. Push votre code sur GitHub
2. Allez sur [vercel.com](https://vercel.com)
3. Cliquez sur "New Project"
4. Importez votre repository GitHub
5. Ajoutez les variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Déployez !

Vercel détectera automatiquement Vite et utilisera les bonnes commandes.

### Option 2 : Netlify

1. Push votre code sur GitHub
2. Allez sur [netlify.com](https://netlify.com)
3. Cliquez sur "Add new site" > "Import an existing project"
4. Connectez GitHub et sélectionnez votre repo
5. Configuration :
   - Build command : `npm run build`
   - Publish directory : `dist`
6. Ajoutez les variables d'environnement dans Site settings > Environment variables
7. Déployez !

### Builds de production

```bash
npm run build
npm run preview  # Pour tester le build en local
```

## 🎯 Comment jouer

1. **Connexion** : Entrez votre pseudo sur l'écran d'accueil
2. **Lobby** :
   - Créez ou rejoignez une équipe
   - Attendez que les autres joueurs rejoignent
   - Au moins 2 équipes avec des joueurs sont nécessaires
   - Cliquez sur "Démarrer la partie"
3. **Jeu** :
   - Les équipes jouent à tour de rôle
   - Le joueur de l'équipe courante lance les dés
   - Résultats spéciaux :
     - **Doubles** : Animation spéciale
     - **Double 6** : Animation super spéciale 🎉
     - **4-1 ou 1-4** : Votre équipe devient la Catin 💀
     - **Somme = 7** : Vous pouvez lancer un duel ⚔️
   - En cas de duel :
     - Sélectionnez deux équipes adverses
     - Chaque équipe lance un dé
     - L'équipe avec le plus grand chiffre gagne

## 🔧 Structure du projet

```
dice-game/
├── src/
│   ├── components/
│   │   ├── Game/
│   │   │   ├── GameBoard.jsx      # Plateau de jeu principal
│   │   │   └── DuelModal.jsx      # Modal pour les duels
│   │   ├── Lobby/
│   │   │   └── Lobby.jsx          # Salle d'attente
│   │   └── shared/
│   │       └── Dice.jsx           # Composant dé avec animations
│   ├── hooks/
│   │   └── useRealtime.js         # Hook pour le temps réel
│   ├── lib/
│   │   ├── supabase.js            # Client Supabase + helpers DB
│   │   └── gameLogic.js           # Logique métier du jeu
│   ├── App.jsx                    # Composant principal
│   ├── main.jsx                   # Point d'entrée
│   └── index.css                  # Styles globaux
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🎨 Personnalisation

### Modifier les règles

Éditez `src/lib/gameLogic.js` pour changer :
- Les conditions de doubles
- Les règles du statut Catin
- La logique de somme = 7
- Les règles de duel

### Changer le design

Le projet utilise Tailwind CSS. Modifiez :
- `tailwind.config.js` pour les couleurs/thème globaux
- Les classes Tailwind dans les composants pour le design

### Ajouter de nouvelles fonctionnalités

Le code est modulaire. Quelques idées :
- Système de points/score
- Historique des parties
- Classement des équipes
- Chat intégré
- Effets sonores
- Plus de règles spéciales

## 🐛 Débogage

### Les données ne se synchronisent pas en temps réel

1. Vérifiez que Realtime est activé dans Supabase pour toutes les tables
2. Vérifiez les logs de la console du navigateur
3. Vérifiez que les politiques RLS sont bien configurées

### Erreur de connexion Supabase

1. Vérifiez vos variables d'environnement (.env)
2. Vérifiez que l'URL et la clé sont correctes
3. Vérifiez que le projet Supabase est actif

### Les animations ne fonctionnent pas

1. Vérifiez que Framer Motion est bien installé : `npm install framer-motion`
2. Vérifiez la console pour des erreurs

## 📝 Améliorations futures (V2+)

- [ ] Authentification avec Supabase Auth
- [ ] Système de salons multiples (plusieurs parties simultanées)
- [ ] Invitations par lien
- [ ] Historique des parties
- [ ] Statistiques des joueurs
- [ ] Mode spectateur
- [ ] Chat en temps réel
- [ ] Effets sonores
- [ ] Thèmes personnalisables
- [ ] Application mobile (React Native)
- [ ] Reconnexion automatique en cas de déconnexion

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 👨‍💻 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.

---

Bon jeu ! 🎲🎉
