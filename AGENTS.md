# Règles Globales - AlbumFacile

- **Accessibilité Senior (80 ans) :** Toutes les interfaces DOIVENT utiliser de très grandes polices (min 20px par défaut), de forts contrastes, et des textes descriptifs très clairs. Évitez les icônes seules, accompagnez-les toujours de texte explicite.
- **Architecture :** Utilisez systématiquement l'Atomic Design pour la structure des composants (rangés dans `src/components/`).
- **Clean Code :** Suivez les principes du Clean Code : nommage descriptif complet, fonctions courtes avec une seule responsabilité.
- **Technologies :** Privilégiez Material UI (MUI) pour garantir l'accessibilité visuelle.
- **File System Access API :** Ce projet lit et manipule les fichiers locaux via le navigateur. Toujours gérer de manière claire et bienveillante les permissions demandées à l'utilisateur.
