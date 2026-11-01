# Workflow Git

## Branches
- `main` : version stable (livrable de fin de sprint)
- `develop` : intégration
- `feature/<n°issue>-<nom>` : une branche par user story (ex: `feature/12-upload-cv`)
- `fix/<n°issue>-<nom>` : correction de bug

## Règles
1. Jamais de commit direct sur `main` ou `develop`.
2. Une branche = une issue. Mentionner `Closes #12` dans la PR.
3. Toute PR est relue et approuvée par l'autre membre avant merge.
4. Merge avec "Squash and merge".

## Messages de commit
Format : `type: description courte`
Types : `feat`, `fix`, `docs`, `chore`, `test`, `refactor`
Exemple : `feat: ajout de l'upload du CV`

## Definition of Done
- [ ] Code fonctionnel et testé
- [ ] PR relue et approuvée
- [ ] Mergé dans `develop`
- [ ] Critères d'acceptation validés    