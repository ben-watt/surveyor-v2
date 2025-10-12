import {
  updatePropertyDescriptionStatus,
  updateReportDetailsStatus,
  zodPropertyDescriptionStatus,
  zodReportDetailsStatus,
  createInitialFormMeta,
} from '../index';
import { FormStatus } from '../../building-survey-reports/BuildingSurveyReportSchema';

describe('Metadata-Based Form Status Workflow', () => {
  describe('Property Description Workflow', () => {
    it('should demonstrate the complete metadata workflow', () => {
      // 1. Start with empty form data
      const emptyData = {};

      // Status lookup without metadata (fallback to validation)
      const emptyStatus = zodPropertyDescriptionStatus(emptyData);
      expect(emptyStatus.status).toBe(FormStatus.Incomplete);
      expect(emptyStatus.hasData).toBe(false);
      expect(emptyStatus.isValid).toBe(false);

      // 2. Add some partial data
      const partialData = {
        propertyType: 'House',
        constructionDetails: 'Brick built',
        // Missing required fields
      };

      // Generate metadata for partial data
      const partialMeta = updatePropertyDescriptionStatus(partialData);
      const partialWithMeta = {
        ...partialData,
        _meta: partialMeta,
      };

      // Status lookup now uses stored metadata (instant!)
      const partialStatus = zodPropertyDescriptionStatus(partialWithMeta);
      expect(partialStatus.status).toBe(FormStatus.InProgress);
      expect(partialStatus.hasData).toBe(true);
      expect(partialStatus.isValid).toBe(false);
      expect(partialStatus.errors?.length || 0).toBeGreaterThan(0);

      // 3. Complete all required fields
      const completeData = {
        propertyType: 'House',
        constructionDetails: 'Brick built',
        yearOfConstruction: '1990s',
        grounds: 'Front and back garden',
        services: 'Mains electricity, gas, water',
        energyRating: 'C',
        numberOfBedrooms: 3,
        numberOfBathrooms: 2,
        tenure: 'Freehold',
      };

      // Generate metadata for complete data
      const completeMeta = updatePropertyDescriptionStatus(completeData);
      const completeWithMeta = {
        ...completeData,
        _meta: completeMeta,
      };

      // Status lookup uses metadata - should be complete now
      const completeStatus = zodPropertyDescriptionStatus(completeWithMeta);
      expect(completeStatus.status).toBe(FormStatus.Complete);
      expect(completeStatus.hasData).toBe(true);
      expect(completeStatus.isValid).toBe(true);
      expect(completeStatus.errors).toEqual([]);

      // 4. Verify metadata structure
      expect(completeMeta.status).toBe(FormStatus.Complete);
      expect(completeMeta.isValid).toBe(true);
      expect(completeMeta.hasData).toBe(true);
      expect(completeMeta.errors).toEqual([]);
      expect(completeMeta.lastValidated).toBeInstanceOf(Date);
      expect(completeMeta.lastModified).toBeInstanceOf(Date);
    });
  });

  describe('Report Details Workflow', () => {
    it('should demonstrate metadata workflow with complex validation', () => {
      // Test with archived photos to show custom validation
      const reportData = {
        clientName: 'John Doe',
        address: {
          formatted: '123 Main St, London, SW1A 1AA, UK',
          line1: '123 Main St',
          city: 'London',
          postcode: 'SW1A 1AA',
          location: { lat: 51.5074, lng: -0.1278 },
        },
        inspectionDate: new Date('2024-01-15'),
        reportDate: new Date('2024-01-20'),
        level: '2' as const,
        reference: '123456',
        weather: 'Sunny',
        orientation: 'North',
        situation: 'Situation',
        moneyShot: [{ path: 'cover.jpg', isArchived: false, hasMetadata: false }],
        frontElevationImagesUri: [
          { path: 'front1.jpg', isArchived: false, hasMetadata: false },
          { path: 'front2.jpg', isArchived: false, hasMetadata: false },
          { path: 'front3.jpg', isArchived: false, hasMetadata: false },
          { path: 'front4.jpg', isArchived: true, hasMetadata: false }, // Archived - shouldn't count
        ],
      };

      // This should fail because only 3 non-archived frontElevation photos exist
      const meta = updateReportDetailsStatus(reportData);
      const dataWithMeta = { ...reportData, _meta: meta };

      const status = zodReportDetailsStatus(dataWithMeta);
      expect(status.status).toBe(FormStatus.InProgress);
      expect(status.isValid).toBe(false);
      expect(status.errors).toContain(
        'frontElevationImagesUri: At least four general photos are required',
      );
    });
  });

  describe('Performance Benefits', () => {
    it('should show instant metadata lookup vs validation computation', () => {
      const completeData = {
        propertyType: 'House',
        constructionDetails: 'Brick built',
        yearOfConstruction: '1990s',
        grounds: 'Front and back garden',
        services: 'Mains electricity, gas, water',
        energyRating: 'C',
        numberOfBedrooms: 3,
        numberOfBathrooms: 2,
        tenure: 'Freehold',
      };

      // Method 1: Without metadata (fallback - runs full validation)
      const start1 = performance.now();
      const statusWithoutMeta = zodPropertyDescriptionStatus(completeData);
      const end1 = performance.now();

      // Method 2: With metadata (instant lookup)
      const meta = updatePropertyDescriptionStatus(completeData);
      const dataWithMeta = { ...completeData, _meta: meta };

      const start2 = performance.now();
      const statusWithMeta = zodPropertyDescriptionStatus(dataWithMeta);
      const end2 = performance.now();

      // Both should have same result
      expect(statusWithoutMeta.status).toBe(statusWithMeta.status);
      expect(statusWithoutMeta.isValid).toBe(statusWithMeta.isValid);

      // Metadata lookup should be faster (though both are very fast in tests)
      console.log(`Without metadata: ${end1 - start1}ms`);
      console.log(`With metadata: ${end2 - start2}ms`);

      // In real applications, the metadata approach scales much better
      // as form complexity increases, while validation time stays constant
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle forms without metadata gracefully', () => {
      const oldFormatData = {
        propertyType: 'House',
        // Missing required fields - should fallback to validation
      };

      // Should work without metadata (backward compatibility)
      const status = zodPropertyDescriptionStatus(oldFormatData);
      expect(status.status).toBe(FormStatus.InProgress);
      expect(status.hasData).toBe(true);
      expect(status.isValid).toBe(false);
    });

    it('should prefer metadata when available', () => {
      // Create data that would normally validate as complete
      const data = {
        propertyType: 'House',
        constructionDetails: 'Brick',
        yearOfConstruction: '1990s',
        grounds: 'Garden',
        services: 'Mains',
        energyRating: 'C',
        numberOfBedrooms: 3,
        numberOfBathrooms: 2,
        tenure: 'Freehold',
      };

      // But add metadata that shows it's still in progress (maybe has validation errors)
      const overriddenMeta = {
        ...createInitialFormMeta(),
        status: FormStatus.InProgress,
        isValid: false,
        hasData: true,
        errors: ['Custom validation error from business logic'],
      };

      const dataWithMeta = { ...data, _meta: overriddenMeta };

      // Should use metadata, not validation result
      const status = zodPropertyDescriptionStatus(dataWithMeta);
      expect(status.status).toBe(FormStatus.InProgress);
      expect(status.isValid).toBe(false);
      expect(status.errors).toContain('Custom validation error from business logic');
    });
  });
});
