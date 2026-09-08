# Pending puzzle asset import — 2026-09-09

> Status: REVIEW_REQUIRED

## Import result

- Source: `C:\Users\dbrud\SpotTheDifference_Assets`
- Destination: `apps/web/src/assets/puzzles/pending/{easy,medium,hard}`
- Added: 48 complete pairs / 96 JPEG files
  - EASY: 18 pairs / 36 files
  - MEDIUM: 16 pairs / 32 files
  - HARD: 14 pairs / 28 files
- Excluded as existing visual duplicates: bakery set 1, mushroom set 2, cyberpunk set 3, underwater set 4, winter set 5 (10 files)
- Excluded as incomplete pairs: `easy_medieval_alchemist_original.jpg`, `medium_photo_seoul_original.jpg`

Files whose names already existed with different bytes were preserved under a `-candidate-20260909` suffix. No existing asset was overwritten.

## Activation gate

These files are staged candidates, not playable puzzles. A pair may move out of `pending` only after all of the following are recorded:

1. original/modified orientation is confirmed;
2. differences are object-level and visually unambiguous;
3. answer regions are manually authored and tested at supported viewports;
4. difficulty is play-tested rather than inferred only from the source folder;
5. ownership, licensing, and third-party character or trademark review are approved;
6. the shared manifest, server puzzle catalog, web catalog, tests, and documentation are updated together.

Names containing third-party properties, including `tintin`, require explicit rights approval before distribution or activation.
