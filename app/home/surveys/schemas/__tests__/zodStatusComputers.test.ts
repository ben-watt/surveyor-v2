import { FormStatus } from '../../building-survey-reports/BuildingSurveyReportSchema';
import {
  zodReportDetailsStatus,
  zodPropertyDescriptionStatus,
  zodChecklistStatus
} from '../index';

describe('Zod-Based Status Computers', () => {
  describe('zodReportDetailsStatus', () => {
    it('returns Incomplete for empty data', () => {
      const result = zodReportDetailsStatus({});
      expect(result.status).toBe(FormStatus.Incomplete);
      expect(result.hasData).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('returns InProgress for partial data', () => {
      const result = zodReportDetailsStatus({
        clientName: 'John Doe'
      });
      expect(result.status).toBe(FormStatus.InProgress);
      expect(result.hasData).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.errors?.length || 0).toBeGreaterThan(0);
    });

    it('returns Complete for all required fields', () => {
      const result = zodReportDetailsStatus({
        clientName: 'John Doe',
        address: { 
          formatted: '123 Main St, London, SW1A 1AA, UK',
          line1: '123 Main St',
          line2: 'Apt 4',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 1AA',
          location: { lat: 51.5074, lng: -0.1278 }
         },
        inspectionDate: new Date('2024-01-15'),
        reportDate: new Date('2024-01-20'),
        level: '2',
        reference: '123456',
        weather: 'Sunny',
        orientation: 'North',
        situation: 'Situation',
        moneyShot: [{ path: '123456', isArchived: false, hasMetadata: false }],
        frontElevationImagesUri: [
          { path: '123456', isArchived: false, hasMetadata: false },
          { path: '123456', isArchived: false, hasMetadata: false },
          { path: '123456', isArchived: false, hasMetadata: false },
          { path: '123456', isArchived: false, hasMetadata: false }
        ]
      });
      expect(result.status).toBe(FormStatus.Complete);
      expect(result.hasData).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('provides detailed error messages', () => {
      const result = zodReportDetailsStatus({
        clientName: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors?.length || 0).toBeGreaterThan(0);
    });
  });

  describe('zodPropertyDescriptionStatus', () => {
    it('returns Incomplete for empty data', () => {
      const result = zodPropertyDescriptionStatus({});
      expect(result.status).toBe(FormStatus.Incomplete);
      expect(result.hasData).toBe(false);
    });

    it('returns InProgress for partial data', () => {
      const result = zodPropertyDescriptionStatus({
        propertyType: 'House'
      });
      expect(result.status).toBe(FormStatus.InProgress);
      expect(result.hasData).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('returns Complete for all required fields', () => {
      const result = zodPropertyDescriptionStatus({
        propertyType: 'House',
        constructionDetails: 'Brick built',
        yearOfConstruction: '1990',
        grounds: 'Front and back garden',
        services: 'Mains electricity, gas, water',
        energyRating: 'C',
        numberOfBedrooms: 3,
        numberOfBathrooms: 2,
        tenure: 'Freehold'
      });
      expect(result.status).toBe(FormStatus.Complete);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('zodChecklistStatus', () => {
    it('returns Incomplete for empty checklist', () => {
      const result = zodChecklistStatus({});
      expect(result.status).toBe(FormStatus.Incomplete);
      expect(result.hasData).toBe(false);
    });

    it('returns InProgress when some items checked but not all required', () => {
      const result = zodChecklistStatus({
        items: [
          { value: true, required: true, type: 'checkbox', label: 'Item 1', placeholder: '', order: 1 },
          { value: false, required: true, type: 'checkbox', label: 'Item 2', placeholder: '', order: 2 }
        ]
      });
      expect(result.status).toBe(FormStatus.InProgress);
      expect(result.hasData).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.errors?.length || 0).toBeGreaterThan(0);
    });

    it('returns Complete when all required items checked', () => {
      const result = zodChecklistStatus({
        items: [
          { value: true, required: true, type: 'checkbox', label: 'Item 1', placeholder: '', order: 1 },
          { value: true, required: true, type: 'checkbox', label: 'Item 2', placeholder: '', order: 2 },
          { value: false, required: false, type: 'checkbox', label: 'Optional', placeholder: '', order: 3 }
        ]
      });
      expect(result.status).toBe(FormStatus.Complete);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    describe('Archived Photos Behavior', () => {
      it('should not count archived photos toward minimum requirements', () => {
        // Test case: User uploads 4 frontElevation photos, then archives 1
        // Should still be valid since we have 3 non-archived + 1 archived = 4 total
        // But the validation should only count the 3 non-archived ones
        const resultWithArchivedPhotos = zodReportDetailsStatus({
          clientName: 'John Doe',
          address: { 
            formatted: '123 Main St, London, SW1A 1AA, UK',
            line1: '123 Main St',
            line2: 'Apt 4',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
            location: { lat: 51.5074, lng: -0.1278 }
           },
          inspectionDate: new Date('2024-01-15'),
          reportDate: new Date('2024-01-20'),
          level: '2',
          reference: '123456',
          weather: 'Sunny',
          orientation: 'North',
          situation: 'Situation',
          moneyShot: [{ path: 'cover.jpg', isArchived: false, hasMetadata: false }],
          frontElevationImagesUri: [
            { path: 'front1.jpg', isArchived: false, hasMetadata: false },
            { path: 'front2.jpg', isArchived: false, hasMetadata: false },
            { path: 'front3.jpg', isArchived: false, hasMetadata: false },
            { path: 'front4.jpg', isArchived: true, hasMetadata: false } // This is archived
          ]
        });
        
        // This should FAIL validation because only 3 non-archived photos exist (need 4)
        expect(resultWithArchivedPhotos.status).toBe(FormStatus.InProgress);
        expect(resultWithArchivedPhotos.isValid).toBe(false);
        expect(resultWithArchivedPhotos.errors).toContain(
          'frontElevationImagesUri: At least four general photos are required'
        );
      });

      it('should pass validation when enough non-archived photos exist', () => {
        const resultWithEnoughPhotos = zodReportDetailsStatus({
          clientName: 'John Doe',
          address: { 
            formatted: '123 Main St, London, SW1A 1AA, UK',
            line1: '123 Main St',
            line2: 'Apt 4',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
            location: { lat: 51.5074, lng: -0.1278 }
           },
          inspectionDate: new Date('2024-01-15'),
          reportDate: new Date('2024-01-20'),
          level: '2',
          reference: '123456',
          weather: 'Sunny',
          orientation: 'North',
          situation: 'Situation',
          moneyShot: [{ path: 'cover.jpg', isArchived: false, hasMetadata: false }],
          frontElevationImagesUri: [
            { path: 'front1.jpg', isArchived: false, hasMetadata: false },
            { path: 'front2.jpg', isArchived: false, hasMetadata: false },
            { path: 'front3.jpg', isArchived: false, hasMetadata: false },
            { path: 'front4.jpg', isArchived: false, hasMetadata: false },
            { path: 'front5.jpg', isArchived: true, hasMetadata: false }, // Extra archived photo
            { path: 'front6.jpg', isArchived: true, hasMetadata: false }  // Another archived photo
          ]
        });
        
        // This should PASS validation because 4 non-archived photos exist
        expect(resultWithEnoughPhotos.status).toBe(FormStatus.Complete);
        expect(resultWithEnoughPhotos.isValid).toBe(true);
        expect(resultWithEnoughPhotos.errors).toEqual([]);
      });

      it('should handle moneyShot archived photos correctly', () => {
        const resultWithArchivedMoneyShot = zodReportDetailsStatus({
          clientName: 'John Doe',
          address: { 
            formatted: '123 Main St, London, SW1A 1AA, UK',
            line1: '123 Main St',
            line2: 'Apt 4',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
            location: { lat: 51.5074, lng: -0.1278 }
           },
          inspectionDate: new Date('2024-01-15'),
          reportDate: new Date('2024-01-20'),
          level: '2',
          reference: '123456',
          weather: 'Sunny',
          orientation: 'North',
          situation: 'Situation',
          moneyShot: [{ path: 'cover.jpg', isArchived: true, hasMetadata: false }], // Archived cover photo
          frontElevationImagesUri: [
            { path: 'front1.jpg', isArchived: false, hasMetadata: false },
            { path: 'front2.jpg', isArchived: false, hasMetadata: false },
            { path: 'front3.jpg', isArchived: false, hasMetadata: false },
            { path: 'front4.jpg', isArchived: false, hasMetadata: false }
          ]
        });
        
        // This should FAIL validation because moneyShot is archived (need 1 non-archived)
        expect(resultWithArchivedMoneyShot.status).toBe(FormStatus.InProgress);
        expect(resultWithArchivedMoneyShot.isValid).toBe(false);
        expect(resultWithArchivedMoneyShot.errors).toContain(
          'moneyShot: At least one cover photo is required'
        );
      });
    });
  });

  describe('Performance & Memoization', () => {
    it('returns consistent results for identical input', () => {
      const testData = { clientName: 'John Doe' };
      
      // First call
      const result1 = zodReportDetailsStatus(testData);
      // Second call with same data
      const result2 = zodReportDetailsStatus(testData);
      
      // Results should be structurally identical (no longer using memoization)
      expect(result1).toStrictEqual(result2);
    });

    it('recomputes for different input', () => {
      const data1 = { clientName: 'John Doe' };
      const data2 = { clientName: 'Jane Smith' };
      
      const result1 = zodReportDetailsStatus(data1);
      const result2 = zodReportDetailsStatus(data2);
      
      // Results should be different objects
      expect(result1).not.toBe(result2);
      // But both should have same status since both are partial
      expect(result1.status).toBe(result2.status);
    });
  });
});