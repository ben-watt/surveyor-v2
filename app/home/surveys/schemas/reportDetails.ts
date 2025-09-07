import { z } from 'zod';

// Single schema with conditional validation
export const reportDetailsSchema = z.object({
  // Required fields for completion
  clientName: z.string().min(1, "Client name is required"),
  address: z.object({
    formatted: z.string().min(1, "Address is required"),
    line1: z.string().optional(),
    line2: z.string().optional(),
    line3: z.string().optional(),
    city: z.string().optional(),
    county: z.string().optional(),
    postcode: z.string().optional(),
    location: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }),
  inspectionDate: z.coerce.date({ message: "Inspection date is required" }),
  reportDate: z.coerce.date({ message: "Report date is required" }),
  level: z.enum(['2', '3'], { message: "Survey level is required" }),
  reference: z.string().min(1, "Reference is required"),
  weather: z.string().optional(),
  orientation: z.string().optional(),
  situation: z.string().optional(),
  moneyShot: z.array(z.object({
    path: z.string(),
    isArchived: z.boolean().optional(),
    hasMetadata: z.boolean().optional()
  })).optional(),
  frontElevationImagesUri: z.array(z.object({
    path: z.string(),
    isArchived: z.boolean().optional(),
    hasMetadata: z.boolean().optional()
  })).optional()
});

// For partial validation (allows empty/undefined required fields)
export const reportDetailsPartialSchema = reportDetailsSchema.partial();

export type ReportDetailsInput = z.input<typeof reportDetailsSchema>;
export type ReportDetailsOutput = z.output<typeof reportDetailsSchema>;