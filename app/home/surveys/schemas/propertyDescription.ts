import { z } from 'zod';

// Simple property description schema like report details
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
  
  yearOfExtensions: z.string().optional(),
  yearOfConversions: z.string().optional(),
  otherServices: z.string().optional()
});

export type PropertyDescriptionInput = z.input<typeof propertyDescriptionSchema>;
export type PropertyDescriptionOutput = z.output<typeof propertyDescriptionSchema>;