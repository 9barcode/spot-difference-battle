# Backend / Supabase integration

## Local startup

Node 24 is required. Copy `.env.example` to the root `.env`. The server reads it in non-production environments, independent of cwd; already exported variables take precedence. Production uses injected secrets only.

- Image/play smoke test: `STORAGE_DRIVER=memory`, `PUZZLE_CATALOG_SOURCE=code`. Memory explicitly overrides an inherited DB URL. Data is not persistent.
- Supabase integration: `STORAGE_DRIVER=postgres`, `SUPABASE_DB_URL` supplied securely, `PUZZLE_CATALOG_SOURCE=database`.
- Run `pnpm setup`, then `pnpm dev`. Root `.env` is server configuration; pass the Canary frontend variable through the frontend's existing environment mechanism.
- Do not share DB URLs in messages or commit `.env`.

## Database preparation

Use an isolated development database with the existing `supabase/migrations` applied. No schema change is needed for R2. Build the server, then generate optional development data:

```sh
pnpm build:packages
pnpm --filter @spot-battle/server build
node scripts/generate-puzzle-catalog-seed.mjs > /tmp/puzzle-catalog-seed.sql
```

Review and apply the SQL only to the intended development database using the team's secret handling. It inserts missing puzzle identities and never overwrites existing versions or switches active versions. Object keys describe the contract, not proof that every object has been uploaded to R2. Only home-office is currently a delivery Canary.

## Contract

| DB | Runtime |
| --- | --- |
| pair_id | puzzleId / MatchPuzzle.id |
| asset_version | assetVersion |
| original_asset_key | puzzles/{puzzleId}/{assetVersion}/runtime/original.webp |
| modified_asset_key | puzzles/{puzzleId}/{assetVersion}/runtime/modified.webp |

The DB catalog is loaded at startup. Empty catalogs, unknown puzzle IDs, unsupported frontend versions, malformed keys and invalid answer regions fail startup. Restart after changing the active catalog. Existing matches restore their saved puzzle/answer snapshots. Answers remain server-only. Credentials are not part of this contract.

The current frontend still selects visuals from its bundled manifest. Therefore this phase permits only IDs/versions supported by that manifest, preserves Git rollback, and does not enable all-puzzle R2 delivery. The existing code catalog remains the default until DB data is ready.

## Acceptance

1. Start with database storage and database catalog; verify `/health` reports database true.
2. On the R2 Canary branch, set `GAME_SCENE_ID=home-office` for the backend and the frontend Canary URL through its existing mechanism.
3. Two clients match, load both Worker images, play and finish.
4. Verify matches/match_players and active-match cleanup in the isolated DB.
5. Exercise server restart and reconnect. The existing PostgreSQL restart tests require a real database URL; execute them only against the isolated development DB.
6. Repeat with Canary disabled to verify Git delivery rollback.

Playwright defaults to memory storage. To exercise the DB path, inject the isolated development `SUPABASE_DB_URL` and run `E2E_STORAGE_DRIVER=postgres pnpm e2e`. This explicitly selects the database catalog and fails if the connection setting is missing. These tests write guest/match records to the selected database. No live Supabase or complete Canary acceptance is claimed until these steps run against the configured environment.
