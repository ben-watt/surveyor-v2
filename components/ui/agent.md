# Agent Notes: UI Components

## Purpose

Shared design system components built on shadcn/ui. These components are theme-agnostic, accessible, and side-effect free.

## Key Files

- `button.tsx` - Primary button variants
- `dialog.tsx` - Modal dialogs
- `sidebar.tsx` - Navigation sidebar
- `input.tsx` - Form inputs
- `card.tsx` - Content containers

## Conventions

- Treat this directory as the shared design system: keep components theme-agnostic, accessible, and side-effect free.
- Favor composition over feature-specific logic—push stateful behaviour up into the calling feature rather than adding Surveyor-specific assumptions here.
- Mirror Shadcn/Tailwind conventions already in use (utility classes, `forwardRef`, `variant` helpers).
- Update tests in `components/ui/__tests__` when altering public APIs.

## Related Docs

- See [shadcn/ui documentation](https://ui.shadcn.com/) for component patterns
