---
title: Conditions Editing Feature - Approaches, Plan, and Tradeoffs
description: Options to support selectable/editable placeholders in surveyor conditions, with schema, parsing, editor UX, and rollout strategy.
owner: Product + Eng
status: In progress
last_updated: 2025-10-14
---

# Conditions Editing Feature – Approaches, Plan, and Tradeoffs

## Summary

- Goal: Let surveyors select from predefined choices inside condition text and add custom options where needed, while preserving safe formatting for export (PDF/HTML) and enabling future i18n.
- Example: “The electrical installation appears aged, with [a dated consumer unit / older wiring / loose or surface-mounted cabling / dated fittings] noted.”
- Key decisions: adopt a TipTap rich‑text document with custom inline nodes as the primary editing/preview model; retain a token syntax (`{{select:...}}`) for import/export and migration. Align persistence, validation, and rendering to this model.

Scope decisions (current phase)

- Single‑select only (no multi‑select).
- Custom entries are always allowed for select tokens.
- Per‑token hints/descriptions optional and deferred; focus on clear defaults and intuitive UI.
- Localization out of scope for MVP; keep future i18n in mind.

## Success Criteria

- Editing: Surveyor can choose an option inline and add a custom option without breaking surrounding text.
- Safety: Prevent malformed output and maintain formatting; no template crashes.
- Consistency: Same logic renders in app preview and final PDF/HTML.
- Maintainability: Configs are versioned, validated, and testable.
- Extensibility: Easy to add other inline widgets later (e.g., dates, numbers, multi-select, conditional blocks).

## Non-Goals (Initial Phase)

- Full conditional templating language (nested conditionals, loops).
- Arbitrary custom formatting in exports beyond what we already support.
- WYSIWYG parity with a full word processor; we'll scope to stable inline components.

---

## Current Progress (October 2025)

- Shared composer scaffolding shipped at `components/conditions/InlineTemplateComposer.tsx`, now with TipTap-backed visual view, token view fallback, and an upgraded action API for toolbar/slash integrations.
- Inline select implementation (TipTap node, React NodeView, input/paste rules) is live under `app/home/components/TipTapExtensions/InlineSelect*`, enabling inline dropdown UX with custom value capture.
- Token ↔ TipTap interop plus resolver utilities landed in `lib/conditions`, with unit coverage for parsing and text resolution to keep exports aligned.
- Dev playground (`app/dev/inline-select/page.tsx`) exercises the experience end-to-end and is the current integration entry point.
- Composer embedded in the configuration form (`app/home/conditions/form.tsx`) with shared sample-select actions; new unit tests (`components/conditions/__tests__/InlineTemplateComposer.test.tsx`) cover mode syncing, read-only behaviour, and action wiring.

---

## Content Modeling Options

1. Tokenized Plain Text (Template Strings)

- Store human‑readable text with token markers for interactive parts.
- Render by parsing tokens into UI controls for editing; serialize back to plain text for export.
- Pros: Simple, portable, great for diffs and code reviews; easy to migrate from bracket syntax.
- Cons: Complex inline semantics (cursor, selection) are harder; risks of malformed tokens without validation.

2. Rich Text Document (e.g., ProseMirror/TipTap JSON)

- Store a structured document model with custom inline nodes (e.g., InlineSelect).
- Pros: Robust editing semantics, precise selection/cursor behavior, schema validation; easier to extend.
- Cons: Heavier persistence format; diff noise in version control; steeper learning curve.

3. Hybrid (Template + Structured Index)

- Keep a canonical template string but also maintain a parsed index of token positions and metadata.
- Pros: Easier migration path; can validate/repair structure on save.
- Cons: Two sources of truth to keep consistent; more code.

Decision: Choose Rich Text Document (TipTap/ProseMirror JSON) as the canonical model from day one, with a bidirectional mapping to the tokenized syntax for import/export and migration. Design TipTap inline nodes 1:1 with tokens to keep portability.

---

## Token Syntax Options

Current: Brackets with options separated by slashes: `[a / b / c]`.

- Pros: Human‑friendly.
- Cons: Ambiguity with real brackets; escaping is awkward; parsing custom cases is brittle.

Common syntaxes to consider:

- Mustache/Handlebars: `{{variable}}` or helpers like `{{select key option1 option2}}`.
- ICU MessageFormat: Great for pluralization/localization patterns, less for ad‑hoc option picking.
- Shortcodes: `[select key="..." options="..."]` style; verbose inside text.

Proposed syntax (readable, explicit, i18n‑friendly):

- Inline select (single‑choice): `{{select:electrical_findings|a dated consumer unit|older wiring|loose or surface-mounted cabling|dated fittings}}`
- With default: `{{select*:electrical_findings|default=older wiring|a dated consumer unit|older wiring|...}}`
- Allow custom entry: `{{select+:electrical_findings|...}}` (the `+` declares “allow custom”).

Notes:

- Delimiters: `{{ ... }}` are widely recognized; `|` is a clear option separator.
- Options are literal text; escaping: `\|` for pipe, `\}` for closing brace, `\\` for backslash.
- Key (`electrical_findings`) anchors analytics, persistence, and mapping to UX state.

Migration parser:

- Convert legacy bracket blocks `[opt1 / opt2 / opt3]` into `{{select:key|opt1|opt2|opt3}}`.
- Generate stable keys (slug of preceding words + hash) if not supplied.

TipTap integration

- InputRule: when a user types/pastes a valid token `{{select:...}}`, automatically transform it into an InlineSelect node.
- PasteRule: on paste, parse multiple tokens and convert spans into nodes while preserving surrounding text.
- Serialize: export nodes back to token strings for pipelines that need plain text.

---

## UI Approaches

Approach A — Inline Rich Editor with TipTap

- Render tokens as custom inline nodes (`InlineSelect`): shows a pill/dropdown inline within the sentence.
- Interaction: Click to open dropdown; includes “Add custom…” entry that prompts and inserts.
- Pros: Best authoring UX; WYSIWYG; fewer context switches.
- Cons: Higher build complexity (node schema, decorations, node views, clipboard handling, selection).

Approach B — Plain Textarea + Side Panel Controls

- Center pane: template text with token highlights; side panel shows a form listing each token with controls.
- Interaction: Selecting a token in text focuses corresponding form control; editing in the form updates preview.
- Pros: Much simpler to implement; easy validation and A11y; stable exports.
- Cons: Not true inline editing; cognitive load switching between text and form.

Approach C — Split Editor (Lite Inline + Side Panel)

- Replace tokens inline with minimal chips that open the side panel for editing choices.
- Pros: Balanced complexity and UX; uses simple text rendering plus targeted controls.
- Cons: More glue code than B; still less discoverable than A for power users.

Decision: Use Approach A (TipTap inline editor) now to align with the existing previewer and provide first‑class inline selection UX. Keep token import/export to enable migration and external editing if needed.

- Prototype: the dev playground now wraps this experience inside `components/conditions/InlineTemplateComposer.tsx`, pairing the TipTap view with a token editor toggle. It’s ready to embed in feature work and exposes imperative helpers (insert token text, insert inline select, switch modes) for custom actions.

---

## Data Schema (Initial)

ConditionRecord (persisted)

- `id: string`
- `version: number` (monotonic)
- `doc: ProseMirrorJSON` (TipTap document with InlineSelect nodes)
- `template?: string` (optional, normalized tokenized text for export/interop)
- `meta: { title?: string, category?: string, ... }`
- `indexes?: TokenMeta[]` (optional, derived cache for quick lookup/analytics)

TokenMeta

- `key: string` (e.g., `electrical_findings`)
- `type: "select"` (future: `text`, `date`, `multi_select`, `bool`)
- `options: string[]`
- `allowCustom: boolean` (default true for current scope)
- `default?: string`

RenderedCondition (derived)

- `text: string` (final resolved text)
- `selections: Record<string,string>` (including custom entries)

Validation

- Schema‑level: InlineSelect node requires `key`, non‑empty `options`, unique options, optional `default` ∈ options, and `allowCustom` boolean.
- Input/paste: reject malformed tokens; surface inline errors with decorations and tooltips.
- On save: validate the document against the schema and uniqueness of keys within a document.
- On render: require a value for each token or fall back to default (if provided) or block completion with clear error.

---

## Parsing and Rendering

Parser (import/export)

- Import: parse tokenized text into a ProseMirror doc, converting tokens into InlineSelect nodes and plain text into text nodes.
- Export: serialize InlineSelect nodes back to token strings, then concatenate with plain text for a normalized template string.
- Token structure: `\{\{(?<flags>[a-z+*]*):(?<key>[a-zA-Z0-9_\-]+)\|(?<body>.*?)\}\}`; split `body` on unescaped `|`; support `default=...` and escapes.

Renderer (preview/export)

- Preview: TipTap renders the document with InlineSelect node views; resolved text is shown in read‑only contexts.
- Export (PDF/HTML): resolve InlineSelect nodes to selected values (or defaults) and render as plain text; identical resolution path for app preview and exports.

Editor binding

- InlineSelect NodeView: inline dropdown with options and “Add custom…” when allowed; emits transactions that update node attrs and a `selections` map.
- Optional side panel: list all tokens with current values, validation state, and quick navigation.

Edge cases & behaviors

- Copy/paste: copying a node pastes its resolved text when pasting into plain fields; within TipTap, preserve node with attrs.
- Undo/redo: rely on ProseMirror transactions; ensure custom entry dialogs commit values as a single transaction.
- Deletion: deleting a node should not leave double spaces; normalize surrounding whitespace.
- Punctuation: avoid inserting extra spaces before punctuation; rules in the resolver handle spacing.

---

## Validation & Feedback

- Strong schema validation: TipTap schema enforces required attributes and value constraints.
- InputRules & PasteRules: accept only valid `{{select:...}}` tokens; show inline error decorations for malformed tokens with a quick‑fix to open an insert dialog.
- Decorations: highlight invalid nodes; hover shows tooltip with the specific error and a fix button.
- Document linter: panel lists all issues (duplicate keys, empty options, invalid default) with click‑to‑focus.
- Save guards: disable finalization/export while errors exist; provide guided fixes where possible.

Unresolved state UX

- If no selection is made and no default is provided, show a subtle unresolved style (chip with dot/outline) and include in linter.
- Optional config to auto-select first option on insert for speed; keep as a setting per token insert action.

---

## Integration Next Steps

1. ✅ Embed the composer within configuration + survey condition editors (replace the level-3 phrase textarea in `app/home/conditions/form.tsx` first), persisting TipTap JSON alongside the legacy token field.
2. Expose feature-facing insertion affordances (toolbar buttons, slash commands) using the shared action API instead of playground-only helpers.
3. Layer validation UX: schema checks, inline decorations, and a side panel summary that blocks save/export until issues resolve.
4. Thread serialization through save/publish/export: store `doc`, regenerate normalized token strings for legacy consumers, and reuse the shared resolver for PDF/HTML output.
5. Add colocated integration tests covering mode toggling, inline edits, validation states, and persistence round-trips to safeguard the new flows.

---

## User Flows

Surveyor

- Open a condition → sees text preview; tokens highlighted.
- Inline dropdown for tokens; “Add custom…” available when allowed.
- Choose option or add custom → preview updates; can reset to default.

Author/Admin

- Edit the document; insert InlineSelect nodes via slash command/toolbar.
- Validator runs on save and shows precise errors with location.
- Import/export tokenized text for bulk editing or migration.

---

## Accessibility

- Ensure all interactive controls are reachable by keyboard; maintain focus order from text → corresponding control.
- High‑contrast token highlights; do not convey meaning by color alone.
- Announce changes (live region) when preview updates.

## Internationalization (Plan Ahead)

- Keep tokens language‑agnostic: keys are stable identifiers; options are localized strings.
- For exports in other locales, resolve tokens using the current locale’s option strings.
- ICU MessageFormat can be layered later for plurals; avoid coupling token syntax to plural logic initially.

## Performance

- TipTap doc operations are local and fast for short templates.
- Memoize import/export serialization per `version`; re-run only when doc changes.

## Security

- Treat all inserted text as plain text; escape HTML in exports unless explicitly allowed.
- Disallow script/HTML in tokens and custom entries by default.
- Validate on both client and server.

## Persistence and Versioning

- Increment `version` on template change; keep migration scripts to/from legacy bracket syntax and tokens.
- Store `selections` per report instance; do not mutate the base template/doc.
- Consider soft‑locking if multiple editors can edit the same report concurrently.

## Export Considerations

- PDF/HTML share the same resolution function to avoid divergence.
- Keep non‑breaking spaces/typography stable; consider typographic fixes after resolution, not before.

## Telemetry

- Track token usage (which options chosen, frequency of custom entries) to refine defaults.
- Log validation errors to identify problematic templates.

---

## Phase Plan

Phase 0 — Discovery (Short)

- Confirm single vs multi‑select requirements per token.
- Confirm need for admin authoring vs surveyor‑only selection.

Phase 1 - MVP Foundations (TipTap Inline) **in progress**

- (done) Implement TipTap InlineSelect node + NodeView (dropdown, add custom option, default indicator).
- (done) Add InputRule and PasteRule to transform `{{select:...}}` and `[a / b]` into nodes.
- (in progress) Add schema validation and inline error decorations; document linter panel.
- (done) Resolver to produce plain text for preview/export; unit tests.
- (in progress) Ship behind a feature flag for 1-2 conditions; gather feedback.

Deliverables

- (done) TipTap extension `InlineSelect` with schema, NodeView, input/paste rules.
- (done) Resolver function `resolveDocToText(doc, selections?)` with tests.
- (done) Importer `tokensToDoc(template: string)` and exporter `docToTokens(doc)` with tests.
- (in progress) Linter plugin with decorations and side panel integration.
- (in progress) Feature flag wiring; analytics events for option selection and custom usage.

Phase 2 — Authoring Tools

- Insert menu and slash commands to add InlineSelect nodes; quick edit dialog for options.
- Token import/export: serialize doc to tokenized text for interop; import from tokenized configs.
- Tests for importer/exporter and validator.

Deliverables

- Insert menu, slash command, and edit dialog for InlineSelect options.
- Deterministic key generator and duplicate‑key detector with quick‑fix.

Phase 3 — Extensions

- Add InlineText, InlineDate, and optional InlineMultiSelect nodes mapped to future tokens (`{{text:...}}`, `{{date:...}}`, `{{multi:...}}`).
- Side panel enhancements (bulk edit, navigate invalids).

Phase 4 — i18n

- Introduce i18n for options via key lookup and locale‑aware export.

---

## Tradeoffs Overview

- Speed to Ship: TipTap Inline (moderate) vs Tokenized + Side Panel (fastest) vs Split Editor (moderate).
- Robustness: TipTap Inline strongest due to schema and node semantics.
- Maintainability: TipTap is heavier but aligns with existing previewer and reduces divergence.
- Migration: Use importer to convert existing bracket syntax or tokenized text into TipTap nodes.

---

## Open Questions

- Default behavior: prefer unresolved state vs auto‑select first option on insert? (MVP proposes unresolved with optional auto‑select).
- Key generation policy: deterministic slug + short hash from nearby text vs explicit prompt on insert?
- Copy/paste semantics: when pasting resolved text, should we attempt to re‑link it to an existing token by key if context matches?
- Deletion behavior: if an InlineSelect node is deleted, should nearby punctuation/spacing be normalized automatically?
- Export punctuation/spacing: rules for spaces around tokens when next to punctuation.
- Concurrency: how to handle simultaneous edits to the same condition (client hints + last‑write wins vs server reconciliation)?
- Telemetry privacy: aggregate only; ensure no sensitive data in custom entries is sent unencrypted.

---

## Minimal API Sketches

TypeScript types

```ts
type TokenFlags = {
  allowCustom?: boolean; // '+'
  required?: boolean; // default true unless '*'
};

type ParsedNode =
  | { type: 'text'; value: string; start: number; end: number }
  | {
      type: 'select';
      key: string;
      options: string[];
      defaultValue?: string;
      flags: TokenFlags;
      start: number;
      end: number;
    };

function parseTemplate(template: string): ParsedNode[];
function validateTemplate(nodes: ParsedNode[]): {
  ok: boolean;
  errors: { message: string; at: number }[];
};
function resolveTemplate(nodes: ParsedNode[], selections: Record<string, string>): string;

// TipTap node attrs (InlineSelect)
type InlineSelectAttrs = {
  key: string;
  options: string[];
  allowCustom?: boolean; // default true in MVP
  defaultValue?: string; // must be in options if present
};
```

Migration example

```txt
Input:  The installation appears aged, with [a / b / c] noted.
Output: The installation appears aged, with {{select:electrical_findings|a|b|c}} noted.
```

---

## Recommendations

- Adopt TipTap as the primary editor/preview model with an InlineSelect node.
- Retain the tokenized syntax `{{select:key|...}}` for import/export and migration; implement solid Input/Paste rules.
- Add live validation via schema + decorations; block export on errors and offer guided fixes.
- Implement importer for legacy bracket blocks and tokenized configs; provide deterministic key generation.
- Keep export resolution unified across preview and PDF/HTML.

Implementation recommendations (detailed)

- Keyboard UX: Enter to confirm dropdown selection; Esc to close; Arrow keys navigate; type‑ahead filter options.
- Custom entry flow: include “Add custom…” at bottom of dropdown; open inline prompt; insert as selected value and persist as a user‑specific value (not added to global options).
- Error messages: concise, action‑oriented (“Default ‘X’ is not in options”).
- Analytics: record only key + option index or “custom”; avoid sending raw custom text unless opted‑in.
- Testing: snapshot NodeView rendering, schema attr validation, import/export round‑trip, and resolver output.

---

## References

- TipTap (ProseMirror-based): https://tiptap.dev
- ProseMirror Guides: https://prosemirror.net/docs/guide/
- Mustache/Handlebars: https://handlebarsjs.com/guide/
- ICU MessageFormat: https://formatjs.io/docs/icu-syntax
- UK Electrical Reporting (contextual): NICEIC — https://www.niceic.com

