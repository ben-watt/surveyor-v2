# Agent Notes

- The `tokens`, `resolver`, `interop`, and `validator` modules work together—update them in sync so shared enums and schema keys stay aligned.
- Keep the parsing helpers pure; avoid importing React or browser-only utilities from `lib/conditions`.
- Extend the validator through Zod-friendly transforms so the UI editor can surface precise error messaging. Add or update coverage in `tests` whenever you touch validation rules.
