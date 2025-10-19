# Agent Notes

- This feature powers the hierarchical configuration editor; preserve the `TreeNode` shape expected by `useHierarchicalData` and the drag/drop utilities under `tests/utils`.
- Maintain the `stateUtils` behaviours (selection, expansion, disabled states) when touching reducers or component props—update the paired tests and fixtures in `tests` if invariants change.
- Integration specs in `tests/integration.test.tsx` exercise the end-to-end drag/drop flow; run them after structural changes to avoid regressions.
