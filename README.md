# IPTV TV Manager - Node.js + React

Une application complète de gestion IPTV avec backend Node.js et frontend React, remplaçant l'ancienne application Streamlit.

## 🚀 Fonctionnalités

- **Gestion des Séries** : Parcours, recherche et détails des séries TV
- **Gestion des Playlists** : Gestion des chaînes IPTV avec filtres et recherche
- **Téléchargements** : Intégration aria2 pour télécharger épisodes et chaînes
- **Interface Moderne** : Design responsive avec styled-components
- **API REST** : Backend Express avec endpoints optimisés

## 🏗️ Architecture

```
app_js/
├── server.js              # Serveur Express principal
├── package.json           # Dépendances backend
├── client/                # Application React
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   ├── App.js         # Composant principal avec routing
│   │   └── index.js       # Point d'entrée React
│   └── package.json       # Dépendances frontend
└── README.md              # Ce fichier
```

## 📋 Prérequis

- Node.js 16+ 
- npm ou yarn
- Accès à un serveur IPTV
- Serveur aria2 configuré

## 🛠️ Installation

### 1. Cloner et installer les dépendances

```bash
cd app_js

# Installer les dépendances backend
npm install

# Installer les dépendances frontend
cd client
npm install
cd ..
```

### 2. Configuration des variables d'environnement

```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer .env avec vos informations
nano .env
```

Variables requises dans `.env` :
```env
XTREAM_HOSTNAME=your-tv-server.com
XTREAM_PASSWORD=your-tv-password
RPC_PASSWORD=your-aria2-rpc-password
ARIA2_URL=http://192.168.0.12:6800/jsonrpc
PORT=5000
```

### 3. Lancer l'application

#### Mode développement (avec hot reload)
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run client
```

#### Mode production
```bash
# Construire le frontend
npm run build

# Lancer le serveur
npm start
```

L'application sera accessible sur `http://localhost:5000`

## 🔧 Scripts disponibles

- `npm start` : Lance le serveur en mode production
- `npm run dev` : Lance le serveur en mode développement avec nodemon
- `npm run client` : Lance le frontend React en mode développement
- `npm run build` : Construit le frontend pour la production
- `npm run install-client` : Installe les dépendances frontend

## 🌐 API Endpoints

### Séries
- `GET /api/series` - Liste de toutes les séries
- `GET /api/series/:id` - Détails d'une série spécifique
- `GET /api/series/search/:query` - Recherche de séries

### Playlist
- `GET /api/playlist` - Liste des chaînes IPTV

### Téléchargements
- `POST /api/download` - Démarrer un téléchargement via aria2

### Catégories
- `GET /api/categories/:type` - Catégories (live, vod, series)

## 🎨 Interface Utilisateur

### Pages principales
1. **Home** (`/`) : Page d'accueil avec présentation des fonctionnalités
2. **Series** (`/series`) : Liste des séries avec recherche et filtres
3. **Series Detail** (`/series/:id`) : Détails d'une série avec épisodes et téléchargements
4. **Playlist** (`/playlist`) : Gestion des chaînes IPTV

### Composants
- **Navbar** : Navigation principale avec liens actifs
- **SeriesCard** : Carte affichant les informations d'une série
- **EpisodeCard** : Carte pour chaque épisode avec bouton de téléchargement
- **PlaylistTable** : Tableau des chaînes avec filtres

## 🔒 Sécurité

- Variables d'environnement pour les informations sensibles
- Validation des entrées côté serveur
- Gestion des erreurs avec try/catch
- Headers CORS configurés

## 📱 Responsive Design

L'interface s'adapte automatiquement aux différentes tailles d'écran :
- Desktop : Grilles multi-colonnes
- Tablet : Grilles adaptatives
- Mobile : Layout en colonne unique

## 🚀 Déploiement

### Heroku
```bash
# Ajouter les variables d'environnement dans Heroku
heroku config:set XTREAM_HOSTNAME=your-server.com
heroku config:set XTREAM_PASSWORD=your-password
heroku config:set RPC_PASSWORD=your-aria2-password

# Déployer
git push heroku main
```

### Docker
```bash
# Construire l'image
docker build -t iptv-manager .

# Lancer le conteneur
docker run -p 5000:5000 --env-file .env iptv-manager
```

## 🐛 Dépannage

### Erreur de connexion à l'API
- Vérifier les variables d'environnement
- Contrôler la connectivité au serveur IPTV
- Vérifier les logs du serveur

### Problèmes de téléchargement
- Vérifier la configuration aria2
- Contrôler les permissions du dossier de téléchargement
- Vérifier la connectivité réseau

### Erreurs de build React
- Nettoyer le cache : `npm run build -- --reset-cache`
- Supprimer node_modules et réinstaller
- Vérifier la version de Node.js

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Vérifier la documentation
- Consulter les logs du serveur

---

**Note** : Cette application remplace complètement l'ancienne version Streamlit avec une architecture moderne et performante.
