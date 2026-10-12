# Contributing to Neon Rift Survivor

Thanks for helping improve **Neon Rift Survivor**, an original browser game built with Canvas, JavaScript, CSS, and WebAudio.

This guide keeps changes focused, testable, and respectful of players' saved progress.

## Before you start

1. Look through [open issues](https://github.com/dvilrgamerz/Neon-Rift-Survivor/issues) and existing pull requests. Comment on an issue if the proposed change overlaps existing work.
2. For new fixes, describe the current behavior, the expected behavior, and how to reproduce the problem.
3. Make one focused change per PR. Keep larger version-roadmap work separate from small fixes.
4. Don't commit secrets, API keys, user data, copied commercial assets, or third-party material without a valid license and attribution.

## Local development

This is a static browser game; you do **not** need a cloud account or production database to run the core game.

```bash
git clone https://github.com/dvilrgamerz/Neon-Rift-Survivor.git
cd Neon-Rift-Survivor
python -m http.server 8000
```

Open `http://localhost:8000` in a modern browser. Check your browser console for script and asset errors.

> Offline/PWA updates involve caching. For manual testing, use a fresh browser profile or clear/unregister the site's service worker so old assets do not hide a change.

## Suggested branch and commit workflow

```bash
git switch main
git pull --ff-only
git switch -c fix/short-description
# make and review focused changes
git diff --check
git add <specific-files>
git commit -m "fix: short explanation"
git push -u origin fix/short-description
```

If working from a fork, replace the upstream remote with your fork as appropriate. Use clear prefixes such as `fix:`, `feat:`, `test:`, `docs:`, or `refactor:`.

## Testing expectations

### For all changes

- [ ] Run the game on a fresh load and check for new console errors.
- [ ] Verify the affected screen/flow and at least one unrelated gameplay flow.
- [ ] Check a desktop viewport and a narrow mobile viewport when layout or input changes.
- [ ] Test keyboard interactions; for touch/controller changes, check the affected device when possible.
- [ ] Confirm no private data, credentials, or incompatible third-party assets were introduced.
- [ ] Run `git diff --check` before requesting review.

### For gameplay, saves, and upgrades

- [ ] Run through starting, pausing, resuming, upgrading, game-over, and restarting when affected.
- [ ] Check reduced-motion/readability behavior for visual effects or boss warnings.
- [ ] Protect existing `localStorage` progression and versioned save data. Test with a fresh save **and** an existing save (back it up first).
- [ ] Validate performance and control responsiveness after UI or VFX changes.
- [ ] Where relevant, use the [upgrade-regression issue #8](https://github.com/dvilrgamerz/Neon-Rift-Survivor/issues/8) and note the cases actually run.

Document checks that were **not** performed rather than claiming a full pass. This project does not have a required `npm test` command at repository root; don't imply that it does.

## Opening a pull request

Include:

- the user-facing problem and scope, with `Fixes #123` only when it fully resolves the issue;
- a concise summary of changes and any files or game systems affected;
- exact tests performed, environment (desktop/mobile/browser), and outcomes;
- screenshots or a short recording for visual changes;
- risks, save-migration implications, and follow-up work if needed.

Avoid mixing unrelated version planning, formatting churn, generated files, and gameplay changes.

## Review and merge

Review for correctness, original content, safety of existing saves, game feel, and accessibility—not just style. Resolve review comments and keep the PR branch up to date. Merge only when the change is demonstrably ready; a planning document alone is not a completed gameplay feature.

## Security and licensing

Please do not publish real user tokens, credentials, personal information, or vulnerabilities with sensitive exploit details in a public issue. Contact maintainers privately for security-sensitive disclosures. Preserve the repository's MIT license and any existing third-party attributions. Do not use proprietary game artwork or audio without permission.
