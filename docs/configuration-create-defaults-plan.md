### Plan: Default parent selections when creating entities from the configuration tree

#### Problem
From the configuration tree (`ConfigTreeNode.tsx`), users can add child entities
(e.g., add an Element under a Section). The create form that opens does not
pre-populate its parent field (e.g., `sectionId`), forcing the user to reselect
the parent.

#### Goal
When creation is initiated from the tree, the relevant parent should be selected
by default in the form:
- Element created from a Section → default `sectionId`.
- Component created from an Element → default `elementId`.
- Condition created from an Element or Component → default
  `associatedElementIds` or `associatedComponentIds` respectively.

#### Current state
- `HierarchicalConfigView.tsx` already navigates with `parentType` and
  `parentId` query params when creating from the tree:
  - `.../create?returnTo=...&parentType=<type>&parentId=<id>`
- The create pages do not currently read these params or pass defaults to their
  forms.
- Forms support for defaults:
  - Elements: `app/home/elements/form.tsx` does NOT accept `defaultValues` yet.
  - Components: `app/home/building-components/form.tsx` DOES accept
    `defaultValues?: Partial<Component>`.
  - Conditions: `app/home/conditions/form.tsx` DOES accept
    `defaultValues?: Partial<UpdateForm>`.

#### Proposed approach
1) Keep the existing URL contract
   - Continue using `parentType` and `parentId` on create URLs (already done by
     the tree view).

2) Read query params on create pages and pass `defaultValues` to forms
   - Use `useSearchParams()` in the client create pages to read `parentType` and
     `parentId`.
   - Map parent → child field defaults and pass them via the form's
     `defaultValues` prop.

3) Extend Element form to accept `defaultValues`
   - Update `app/home/elements/form.tsx` to accept
     `defaultValues?: Partial<Element>` and merge into `useForm`'s
     `defaultValues`.

#### Field mapping
- Create Element (parentType: section):
  - `defaultValues = { sectionId: parentId }`

- Create Component (parentType: element):
  - `defaultValues = { elementId: parentId }`

- Create Condition:
  - If parentType: element → `defaultValues = { associatedElementIds: [parentId] }`
  - If parentType: component →
    `defaultValues = { associatedComponentIds: [parentId] }`

#### Example edits
These are illustrative diffs of the key files to change.

1) Elements form: accept and use `defaultValues`
```diff
app/home/elements/form.tsx
@@
-interface DataFormProps {
-  id?: string;
-}
+interface DataFormProps {
+  id?: string;
+  defaultValues?: Partial<Element>;
+}
@@
-export function DataForm({ id }: DataFormProps) {
+export function DataForm({ id, defaultValues }: DataFormProps) {
   const idRef = useRef(id ?? uuidv4());
   const form = useForm<Element>({
-    defaultValues: {
-      id: idRef.current,
-      name: "",
-      sectionId: "",
-      order: 0,
-      description: "",
-    },
+    defaultValues: {
+      id: idRef.current,
+      name: "",
+      sectionId: "",
+      order: 0,
+      description: "",
+      ...defaultValues,
+    },
     mode: 'onChange'
   });
```

2) Create Element page: read params and pass defaults
```diff
app/home/configuration/elements/create/page.tsx
@@
 import React from "react";
 import { DataForm } from "../../../elements/form";
+import { useSearchParams } from "next/navigation";
@@
 export default function CreateElementPage() {
+  const searchParams = useSearchParams();
+  const parentType = searchParams.get('parentType');
+  const parentId = searchParams.get('parentId');
+  const defaultValues = parentType === 'section' && parentId
+    ? { sectionId: parentId }
+    : undefined;
   return (
     <div className="container mx-auto px-5">
@@
-      <DataForm />
+      <DataForm defaultValues={defaultValues} />
     </div>
   );
 }
```

3) Create Component page: pass `elementId` when present
```diff
app/home/configuration/components/create/page.tsx
@@
 import React from "react";
 import { DataForm } from "../../../building-components/form";
+import { useSearchParams } from "next/navigation";
@@
 export default function CreateComponentPage() {
+  const searchParams = useSearchParams();
+  const parentType = searchParams.get('parentType');
+  const parentId = searchParams.get('parentId');
+  const defaultValues = parentType === 'element' && parentId
+    ? { elementId: parentId }
+    : undefined;
   return (
     <div className="container mx-auto px-5">
@@
-      <DataForm />
+      <DataForm defaultValues={defaultValues} />
     </div>
   );
 }
```

4) Create Condition page: pass associated IDs when present
```diff
app/home/configuration/conditions/create/page.tsx
@@
 import React from "react";
 import { DataForm } from "../../../conditions/form";
+import { useSearchParams } from "next/navigation";
@@
 export default function CreateConditionPage() {
+  const searchParams = useSearchParams();
+  const parentType = searchParams.get('parentType');
+  const parentId = searchParams.get('parentId');
+  const defaultValues = parentType && parentId
+    ? parentType === 'element'
+      ? { associatedElementIds: [parentId] }
+      : parentType === 'component'
+        ? { associatedComponentIds: [parentId] }
+        : undefined
+    : undefined;
   return (
     <div className="container mx-auto px-5">
@@
-      <DataForm />
+      <DataForm defaultValues={defaultValues} />
     </div>
   );
 }
```

Note: Section create remains unchanged (no parent).

#### Edge cases and safeguards
- If `parentId` is missing or the referenced entity no longer exists, ignore the
  default and render an empty selection.
- If `parentType` does not match the child type (e.g., creating a Component with
  `parentType=section`), ignore and render an empty selection.
- Do not override any explicit values if the form is opened with prefilled data
  for edit scenarios.

#### Testing
- Unit tests for each create page verifying form default values when query
  params are present.
- Integration test: trigger "Add {child}" from the tree, assert the create URL
  includes `parentType` and `parentId`, and the form shows the correct default.
- Regression tests: opening create pages without params still shows empty
  selections.

#### Rollout
- Implement Elements form prop + create page defaults.
- Implement Component and Condition create page defaults.
- Verify in local runs; no backend changes required.
- Low-risk release as changes are additive and gated by presence of query
  params.


