import { z } from 'zod';
import { formMetaSchema } from './formMeta';

// Property description schema with form metadata for status tracking
export const propertyDescriptionSchema = z.object({
  // Required fields for completion
  propertyType: z.string().min(1, "Property type is required"),
  constructionDetails: z.string().min(1, "Construction details are required"),
  yearOfConstruction: z.string().min(1, "Year of construction is required"),
  grounds: z.string().min(1, "Grounds information is required"),
  services: z.string().min(1, "Services information is required"),
  energyRating: z.string().min(1, "Energy rating is required"),
  numberOfBedrooms: z.number().min(0, "Number of bedrooms is required"),
  numberOfBathrooms: z.number().min(0, "Number of bathrooms is required"),
  tenure: z.string().min(1, "Tenure is required"),
  
  // Optional fields
  yearOfExtensions: z.string().optional(),
  yearOfConversions: z.string().optional(),
  otherServices: z.string().optional(),
  
  // Form metadata for status tracking (eliminates need for runtime validation)
  _meta: formMetaSchema.optional()
});

// Schema for form fields only (without metadata) - useful for validation
export const propertyDescriptionFieldsSchema = propertyDescriptionSchema.omit({ _meta: true });

// For partial validation (allows empty/undefined required fields)
export const propertyDescriptionPartialSchema = propertyDescriptionSchema.partial();

export type PropertyDescriptionInput = z.input<typeof propertyDescriptionSchema>;
export type PropertyDescriptionOutput = z.output<typeof propertyDescriptionSchema>;
export type PropertyDescriptionFields = z.infer<typeof propertyDescriptionFieldsSchema>;