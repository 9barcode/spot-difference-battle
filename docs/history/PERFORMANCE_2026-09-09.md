# Performance maintenance — 2026-09-09

- Load the solo game module on demand instead of including it in the initial competition bundle.
- Exclude pending puzzle images (91,410,180 bytes) from Docker build context; sources remain in Git.
- Align both Docker stages with the declared Node >=24 requirement (previously Node 22).

Validation targets: type/structure checks, production build, existing solo completion E2E. Docker execution is not covered by those checks.
