# Agent Notes

- Utilities here wrap Capacitor plugins; always guard calls with platform checks to keep the web build tree-shakeable.
- Prefer async helpers that surface typed errors so React components can render fallbacks instead of throwing.
- When adding a new plugin wrapper, document the native prerequisites and extend the mocks in `tests` so Jest stays deterministic.
