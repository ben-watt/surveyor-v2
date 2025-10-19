import { updateChecklistStatus, zodChecklistStatus, createInitialFormMeta } from '../index';
import { FormStatus } from '../../building-survey-reports/BuildingSurveyReportSchema';

describe('Checklist Metadata-Based Workflow', () => {
  describe('Checklist Workflow', () => {
    it('should demonstrate the complete metadata workflow', () => {
      // 1. Start with empty checklist data
      const emptyData = { items: [] };

      // Status lookup without metadata (fallback to validation)
      const emptyStatus = zodChecklistStatus(emptyData);
      expect(emptyStatus.status).toBe(FormStatus.InProgress); // Empty array has data but fails validation
      expect(emptyStatus.hasData).toBe(true);
      expect(emptyStatus.isValid).toBe(false);

      // 2. Add some partial data (some required items not checked)
      const partialData = {
        items: [
          {
            value: true,
            required: true,
            type: 'checkbox',
            label: 'Required Item 1',
            placeholder: '',
            order: 1,
          },
          {
            value: false,
            required: true,
            type: 'checkbox',
            label: 'Required Item 2',
            placeholder: '',
            order: 2,
          },
          {
            value: true,
            required: false,
            type: 'checkbox',
            label: 'Optional Item',
            placeholder: '',
            order: 3,
          },
        ],
      };

      // Generate metadata for partial data
      const partialMeta = updateChecklistStatus(partialData);
      const partialWithMeta = {
        ...partialData,
        _meta: partialMeta,
      };

      // Status lookup now uses stored metadata (instant!)
      const partialStatus = zodChecklistStatus(partialWithMeta);
      expect(partialStatus.status).toBe(FormStatus.InProgress);
      expect(partialStatus.hasData).toBe(true);
      expect(partialStatus.isValid).toBe(false);
      expect(partialStatus.errors?.length || 0).toBeGreaterThan(0);

      // 3. Complete all required items
      const completeData = {
        items: [
          {
            value: true,
            required: true,
            type: 'checkbox',
            label: 'Required Item 1',
            placeholder: '',
            order: 1,
          },
          {
            value: true,
            required: true,
            type: 'checkbox',
            label: 'Required Item 2',
            placeholder: '',
            order: 2,
          },
          {
            value: false,
            required: false,
            type: 'checkbox',
            label: 'Optional Item',
            placeholder: '',
            order: 3,
          },
        ],
      };

      // Generate metadata for complete data
      const completeMeta = updateChecklistStatus(completeData);
      const completeWithMeta = {
        ...completeData,
        _meta: completeMeta,
      };

      // Status lookup uses metadata - should be complete now
      const completeStatus = zodChecklistStatus(completeWithMeta);
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

  describe('Checklist Specific Validation', () => {
    it('should handle empty checklist correctly', () => {
      const emptyChecklist = { items: [] };

      const meta = updateChecklistStatus(emptyChecklist);
      const dataWithMeta = { ...emptyChecklist, _meta: meta };

      const status = zodChecklistStatus(dataWithMeta);
      expect(status.status).toBe(FormStatus.InProgress); // Empty array has data but fails validation
      expect(status.hasData).toBe(true);
      expect(status.isValid).toBe(false);
    });

    it('should identify data when at least one item exists', () => {
      const checklistWithItems = {
        items: [
          {
            value: false,
            required: false,
            type: 'checkbox',
            label: 'Optional Item',
            placeholder: '',
            order: 1,
          },
        ],
      };

      const meta = updateChecklistStatus(checklistWithItems);
      const dataWithMeta = { ...checklistWithItems, _meta: meta };

      const status = zodChecklistStatus(dataWithMeta);
      expect(status.hasData).toBe(true);
      expect(status.status).toBe(FormStatus.Complete); // Optional item, no required items, so complete
    });

    it('should require all required items to be checked for completion', () => {
      const mixedChecklist = {
        items: [
          {
            value: true,
            required: true,
            type: 'checkbox',
            label: 'Required Item 1',
            placeholder: '',
            order: 1,
          },
          {
            value: false,
            required: true,
            type: 'checkbox',
            label: 'Required Item 2',
            placeholder: '',
            order: 2,
          },
          {
            value: true,
            required: false,
            type: 'checkbox',
            label: 'Optional Item',
            placeholder: '',
            order: 3,
          },
        ],
      };

      const meta = updateChecklistStatus(mixedChecklist);
      const dataWithMeta = { ...mixedChecklist, _meta: meta };

      const status = zodChecklistStatus(dataWithMeta);
      expect(status.status).toBe(FormStatus.InProgress);
      expect(status.isValid).toBe(false);
      expect(status.errors).toContain('items: All required checklist items must be completed');
    });

    it('should allow optional items to remain unchecked', () => {
      const checklistWithOptionals = {
        items: [
          {
            value: true,
            required: true,
            type: 'checkbox',
            label: 'Required Item 1',
            placeholder: '',
            order: 1,
          },
          {
            value: true,
            required: true,
            type: 'checkbox',
            label: 'Required Item 2',
            placeholder: '',
            order: 2,
          },
          {
            value: false,
            required: false,
            type: 'checkbox',
            label: 'Optional Item 1',
            placeholder: '',
            order: 3,
          },
          {
            value: false,
            required: false,
            type: 'checkbox',
            label: 'Optional Item 2',
            placeholder: '',
            order: 4,
          },
        ],
      };

      const meta = updateChecklistStatus(checklistWithOptionals);
      const dataWithMeta = { ...checklistWithOptionals, _meta: meta };

      const status = zodChecklistStatus(dataWithMeta);
      expect(status.status).toBe(FormStatus.Complete);
      expect(status.isValid).toBe(true);
      expect(status.errors).toEqual([]);
    });
  });

  describe('Performance Benefits', () => {
    it('should show instant metadata lookup vs validation computation', () => {
      const completeData = {
        items: [
          {
            value: true,
            required: true,
            type: 'checkbox',
            label: 'Required Item 1',
            placeholder: '',
            order: 1,
          },
          {
            value: true,
            required: true,
            type: 'checkbox',
            label: 'Required Item 2',
            placeholder: '',
            order: 2,
          },
        ],
      };

      // Method 1: Without metadata (fallback - runs full validation)
      const start1 = performance.now();
      const statusWithoutMeta = zodChecklistStatus(completeData);
      const end1 = performance.now();

      // Method 2: With metadata (instant lookup)
      const meta = updateChecklistStatus(completeData);
      const dataWithMeta = { ...completeData, _meta: meta };

      const start2 = performance.now();
      const statusWithMeta = zodChecklistStatus(dataWithMeta);
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
    it('should handle checklists without metadata gracefully', () => {
      const oldFormatData = {
        items: [
          {
            value: false,
            required: true,
            type: 'checkbox',
            label: 'Required Item',
            placeholder: '',
            order: 1,
          },
        ],
      };

      // Should work without metadata (backward compatibility)
      const status = zodChecklistStatus(oldFormatData);
      expect(status.status).toBe(FormStatus.InProgress);
      expect(status.hasData).toBe(true);
      expect(status.isValid).toBe(false);
    });

    it('should prefer metadata when available', () => {
      // Create data that would normally validate as incomplete
      const data = {
        items: [
          {
            value: false,
            required: true,
            type: 'checkbox',
            label: 'Required Item',
            placeholder: '',
            order: 1,
          },
        ],
      };

      // But add metadata that shows it's complete (maybe from business logic override)
      const overriddenMeta = {
        ...createInitialFormMeta(),
        status: FormStatus.Complete,
        isValid: true,
        hasData: true,
        errors: [],
      };

      const dataWithMeta = { ...data, _meta: overriddenMeta };

      // Should use metadata, not validation result
      const status = zodChecklistStatus(dataWithMeta);
      expect(status.status).toBe(FormStatus.Complete);
      expect(status.isValid).toBe(true);
      expect(status.errors).toEqual([]);
    });
  });
});
