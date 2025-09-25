// Test data - defined first for use in mocks
const mockSectionData = [
  { id: '1', name: 'Exterior', order: 1 },
  { id: '2', name: 'Interior', order: 2 },
];

const mockElementData = [
  { id: '1', name: 'Walls', sectionId: '1', description: 'External walls', order: 1 },
  { id: '2', name: 'Roof', sectionId: '1', description: 'Roof structure', order: 2 },
];

const mockBankOfDefects = [
  {
    elementName: 'Walls',
    defects: [
      {
        type: 'Masonry',
        specification: 'Brick',
        defect: 'Cracking',
        level2Wording: 'Minor cracks visible in brick joints',
      }
    ]
  }
];

const expectedComponentCount = 1;
const expectedPhraseCount = 1;

// Mock the external dependencies first
jest.mock('../../clients/Database', () => {
  const createMockStore = (name: string) => ({
    add: jest.fn().mockResolvedValue(undefined),
    useList: jest.fn().mockReturnValue([true, []]),
    removeAll: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined),
    forceSync: jest.fn().mockResolvedValue({ ok: true }),
    startPeriodicSync: jest.fn().mockReturnValue(() => {}),
  });

  return {
    sectionStore: createMockStore('sections'),
    elementStore: createMockStore('elements'),
    componentStore: createMockStore('components'),
    phraseStore: createMockStore('phrases'),
    surveyStore: createMockStore('surveys'),
  };
});

jest.mock('../../utils/tenant-utils', () => ({
  getCurrentTenantId: jest.fn(),
  withTenantId: jest.fn((data) => Promise.resolve({ ...data, tenantId: 'test-tenant-123' })),
}));

jest.mock('../../settings/defects.json', () => [
  {
    elementName: 'Walls',
    defects: [
      {
        type: 'Masonry',
        specification: 'Brick',
        defect: 'Cracking',
        level2Wording: 'Minor cracks visible in brick joints',
      }
    ]
  }
], { virtual: true });
jest.mock('../../settings/sections.json', () => [
  { id: '1', name: 'Exterior', order: 1 },
  { id: '2', name: 'Interior', order: 2 },
], { virtual: true });
jest.mock('../../settings/elements.json', () => [
  { id: '1', name: 'Walls', sectionId: '1', description: 'External walls', order: 1 },
  { id: '2', name: 'Roof', sectionId: '1', description: 'Roof structure', order: 2 },
], { virtual: true });
jest.mock('../../settings/utils/mappers', () => ({
  mapElementsToElementData: jest.fn().mockImplementation((elements) =>
    Promise.resolve(elements.map(el => ({ ...el, id: `${el.id}#test-tenant-123` })))
  ),
  mapBodToComponentData: jest.fn().mockImplementation(() =>
    Promise.resolve(Array(1).fill(null).map((_, i) => ({
      id: `component-${i}`,
      name: `Component ${i}`,
      materials: [{ name: 'Test Material' }]
    })))
  ),
  mapBodToPhraseData: jest.fn().mockImplementation(() =>
    Promise.resolve(Array(1).fill(null).map((_, i) => ({
      id: `phrase-${i}`,
      name: `Phrase ${i}`,
      phrase: 'Test phrase description'
    })))
  ),
}));

// Now import everything
import { seedInitialData, hasInitialData, getDataCounts, SeedingProgress } from '../dataSeedingService';
import { componentStore, elementStore, phraseStore, sectionStore } from '../../clients/Database';
import { getCurrentTenantId } from '../../utils/tenant-utils';
import { mapElementsToElementData, mapBodToComponentData, mapBodToPhraseData } from '../../settings/utils/mappers';

const mockGetCurrentTenantId = getCurrentTenantId as jest.MockedFunction<typeof getCurrentTenantId>;

// Test utilities
const createMockProgressCallback = () => {
  const calls: SeedingProgress[] = [];
  const callback = (progress: SeedingProgress) => calls.push(progress);
  return { callback, calls };
};

const createMockTenantContext = () => {
  const mockTenantId = 'test-tenant-123';
  return {
    tenantId: mockTenantId,
    mockGetCurrentTenantId: jest.fn().mockResolvedValue(mockTenantId),
  };
};

const expectProgressSteps = (calls: SeedingProgress[], expectedSteps: string[]) => {
  expect(calls).toHaveLength(expectedSteps.length + 1); // +1 for completion

  expectedSteps.forEach((step, index) => {
    expect(calls[index]).toEqual(
      expect.objectContaining({
        currentStep: expect.stringContaining(step),
        currentStepIndex: index,
        totalSteps: expectedSteps.length,
        isComplete: false
      })
    );
  });

  // Check completion state
  const finalCall = calls[calls.length - 1];
  expect(finalCall.isComplete).toBe(true);
  expect(finalCall.currentStepIndex).toBe(expectedSteps.length);
};

describe('dataSeedingService', () => {
  let mockTenant: ReturnType<typeof createMockTenantContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTenant = createMockTenantContext();
    mockGetCurrentTenantId.mockResolvedValue(mockTenant.tenantId);
  });

  describe('seedInitialData', () => {
    it('should seed all data types in correct order', async () => {
      const { callback } = createMockProgressCallback();

      await seedInitialData(callback);

      // Verify sections were added
      expect(sectionStore.add).toHaveBeenCalledTimes(mockSectionData.length);
      mockSectionData.forEach((section) => {
        expect(sectionStore.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${section.id}#${mockTenant.tenantId}`,
            name: section.name,
            order: section.order
          })
        );
      });

      // Verify elements were processed and added
      expect(mapElementsToElementData).toHaveBeenCalledWith(mockElementData);
      expect(elementStore.add).toHaveBeenCalledTimes(mockElementData.length);

      // Verify components were processed and added
      expect(mapBodToComponentData).toHaveBeenCalledWith(
        mockBankOfDefects,
        expect.any(Array)
      );
      expect(componentStore.add).toHaveBeenCalledTimes(expectedComponentCount);

      // Verify phrases were processed and added
      expect(mapBodToPhraseData).toHaveBeenCalledWith(
        mockBankOfDefects,
        expect.any(Array),
        expect.any(Array)
      );
      expect(phraseStore.add).toHaveBeenCalledTimes(expectedPhraseCount);
    });

    it('should call progress callback for each step', async () => {
      const { callback, calls } = createMockProgressCallback();

      await seedInitialData(callback);

      const expectedSteps = [
        'sections',
        'elements',
        'components',
        'phrases'
      ];

      expectProgressSteps(calls, expectedSteps);
    });

    it('should throw error when no tenant context available', async () => {
      mockGetCurrentTenantId.mockResolvedValue(null);

      await expect(seedInitialData()).rejects.toThrow(
        'No tenant context available for seeding data'
      );
    });
  });

  describe('hasInitialData', () => {
    it('should return false for new user with no data', () => {
      const result = hasInitialData(true, [], true, []);
      expect(result).toBe(false);
    });

    it('should return true when elements exist', () => {
      const mockElements = [{ id: '1', name: 'Wall' }];
      const result = hasInitialData(true, mockElements, true, []);
      expect(result).toBe(true);
    });

    it('should return true when sections exist', () => {
      const mockSections = [{ id: '1', name: 'Exterior' }];
      const result = hasInitialData(true, [], true, mockSections);
      expect(result).toBe(true);
    });

    it('should return false when data not hydrated', () => {
      const mockElements = [{ id: '1', name: 'Wall' }];
      const mockSections = [{ id: '1', name: 'Exterior' }];

      // Elements not hydrated
      expect(hasInitialData(false, mockElements, true, mockSections)).toBe(false);

      // Sections not hydrated
      expect(hasInitialData(true, mockElements, false, mockSections)).toBe(false);

      // Neither hydrated
      expect(hasInitialData(false, mockElements, false, mockSections)).toBe(false);
    });
  });

  describe('getDataCounts', () => {
    beforeEach(() => {
      // Reset the mock implementations
      (elementStore.useList as jest.Mock).mockReturnValue([true, []]);
      (componentStore.useList as jest.Mock).mockReturnValue([true, []]);
      (phraseStore.useList as jest.Mock).mockReturnValue([true, []]);
      (sectionStore.useList as jest.Mock).mockReturnValue([true, []]);
    });

    it('should return correct counts for each data type', async () => {
      const mockElements = Array(5).fill({ id: '1', name: 'Element' });
      const mockComponents = Array(3).fill({ id: '1', name: 'Component' });
      const mockPhrases = Array(7).fill({ id: '1', name: 'Phrase' });
      const mockSections = Array(2).fill({ id: '1', name: 'Section' });

      (elementStore.useList as jest.Mock).mockReturnValue([true, mockElements]);
      (componentStore.useList as jest.Mock).mockReturnValue([true, mockComponents]);
      (phraseStore.useList as jest.Mock).mockReturnValue([true, mockPhrases]);
      (sectionStore.useList as jest.Mock).mockReturnValue([true, mockSections]);

      const counts = await getDataCounts();

      expect(counts).toEqual({
        elements: 5,
        components: 3,
        phrases: 7,
        sections: 2,
      });
    });

    it('should return zero counts for non-hydrated data', async () => {
      const mockData = [{ id: '1', name: 'Item' }];

      (elementStore.useList as jest.Mock).mockReturnValue([false, mockData]);
      (componentStore.useList as jest.Mock).mockReturnValue([false, mockData]);
      (phraseStore.useList as jest.Mock).mockReturnValue([false, mockData]);
      (sectionStore.useList as jest.Mock).mockReturnValue([false, mockData]);

      const counts = await getDataCounts();

      expect(counts).toEqual({
        elements: 0,
        components: 0,
        phrases: 0,
        sections: 0,
      });
    });
  });
});