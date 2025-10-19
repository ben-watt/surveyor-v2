# Agent Notes

- Treat this directory as the shared design system: keep components theme-agnostic, accessible, and side-effect free.
- Favor composition over feature-specific logic—push stateful behaviour up into the calling feature rather than adding Surveyor-specific assumptions here.
- Mirror Shadcn/Tailwind conventions already in use (utility classes, `forwardRef`, `variant` helpers). Update stories/tests in `components/ui/tests` when altering public APIs.
