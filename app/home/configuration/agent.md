# Agent Notes: Configuration Module

## Purpose

Powers the hierarchical configuration editor for managing Sections, Elements, Components, and Conditions in a unified tree view with drag-and-drop support.

## Key Files

- `page.tsx` - Main configuration page
- `components/TreeNode.tsx` - Recursive tree node component
- `hooks/useHierarchicalData.ts` - Data loading and tree structure
- `hooks/useDragDrop.ts` - Drag and drop utilities
- `utils/stateUtils.ts` - Selection, expansion, disabled state management

## Conventions

- Preserve the `TreeNode` shape expected by `useHierarchicalData` and the drag/drop utilities.
- Maintain the `stateUtils` behaviours (selection, expansion, disabled states) when touching reducers or component props.
- Update the paired tests and fixtures in `__tests__` if invariants change.
- Integration specs in `__tests__/integration.test.tsx` exercise the end-to-end drag/drop flow; run them after structural changes.

## Related Docs

- [Hierarchical Configuration View](../../../docs/configuration/hierarchical-configuration-feature-plan.md)
- [Drag-and-Drop Configuration](../../../docs/configuration/drag-and-drop-configuration-feature-plan.md)
- [Element Reordering Fix](../../../docs/configuration/element-reordering-fix.md)
