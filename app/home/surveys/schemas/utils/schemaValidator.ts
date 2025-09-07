import { z } from 'zod';
import { reportDetailsSchema, addressSchema, surveyImageSchema } from '../reportDetails';
import { ReportDetails, Address, SurveyImage } from '../../building-survey-reports/BuildingSurveyReportSchema';

/**
 * Schema alignment utility to validate compatibility between Zod schemas
 * and legacy TypeScript types, helping ensure no breaking changes during migration.
 */

type SchemaValidationResult = {
  isCompatible: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Validates that a Zod schema can parse data that matches the legacy TypeScript type
 */
function validateTypeCompatibility<T, S extends z.ZodSchema>(
  zodSchema: S,
  sampleData: T,
  typeName: string
): SchemaValidationResult {
  const result: SchemaValidationResult = {
    isCompatible: true,
    errors: [],
    warnings: []
  };

  try {
    zodSchema.parse(sampleData);
    result.warnings.push(`✅ ${typeName}: Zod schema successfully validates legacy type data`);
  } catch (error) {
    result.isCompatible = false;
    if (error instanceof z.ZodError) {
      result.errors.push(`❌ ${typeName}: Zod validation failed`);
      error.issues.forEach(issue => {
        result.errors.push(`   - ${issue.path.join('.')}: ${issue.message}`);
      });
    } else {
      result.errors.push(`❌ ${typeName}: Unexpected validation error: ${error}`);
    }
  }

  return result;
}

/**
 * Creates sample data for validation testing
 */
function createSampleData() {
  const sampleAddress: Address = {
    formatted: "123 Main St, London, SW1A 1AA, UK",
    line1: "123 Main St",
    line2: "Apt 4",
    line3: undefined,
    city: "London", 
    county: "Greater London",
    postcode: "SW1A 1AA",
    location: {
      lat: 51.5074,
      lng: -0.1278
    }
  };

  const sampleImages: SurveyImage[] = [{
    path: "/images/cover.jpg",
    isArchived: false,
    hasMetadata: true
  }];

  const sampleReportDetails: ReportDetails = {
    level: "2",
    reference: "2024-001",
    address: sampleAddress,
    clientName: "John Doe",
    reportDate: new Date("2024-01-15"),
    inspectionDate: new Date("2024-01-10"),
    weather: "Sunny, 20°C",
    orientation: "Property faces north",
    situation: "Residential street, good access",
    moneyShot: sampleImages,
    frontElevationImagesUri: [
      ...sampleImages,
      { path: "/images/front1.jpg", isArchived: false, hasMetadata: true },
      { path: "/images/front2.jpg", isArchived: true, hasMetadata: false },
      { path: "/images/front3.jpg", isArchived: false, hasMetadata: true }
    ]
  };

  return {
    address: sampleAddress,
    reportDetails: sampleReportDetails,
    images: sampleImages
  };
}

/**
 * Main validation function that checks all schema alignments
 */
export function validateSchemaAlignment(): SchemaValidationResult {
  console.log("🔍 Validating schema alignment between Zod and legacy TypeScript types...\n");
  
  const samples = createSampleData();
  const results: SchemaValidationResult[] = [];

  // Validate address schema
  results.push(validateTypeCompatibility(
    addressSchema,
    samples.address,
    "Address"
  ));

  // Validate survey image schema  
  results.push(validateTypeCompatibility(
    surveyImageSchema,
    samples.images[0],
    "SurveyImage"
  ));

  // Validate report details schema
  results.push(validateTypeCompatibility(
    reportDetailsSchema,
    samples.reportDetails,
    "ReportDetails"
  ));

  // Combine results
  const combined: SchemaValidationResult = {
    isCompatible: results.every(r => r.isCompatible),
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings)
  };

  // Output results
  combined.warnings.forEach(warning => console.log(warning));
  combined.errors.forEach(error => console.log(error));
  
  if (combined.isCompatible) {
    console.log("\n✅ All schema alignments validated successfully!");
  } else {
    console.log("\n❌ Schema alignment validation failed. Please review the errors above.");
  }

  return combined;
}

/**
 * Utility to check if a value matches the expected Zod schema structure
 * Useful for debugging form data issues
 */
export function debugSchemaMatch<T>(schema: z.ZodSchema<T>, data: unknown): void {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      console.log("✅ Data matches schema:", result.data);
    } else {
      console.log("❌ Schema validation failed:");
      result.error.issues.forEach(issue => {
        console.log(`   ${issue.path.join('.')}: ${issue.message}`);
      });
    }
  } catch (error) {
    console.log("❌ Unexpected error during schema validation:", error);
  }
}

/**
 * Amplify schema compatibility checker
 * Since Amplify stores data as JSON, we mainly need to ensure serialization works
 */
export function validateAmplifyCompatibility<T>(
  zodSchema: z.ZodSchema<T>,
  sampleData: T,
  schemaName: string
): SchemaValidationResult {
  const result: SchemaValidationResult = {
    isCompatible: true,
    errors: [],
    warnings: []
  };

  try {
    // Test serialization/deserialization
    const serialized = JSON.stringify(sampleData);
    const deserialized = JSON.parse(serialized);
    
    // Validate deserialized data against schema
    zodSchema.parse(deserialized);
    
    result.warnings.push(`✅ ${schemaName}: Amplify JSON serialization compatible`);
  } catch (error) {
    result.isCompatible = false;
    if (error instanceof z.ZodError) {
      result.errors.push(`❌ ${schemaName}: Amplify compatibility failed - Zod validation error after JSON round-trip`);
      error.issues.forEach(issue => {
        result.errors.push(`   - ${issue.path.join('.')}: ${issue.message}`);
      });
    } else {
      result.errors.push(`❌ ${schemaName}: JSON serialization failed: ${error}`);
    }
  }

  return result;
}