# Release Checklist

Use this before merging a gameplay PR into `main` (which is the Netlify deployment branch).

- [ ] Run `node scripts/validate-v31.js`.
- [ ] Start a Standard run and confirm movement/autofire work.
- [ ] Trigger a level-up and verify three upgrade cards render.
- [ ] Verify card level text and effect previews match the selected upgrade.
- [ ] Use both rerolls and confirm the count reaches zero and resets on a new run.
- [ ] Verify keyboard `1`/`2`/`3` selection and `R` reroll.
- [ ] Verify an EVO-ready card clearly names the EVO.
- [ ] Confirm maxed upgrades do not return to the pool.
- [ ] Check Easy, Impossible, and Custom mode selection.
- [ ] Test a narrow/mobile viewport and touch movement.
- [ ] Confirm game over → Play Again resets the run correctly.
- [ ] Confirm README/changelog or release notes describe player-facing changes.
- [ ] Review the PR diff for accidental changes outside the intended feature.
