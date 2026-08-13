---
name: atomic-design
description: Règles de structuration des composants (Atomic Design).
---
# Instructions pour l'Atomic Design
Tous les composants React doivent être rangés dans `src/components/` selon l'une de ces catégories :
- **atoms/** : Les éléments les plus simples (Boutons, Textes, Icônes, Inputs).
- **molecules/** : Combinaison de plusieurs atoms (ex: Un label + un input + un bouton, ou une ligne de fichier).
- **organisms/** : Blocs complexes avec de la logique (ex: Explorateur de fichiers, Panneau de progression).
- **templates/** : Structure de la page sans le contenu réel.

Ne placez jamais de composants directement à la racine de `components/`. Chaque composant doit être dans son propre dossier avec un fichier `index.tsx` par souci de clarté.
