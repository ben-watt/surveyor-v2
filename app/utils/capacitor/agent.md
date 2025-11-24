# Agent Notes: Capacitor Utilities

## Purpose

Wrappers for Capacitor plugins that enable native mobile functionality while maintaining web compatibility.

## Key Files

- `camera.ts` - Native camera access wrapper
- `filesystem.ts` - Native file system operations
- `browser.ts` - In-app browser functionality

## Conventions

- Utilities here wrap Capacitor plugins; always guard calls with platform checks to keep the web build tree-shakeable.
- Prefer async helpers that surface typed errors so React components can render fallbacks instead of throwing.
- When adding a new plugin wrapper, document the native prerequisites and extend the mocks in `__tests__` so Jest stays deterministic.

## Related Docs

- [Capacitor Native Camera Migration](../../../docs/images-media/capacitor-native-camera-migration.md)
- [Camera Integration Plan](../../../docs/images-media/camera-integration-plan.md)
