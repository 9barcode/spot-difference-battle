INSERT INTO puzzle_catalog (
    pair_id,
    asset_version,
    title,
    difficulty,
    original_asset_key,
    modified_asset_key,
    differences,
    metadata,
    is_active
)
VALUES (
    'home-office',
    '2026-08-28.2',
    '햇살 좋은 홈오피스',
    'NORMAL',
    'puzzles/home-office/2026-08-28.2/runtime/original.webp',
    'puzzles/home-office/2026-08-28.2/runtime/modified.webp',
    '[
      {
        "id": "office-wall-decor",
        "label": "벽시계와 액자",
        "regions": [
          {"x": 0.56, "y": 0.16, "radius": 0.14}
        ]
      },
      {
        "id": "office-mug",
        "label": "책상 위 머그컵",
        "regions": [
          {"x": 0.24, "y": 0.66, "radius": 0.09}
        ]
      },
      {
        "id": "office-notebook",
        "label": "노트 색",
        "regions": [
          {"x": 0.84, "y": 0.72, "radius": 0.12}
        ]
      }
    ]'::jsonb,
    '{
      "rightsStatus": "USER_SUPPLIED",
      "sourceDifficulty": "UNRATED"
    }'::jsonb,
    TRUE
);