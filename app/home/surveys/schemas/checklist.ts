import { z } from 'zod';
import { formMetaSchema } from './formMeta';

// Checklist item schema
const checklistItemSchema = z.object({
  value: z.boolean().optional(),
  required: z.boolean().optional(),
  type: z.string(),
  label: z.string(),
  placeholder: z.string(),
  order: z.number(),
});

// Checklist schema with metadata for status tracking
export const checklistSchema = z.object({
  items: z.array(checklistItemSchema).refine(
    (items) => {
      if (!items || items.length === 0) return false; // No items means incomplete
      return items.every((item) => !item.required || item.value === true);
    },
    {
      message: 'All required checklist items must be completed',
    },
  ),

  // Form metadata for status tracking (eliminates need for runtime validation)
  _meta: formMetaSchema.optional(),
});

// Schema for form fields only (without metadata) - useful for validation
export const checklistFieldsSchema = checklistSchema.omit({ _meta: true });

// For partial validation (allows incomplete checklist)
export const checklistPartialSchema = z.object({
  items: z.array(checklistItemSchema).optional(),
  _meta: formMetaSchema.optional(),
});

export type ChecklistInput = z.input<typeof checklistSchema>;
export type ChecklistOutput = z.output<typeof checklistSchema>;
export type ChecklistFields = z.infer<typeof checklistFieldsSchema>;
