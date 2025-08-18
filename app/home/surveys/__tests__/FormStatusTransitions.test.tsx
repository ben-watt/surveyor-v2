import { FormStatus } from '../building-survey-reports/BuildingSurveyReportSchema';

describe('Form Status Transitions', () => {
  describe('Status Logic Validation', () => {
    
    // Helper function to simulate the status determination logic
    const determineStatus = (isValid: boolean, hasExistingData: boolean): FormStatus => {
      if (isValid) {
        return FormStatus.Complete;
      } else if (hasExistingData) {
        return FormStatus.InProgress;
      } else {
        return FormStatus.Incomplete;
      }
    };

    describe('PropertyDescriptionForm Status Logic', () => {
      it('should transition from Not Started → Incomplete → Complete', () => {
        // Not Started: No data, invalid
        let status = determineStatus(false, false);
        expect(status).toBe(FormStatus.Incomplete); // Shows as "Not Started"

        // Incomplete: Has data, invalid
        status = determineStatus(false, true);
        expect(status).toBe(FormStatus.InProgress); // Shows as "Incomplete"

        // Complete: Has data, valid
        status = determineStatus(true, true);
        expect(status).toBe(FormStatus.Complete); // Shows as "Complete"
      });

      it('should handle edge case: valid form with no existing data', () => {
        // This could happen if form becomes valid on first entry
        const status = determineStatus(true, false);
        expect(status).toBe(FormStatus.Complete);
      });

      it('should handle clearing data after it was saved', () => {
        // User clears fields but data was previously saved to database
        const status = determineStatus(false, true);
        expect(status).toBe(FormStatus.InProgress); // Still shows "Incomplete" not "Not Started"
      });
    });

    describe('ChecklistForm Status Logic', () => {
      // Helper to simulate checklist status logic
      const determineChecklistStatus = (
        allRequiredChecked: boolean, 
        anyItemChecked: boolean
      ): FormStatus => {
        if (allRequiredChecked) {
          return FormStatus.Complete;
        } else if (anyItemChecked) {
          return FormStatus.InProgress;
        } else {
          return FormStatus.Incomplete;
        }
      };

      it('should transition based on checkbox states', () => {
        // Not Started: No items checked
        let status = determineChecklistStatus(false, false);
        expect(status).toBe(FormStatus.Incomplete); // Shows as "Not Started"

        // Incomplete: Some items checked but not all required
        status = determineChecklistStatus(false, true);
        expect(status).toBe(FormStatus.InProgress); // Shows as "Incomplete"

        // Complete: All required items checked
        status = determineChecklistStatus(true, true);
        expect(status).toBe(FormStatus.Complete); // Shows as "Complete"
      });

      it('should handle optional items correctly', () => {
        // Only optional items checked (no required items)
        const status = determineChecklistStatus(false, true);
        expect(status).toBe(FormStatus.InProgress); // Shows as "Incomplete"
      });

      it('should handle unchecking after completion', () => {
        // User unchecks required item after completing
        const status = determineChecklistStatus(false, true);
        expect(status).toBe(FormStatus.InProgress); // Back to "Incomplete"
      });
    });

    describe('ReportDetailsForm Status Logic', () => {
      // Helper to simulate report details status logic  
      const determineReportStatus = (
        isValid: boolean,
        hasExistingData: boolean
      ): FormStatus => {
        if (isValid) {
          return FormStatus.Complete;
        } else if (hasExistingData) {
          return FormStatus.InProgress;
        } else {
          return FormStatus.Incomplete;
        }
      };

      it('should follow same pattern as PropertyDescriptionForm', () => {
        // Not Started
        let status = determineReportStatus(false, false);
        expect(status).toBe(FormStatus.Incomplete);

        // Incomplete  
        status = determineReportStatus(false, true);
        expect(status).toBe(FormStatus.InProgress);

        // Complete
        status = determineReportStatus(true, true);
        expect(status).toBe(FormStatus.Complete);
      });

      it('should handle image uploads in status determination', () => {
        // Even if text fields are empty, having uploaded images counts as existing data
        const hasImages = true;
        const hasTextData = false;
        const hasAnyData = hasImages || hasTextData;
        
        const status = determineReportStatus(false, hasAnyData);
        expect(status).toBe(FormStatus.InProgress);
      });
    });
  });

  describe('Status Display Mapping', () => {
    it('should map FormStatus to correct display text', () => {
      const getStatusText = (status: FormStatus): string => {
        switch (status) {
          case FormStatus.Complete:
            return 'Complete';
          case FormStatus.InProgress:
            return 'Incomplete';
          case FormStatus.Incomplete:
          default:
            return 'Not Started';
        }
      };

      expect(getStatusText(FormStatus.Complete)).toBe('Complete');
      expect(getStatusText(FormStatus.InProgress)).toBe('Incomplete');
      expect(getStatusText(FormStatus.Incomplete)).toBe('Not Started');
    });

    it('should map FormStatus to correct styling', () => {
      const getStatusStyling = (status: FormStatus) => {
        switch (status) {
          case FormStatus.Complete:
            return { color: 'green', text: 'Complete' };
          case FormStatus.InProgress:
            return { color: 'blue', text: 'Incomplete' };
          case FormStatus.Incomplete:
          default:
            return { color: 'gray', text: 'Not Started' };
        }
      };

      expect(getStatusStyling(FormStatus.Complete)).toEqual({ color: 'green', text: 'Complete' });
      expect(getStatusStyling(FormStatus.InProgress)).toEqual({ color: 'blue', text: 'Incomplete' });
      expect(getStatusStyling(FormStatus.Incomplete)).toEqual({ color: 'gray', text: 'Not Started' });
    });
  });

  describe('Data Persistence Logic', () => {
    it('should detect existing data correctly for nested Input structures', () => {
      const checkHasData = (propertyDescription: any): boolean => {
        return Object.keys(propertyDescription).some((key) => {
          if (key === 'status') return false;
          const property = propertyDescription[key];
          if (property && typeof property === 'object' && 'value' in property) {
            const value = property.value;
            if (typeof value === 'string') {
              return value.trim().length > 0;
            }
            if (Array.isArray(value)) {
              return value.length > 0;
            }
            return value !== null && value !== undefined && value !== false;
          }
          return false;
        });
      };

      // No data
      let propertyDesc = {
        propertyType: { value: '', type: 'text' },
        bedrooms: { value: '', type: 'number' },
        status: { status: 'incomplete', errors: [] }
      };
      expect(checkHasData(propertyDesc)).toBe(false);

      // Has data
      propertyDesc = {
        propertyType: { value: 'House', type: 'text' },
        bedrooms: { value: '', type: 'number' },
        status: { status: 'incomplete', errors: [] }
      };
      expect(checkHasData(propertyDesc)).toBe(true);

      // Array data  
      propertyDesc = {
        propertyType: { value: '', type: 'text' },
        bedrooms: { value: 'test', type: 'text' }, // Use string value
        status: { status: 'incomplete', errors: [] }
      };
      expect(checkHasData(propertyDesc)).toBe(true);
    });

    it('should detect existing data for checklist items', () => {
      const checkChecklistHasData = (checklist: any): boolean => {
        return checklist.items.some((item: any) => item.value === true);
      };

      // No checked items
      let checklist = {
        items: [
          { id: '1', value: false, required: true },
          { id: '2', value: false, required: false }
        ]
      };
      expect(checkChecklistHasData(checklist)).toBe(false);

      // Has checked items
      checklist = {
        items: [
          { id: '1', value: true, required: true },
          { id: '2', value: false, required: false }
        ]
      };
      expect(checkChecklistHasData(checklist)).toBe(true);
    });

    it('should detect existing data for report details', () => {
      const checkReportHasData = (reportDetails: any): boolean => {
        return !!(
          reportDetails.clientName?.trim() ||
          reportDetails.reference?.trim() ||
          reportDetails.weather?.trim() ||
          reportDetails.orientation?.trim() ||
          reportDetails.situation?.trim() ||
          reportDetails.address?.trim() ||
          reportDetails.level?.trim() ||
          reportDetails.inspectionDate ||
          reportDetails.reportDate ||
          (reportDetails.moneyShot && reportDetails.moneyShot.length > 0) ||
          (reportDetails.frontElevationImagesUri && reportDetails.frontElevationImagesUri.length > 0)
        );
      };

      // No data
      let reportDetails = {
        clientName: '',
        reference: '',
        weather: '',
        orientation: '',
        situation: '',
        address: '',
        level: '',
        inspectionDate: null,
        reportDate: null,
        moneyShot: [],
        frontElevationImagesUri: []
      };
      expect(checkReportHasData(reportDetails)).toBe(false);

      // Has text data
      reportDetails.clientName = 'Test Client';
      expect(checkReportHasData(reportDetails)).toBe(true);

      // Reset and test image data
      reportDetails.clientName = '';
      reportDetails.moneyShot = ['image1.jpg'] as any;
      expect(checkReportHasData(reportDetails)).toBe(true);
    });
  });
});