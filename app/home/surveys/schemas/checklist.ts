import { z } from 'zod';

// Checklist item schema
const checklistItemSchema = z.object({
  value: z.boolean().optional(),
  required: z.boolean().optional(),
  type: z.string(),
  label: z.string(),
  placeholder: z.string(),
  order: z.number()
});

// Single checklist schema with built-in completion validation
export const checklistSchema = z.object({
  items: z.array(checklistItemSchema).refine((items) => {
    if (!items || items.length === 0) return false; // No items means incomplete
    return items.every(item => !item.required || item.value === true);
  }, { 
    message: "All required checklist items must be completed" 
  })
});

// For partial validation (allows incomplete checklist)
export const checklistPartialSchema = z.object({
  items: z.array(checklistItemSchema).optional()
});

export type ChecklistInput = z.input<typeof checklistSchema>;
export type ChecklistOutput = z.output<typeof checklistSchema>;