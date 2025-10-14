Engineering conventions

Testing layout and placement

- Prefer colocating tests next to the code they cover inside a **tests** directory within the relevant feature/module folder (e.g. pp/home/configuration/**tests**, lib/conditions/**tests**, components/**tests**).
- When adding new tests, place them under the closest feature path rather than a top-level **tests** folder.
- Use _.test.ts / _.test.tsx naming. Keep imports identical to production code (use the same path aliases like @/...).
- Integration tests should live near the feature they exercise (e.g. pp/home/\*\*/**tests**/integration/ when appropriate) to keep context and fixtures nearby.
- Avoid cross-feature test coupling; keep test utilities under a local **tests**/utils or a shared testing utils folder if already established.

These preferences apply repo-wide.
