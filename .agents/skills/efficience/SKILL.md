---
name: efficience
description: Lance un test de lint et build à chaque fin de modification de code.
---
# Test d'Efficience (Lint et Build)
- **Validation continue :** À la fin de chaque tâche où du code a été modifié, l'agent DOIT lancer la commande de lint (ex: `pnpm run lint`) et de build (ex: `pnpm run build`).
- **Boucle de correction :** Tant que les tests de lint ou de build échouent, l'agent doit analyser l'erreur, modifier le code pour la corriger, et relancer la vérification jusqu'à ce que le build passe avec succès.
- **Règle absolue :** Ne jamais annoncer qu'une tâche de code est terminée tant que le code ne compile pas parfaitement.
