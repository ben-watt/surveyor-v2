# Survey Report Templates – Feature Proposal

## Overview
- **Objective:** Enable organisations to author and maintain customised survey report templates without code changes.
- **Drivers:** Support multiple report formats, empower customer branding, and unlock AI-assisted drafting in the editor.
- **Current pain:** The building survey PDF is hard-coded in `app/home/surveys/building-survey-reports/BuildingSurveyReportTipTap.tsx`, coupling data bindings with layout and copy. Any change requires redeploying the application.

## Current State Assessment
- The renderer is a single React function that assembles every page with nested JSX loops and literals.
- Static copy (e.g. disclaimers, risk statements) is baked into the source file, preventing reuse or localisation.
- Helper primitives (`TableBlock`, `Page`, `RiskRow`) exist but are scoped to the module, so other reports must duplicate logic.
- Routing and editor flows assume a single `templateId=building-survey`, blocking future template selection.
- Validation is implicit: runtime errors surface only after rendering; there is no preflight check on bindings.

## Proposed Direction
1. **Template Descriptor Schema**
   - Represent each report as structured configuration (JSON/TypeScript) describing pages, blocks, bindings, iteration, and conditionals.
   - Reference survey data via whitelisted paths (e.g. `reportDetails.address.line1`, `sections[].elementSections[]`).
   - Store static content alongside descriptors to allow versioning and localisation.

2. **Renderer and Primitives**
   - Extract reusable primitives (page, tables, image grids, risk rows, headings) into a template runtime package.
   - Build an interpreter that consumes the descriptor, evaluates bindings against `BuildingSurveyFormData`, and emits the same TipTap-compatible structure.
   - Preserve deterministic output; provide graceful fallbacks mirroring the current `fallback()` helper.

3. **Template Lifecycle**
   - Persist templates and their versions (e.g. `templateId`, `version`, `publishedAt`) in the document store or a dedicated collection.
   - Tag survey documents with the template version used for generation to support regeneration and auditing.
   - Provide migration tooling to backfill the existing building survey template in descriptor form and validate parity via snapshot tests.

4. **Authoring & Governance**
   - Short term: manage descriptors in-repo under `app/home/surveys/<name>/templates`.
   - Mid term: expose metadata in the editor (name, description, version notes, ownership).
   - Long term: build a UI (or AI-assisted flow) for composing templates, powered by the descriptor schema.

## Tradeoffs
- **Pros:** Unlocks multiple report types, reduces deployment friction, aligns with AI-driven drafting, and centralises validation.
- **Cons:** Requires upfront investment in schema design, renderer implementation, and robust validation tooling. Runtime interpretation may impact performance if not optimised.
- **Mitigations:** Start with a targeted schema that reflects existing building survey structure, add caching for compiled templates, and incrementally expand features (conditions, calculated fields) as needed.

## Risks & Mitigations
- **Complexity creep:** Keep initial schema focused on core blocks; defer advanced layout controls until parity is achieved.
- **Security:** Restrict bindings to declarative selectors; disallow arbitrary code execution in descriptors.
- **Data drift:** Add compile-time validation against `BuildingSurveyReportSchema` to catch missing or renamed fields.
- **User adoption:** Pilot with internal teams and capture feedback before exposing template authoring to customers.

## Open Questions
- Where should template files live long-term (database vs object storage vs Git-managed repo)?
- How should we handle rich text content that currently depends on TipTap JSON nodes?
- Do we need translation/localisation support in v1, or is org-level copy sufficient?
- Should template selection be scoped per organisation, per survey type, or per document?

## Implementation Plan

See [building-survey-report-refactoring-plan.md](./building-survey-report-refactoring-plan.md) for detailed, incremental refactoring steps including:
- Phase 1: Quick wins (constants, org config, utilities)
- Phase 2: Content extraction (static text separation)
- Phase 3: Reusable primitives (component library)
- Phase 4: Data binding strategies (multiple options evaluated)
- Testing strategy and migration safety measures

