# Agent Notes: Conditions Library

## Purpose

Core logic for parsing, resolving, and validating survey condition phrases. These modules power the inline condition editor and validation feedback.

## Key Files

- `tokens.ts` - Token definitions and enums for condition parsing
- `resolver.ts` - Resolves condition templates to plain text
- `interop.ts` - Bridge between TipTap editor and condition data
- `validator.ts` - Zod-based validation for condition structures

## Conventions

- The `tokens`, `resolver`, `interop`, and `validator` modules work together—update them in sync so shared enums and schema keys stay aligned.
- Keep the parsing helpers pure; avoid importing React or browser-only utilities from `lib/conditions`.
- Extend the validator through Zod-friendly transforms so the UI editor can surface precise error messaging.
- Add or update coverage in `__tests__` whenever you touch validation rules.

## Related Docs

- [Inline Conditions Editor](../../docs/editor/inline-conditions-editor.md)
- [Condition Completion Feedback](../../docs/configuration/condition-completion-feedback.md)
