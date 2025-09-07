import { z } from 'zod';

// Address schema aligned with legacy TypeScript Address type
const addressSchema = z.object({
  formatted: z.string().min(1, "Address is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  line3: z.string().optional(),
  city: z.string().min(1, "City is required"),
  county: z.string().optional(),
  postcode: z.string().min(1, "Postcode is required"),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  })
});

// Survey image schema aligned with legacy SurveyImage type
const surveyImageSchema = z.object({
  path: z.string(),
  isArchived: z.boolean(),
  hasMetadata: z.boolean()
});

// Report details schema aligned with form requirements and legacy TypeScript types
export const reportDetailsSchema = z.object({
  // Required fields for completion
  clientName: z.string().min(1, "Client name is required"),
  address: addressSchema,
  inspectionDate: z.coerce.date({ message: "Inspection date is required" }),
  reportDate: z.coerce.date({ message: "Report date is required" }),
  level: z.enum(['2', '3'], { message: "Survey level is required" }),
  reference: z.string().min(1, "Reference is required"),
  weather: z.string().min(1, "Weather is required"),
  orientation: z.string().min(1, "Orientation is required"),
  situation: z.string().min(1, "Situation is required"),
  moneyShot: z.array(surveyImageSchema).min(1, "At least one cover photo is required"),
  frontElevationImagesUri: z.array(surveyImageSchema).min(4, "At least four general photos are required")
});

// For partial validation (allows empty/undefined required fields)
export const reportDetailsPartialSchema = reportDetailsSchema.partial();

// Export individual schemas for reuse
export { addressSchema, surveyImageSchema };

// Export inferred types
export type ReportDetailsInput = z.input<typeof reportDetailsSchema>;
export type ReportDetailsOutput = z.output<typeof reportDetailsSchema>;
export type AddressInput = z.input<typeof addressSchema>;
export type SurveyImageInput = z.input<typeof surveyImageSchema>;