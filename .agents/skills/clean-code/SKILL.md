---
name: clean-code
description: Instructions pour un code propre et maintenable.
---
# Clean Code
- **Noms descriptifs :** Évitez les abréviations. Privilégiez `handleDirectorySelection` à `handleDirSel`.
- **Fonctions courtes :** Une fonction ne doit faire qu'une seule chose. Extrayez la logique complexe dans des fonctions utilitaires.
- **Gestion des erreurs :** Utilisez des blocs `try/catch` et remontez des messages d'erreur clairs, particulièrement important pour l'expérience utilisateur (senior).
- **Commentaires :** Commentez le "Pourquoi" d'un bloc de code complexe, pas le "Comment" (qui doit être lisible dans le code).
