# Review: 4b57184 — feat(roster): add 10 Ultra Europe 2026 artists

**Reviewed**: 2026-06-12
**Branch**: feature/deck-playback-roster
**Scope**: data-only change — src/data/artists.seed.json (+1,119 lines, 10 artists, 121 tracks)
**Decision**: APPROVE

## Summary
Clean data-only addition. All 121 new refs re-verified embeddable, zero duplicates
introduced, schema fully conformant, genre vocabulary consistent with the existing
filter chips, all sameAs URLs (9 Wikipedia + 10 YouTube channels) return 200.

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
- **Pre-existing, not in this diff**: 25 cross-artist duplicate video refs exist
  between OLD roster artists (collab tracks listed under both artists, e.g.
  Swedish House Mafia / Sebastian Ingrosso ×3, Axwell /\ Ingrosso ×4). This is the
  known-deferred item from the 2026-06-08 session (then 22, now 25 after the
  78-batch). None involve the new 10 artists — the two collab dups found during
  this batch (CamelPhat/ARTBAT "For A Feeling", Maddix/Hardwell "ACID") were
  deduped before merge. Existing back-to-back-replay concern unchanged.

### LOW
- `mau-p`: 2 tracks are official Coachella 2025 live uploads tagged `kind: "track"`.
  KINDS only permits `track|set`, and the titles disclose "(Live from Coachella
  2025)", so this is the best available tagging — no studio uploads exist for
  these two. Acceptable; revisit if a `live` kind is ever added.
- `maddix`: no Wikipedia sameAs — verified none exists; correct omission, slightly
  weaker JSON-LD entity grounding than the other 9.
- 3 untracked `artists.seed.json.bak.*` files sit in `src/data/`; `.gitignore`
  has no `*.bak` pattern, so a future `git add -A` would commit them. Suggest
  adding `*.bak*` to `.gitignore` or relocating backups outside `src/`.

## Data checks performed
- Schema: all required fields present on 10 artists / 121 tracks; ref format
  `[A-Za-z0-9_-]{11}`; sourceUrl == watch?v=ref for all; verified:true all;
  platform youtube all; kinds {track:121}.
- Dedup: zero dup refs within batch and vs full 88-artist roster (new entries).
- Embeddability: 121/121 re-verified single-threaded via oEmbed + embed-playability
  gate this session (independent of the curator agents' own checks).
- Genres: introduces exactly 2 new filter chips (Tech House, Hard Techno); no
  near-miss strings vs the 22 existing genres.
- Titles: no control characters, no "(Official Video/Audio)" residue.
- sameAs: 19/19 URLs return 200.
- JSON-LD: built ItemList numberOfItems=88, MusicGroup items, last 3 = Maddix,
  Miss Monique, Subtronics.

## Validation Results

| Check | Result |
|---|---|
| Type check (tsc --noEmit) | Pass |
| Tests (vitest) | Pass — 124/124, 22 files |
| Build (vite) | Pass — 52.39 kB gzip JS (budget 150 kB) |
| Live smoke (vite preview + Playwright) | Pass — 88 tiles, drawer + embed play, 0 console errors |

## Files Reviewed
- src/data/artists.seed.json — Modified (+1,119)
- src/data/artists.ts, src/types.ts, vite.config.ts — read for consumption-path context (unchanged)
