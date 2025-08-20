# Zod Validation Migration Plan

## Overview
Migrate all forms to use Zod validation for consistency and type safety. Apply **Pattern 3: Zod with Status Computation** where forms need completion tracking.

## Forms to Migrate

### ✅ Already Using Zod (4 forms)
- Report Details, Property Description, Checklist (complete)
- Property Condition (partial implementation)

### 🔄 Need Zod Migration (8 forms)

#### Configuration Forms (Zod only - no status needed)
1. **Conditions Form** (`/conditions/form.tsx`)
   - Create/edit phrases for survey conditions
   - **Change:** `register("name", { required: true })` → Zod schema validation

2. **Sections Form** (`/sections/form.tsx`) 
   - Configure survey sections
   - **Change:** Manual validation → Zod schema

3. **Elements Form** (`/elements/form.tsx`)
   - Configure survey elements  
   - **Change:** Manual validation → Zod schema

4. **Building Components Form** (`/building-components/form.tsx`)
   - Configure building components
   - **Change:** Manual validation → Zod schema

#### Survey Forms (Zod + Status Computation)
5. **Element Form** (`/surveys/[id]/condition/ElementForm.tsx`)
   - Element inspection details with images
   - **Change:** Manual validation → Zod + status tracking

6. **Inspection Form** (`/surveys/[id]/condition/InspectionForm.tsx`)
   - Component inspection details
   - **Change:** Manual validation → Zod + status tracking

#### User Management Forms (Zod only - no status needed)
7. **Profile Form** (`/profile/page.tsx`)
   - User profile editing
   - **Change:** Manual validation → Zod schema

8. **Tenant Management** (`/tenants/page.tsx`)
   - Tenant configuration
   - **Change:** Manual validation → Zod schema

## Implementation Pattern

### For Forms WITHOUT Status (Configuration & User Management)
```typescript
// 1. Create schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional()
});

// 2. Update form
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues,
  mode: 'onChange'
});

// 3. Replace register calls
register("name") // Validation comes from schema
```

### For Forms WITH Status (Survey forms)
```typescript
// 1. Create schema + status computer
const formSchema = z.object({ /* ... */ });
const zodFormStatus = memoizeZodStatusComputer((data: unknown) => {
  // Status computation logic
});

// 2. Use integrated hook
const form = useZodForm(formSchema, zodFormStatus, {
  defaultValues,
  mode: 'onChange'
});

// 3. Access status
const { status, isValid, hasData } = form;
```

## Simple Migration Steps

### For Each Form:
1. **Create Zod schema** - Replace manual validation rules
2. **Update useForm** - Add `zodResolver` or use `useZodForm`
3. **Remove register rules** - Let Zod handle validation
4. **Add status computer** (if needed for survey forms)
5. **Update TypeScript types** - Use `z.infer<typeof schema>`

### Benefits:
- **Type safety** - Schema-driven types
- **Consistency** - Same validation pattern everywhere  
- **Less code** - No manual validation rules
- **Better errors** - Clear Zod validation messages