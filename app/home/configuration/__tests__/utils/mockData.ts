// Mock interfaces that match the actual types without importing the actual Dexie file
interface MockSection {
  id: string;
  name: string;
  order: number;
  syncStatus: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

interface MockElement {
  id: string;
  name: string;
  description: string;
  order: number;
  sectionId: string;
  syncStatus: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

interface MockComponent {
  id: string;
  name: string;
  materials: { name: string }[];
  elementId: string;
  syncStatus: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

interface MockCondition {
  id: string;
  name: string;
  type: string;
  phrase: string;
  phraseLevel2: string;
  associatedElementIds: string[];
  associatedComponentIds: string[];
  associatedMaterialIds: string[];
  owner: string;
  syncStatus: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

// Type aliases to match the expected structure
type Section = MockSection;
type Element = MockElement;
type BuildingComponent = MockComponent;
type Condition = MockCondition;

const SyncStatus = {
  Synced: "synced",
};

export const mockSections: Section[] = [
  {
    id: "section-1",
    name: "Structure",
    order: 1,
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "section-2", 
    name: "Electrical",
    order: 2,
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "section-3",
    name: "Plumbing",
    order: 3,
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
];

export const mockElements: Element[] = [
  {
    id: "element-1",
    name: "Foundation",
    description: "Building foundation system",
    order: 1,
    sectionId: "section-1",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "element-2",
    name: "Walls",
    description: "Structural walls",
    order: 2,
    sectionId: "section-1",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "element-3",
    name: "Wiring",
    description: "Electrical wiring systems",
    order: 1,
    sectionId: "section-2",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "element-4",
    name: "Pipes",
    description: "Water supply and drainage pipes",
    order: 1,
    sectionId: "section-3",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
];

export const mockComponents: BuildingComponent[] = [
  {
    id: "component-1",
    name: "Concrete Footing",
    materials: [{ name: "Concrete" }],
    elementId: "element-1",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "component-2",
    name: "Brick Wall",
    materials: [{ name: "Brick" }],
    elementId: "element-2",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "component-3",
    name: "Electrical Panel",
    materials: [{ name: "Metal" }],
    elementId: "element-3",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "component-4",
    name: "Copper Pipe",
    materials: [{ name: "Copper" }],
    elementId: "element-4",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
];

export const mockConditions: Condition[] = [
  {
    id: "condition-1",
    name: "Crack in Foundation",
    type: "defect",
    phrase: "Visible crack in concrete footing",
    phraseLevel2: "",
    associatedElementIds: ["element-1"],
    associatedComponentIds: ["component-1"],
    associatedMaterialIds: [],
    owner: "system",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "condition-2",
    name: "Loose Bricks",
    type: "defect",
    phrase: "Several bricks are loose in the wall",
    phraseLevel2: "",
    associatedElementIds: ["element-2"],
    associatedComponentIds: ["component-2"],
    associatedMaterialIds: [],
    owner: "system",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "condition-3",
    name: "Corrosion on Panel",
    type: "defect",
    phrase: "Rust visible on electrical panel housing",
    phraseLevel2: "",
    associatedElementIds: ["element-3"],
    associatedComponentIds: ["component-3"],
    associatedMaterialIds: [],
    owner: "system",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "condition-4",
    name: "Pipe Leak",
    type: "defect",
    phrase: "Small leak detected in copper pipe joint",
    phraseLevel2: "",
    associatedElementIds: ["element-4"],
    associatedComponentIds: ["component-4"],
    associatedMaterialIds: [],
    owner: "system",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
  {
    id: "condition-5",
    name: "Element Level Condition",
    type: "defect",
    phrase: "Condition associated with element but no specific component",
    phraseLevel2: "",
    associatedElementIds: ["element-1"],
    associatedComponentIds: [],
    associatedMaterialIds: [],
    owner: "system",
    syncStatus: SyncStatus.Synced,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tenantId: "tenant-1",
  },
];

// Tree node structure for testing
export const mockTreeData = {
  sections: mockSections,
  elements: mockElements,
  components: mockComponents,
  conditions: mockConditions,
};

// Mock store interface to match the actual Dexie hooks structure
export const createMockStores = () => ({
  sectionStore: {
    useList: jest.fn().mockReturnValue([true, mockSections]),
    useGet: jest.fn().mockImplementation((id: string) => 
      [true, mockSections.find(s => s.id === id) || null]
    ),
    delete: jest.fn().mockResolvedValue({ isOk: true, value: "deleted" }),
    isHydrated: true,
  },
  elementStore: {
    useList: jest.fn().mockReturnValue([true, mockElements]),
    useGet: jest.fn().mockImplementation((id: string) => 
      [true, mockElements.find(e => e.id === id) || null]
    ),
    delete: jest.fn().mockResolvedValue({ isOk: true, value: "deleted" }),
    isHydrated: true,
  },
  componentStore: {
    useList: jest.fn().mockReturnValue([true, mockComponents]),
    useGet: jest.fn().mockImplementation((id: string) => 
      [true, mockComponents.find(c => c.id === id) || null]
    ),
    delete: jest.fn().mockResolvedValue({ isOk: true, value: "deleted" }),
    isHydrated: true,
  },
  phraseStore: {
    useList: jest.fn().mockReturnValue([true, mockConditions]),
    useGet: jest.fn().mockImplementation((id: string) => 
      [true, mockConditions.find(c => c.id === id) || null]
    ),
    delete: jest.fn().mockResolvedValue({ isOk: true, value: "deleted" }),
    isHydrated: true,
  },
});

// Mock hierarchical tree structure that matches the useHierarchicalData return type
export const mockHierarchicalData = {
  isLoading: false,
  tree: [
    {
      id: "section-1",
      name: "Structure",
      type: "section" as const,
      data: mockSections[0],
      children: [
        {
          id: "element-1",
          name: "Foundation",
          type: "element" as const,
          data: mockElements[0],
          children: [
            {
              id: "component-1",
              name: "Concrete Footing",
              type: "component" as const,
              data: mockComponents[0],
              children: [
                {
                  id: "element-1-condition-1",
                  name: "Crack in Foundation",
                  type: "condition" as const,
                  data: mockConditions[0],
                  children: [],
                  isExpanded: false,
                  parentId: "component-1",
                },
              ],
              isExpanded: false,
              parentId: "element-1",
            },
            {
              id: "element-1-condition-5",
              name: "Element Level Condition", 
              type: "condition" as const,
              data: mockConditions[4],
              children: [],
              isExpanded: false,
              parentId: "element-1",
            },
          ],
          isExpanded: false,
          parentId: "section-1",
          order: 1,
        },
        {
          id: "element-2",
          name: "Walls",
          type: "element" as const,
          data: mockElements[1],
          children: [
            {
              id: "component-2",
              name: "Brick Wall",
              type: "component" as const,
              data: mockComponents[1],
              children: [
                {
                  id: "condition-2",
                  name: "Loose Bricks",
                  type: "condition" as const,
                  data: mockConditions[1],
                  children: [],
                  isExpanded: false,
                  parentId: "component-2",
                },
              ],
              isExpanded: false,
              parentId: "element-2",
            },
          ],
          isExpanded: false,
          parentId: "section-1",
          order: 2,
        },
      ],
      isExpanded: false,
      order: 1,
    },
    {
      id: "section-2",
      name: "Electrical",
      type: "section" as const,
      data: mockSections[1],
      children: [
        {
          id: "element-3",
          name: "Wiring",
          type: "element" as const,
          data: mockElements[2],
          children: [
            {
              id: "component-3",
              name: "Electrical Panel",
              type: "component" as const,
              data: mockComponents[2],
              children: [
                {
                  id: "condition-3",
                  name: "Corrosion on Panel",
                  type: "condition" as const,
                  data: mockConditions[2],
                  children: [],
                  isExpanded: false,
                  parentId: "component-3",
                },
              ],
              isExpanded: false,
              parentId: "element-3",
            },
          ],
          isExpanded: false,
          parentId: "section-2",
          order: 1,
        },
      ],
      isExpanded: false,
      order: 2,
    },
    {
      id: "section-3",
      name: "Plumbing",
      type: "section" as const,
      data: mockSections[2],
      children: [
        {
          id: "element-4",
          name: "Pipes",
          type: "element" as const,
          data: mockElements[3],
          children: [
            {
              id: "component-4",
              name: "Copper Pipe",
              type: "component" as const,
              data: mockComponents[3],
              children: [
                {
                  id: "condition-4",
                  name: "Pipe Leak",
                  type: "condition" as const,
                  data: mockConditions[3],
                  children: [],
                  isExpanded: false,
                  parentId: "component-4",
                },
              ],
              isExpanded: false,
              parentId: "element-4",
            },
          ],
          isExpanded: false,
          parentId: "section-3",
          order: 1,
        },
      ],
      isExpanded: false,
      order: 3,
    },
  ],
  get treeData() { return this.tree; },
  sections: mockSections,
  elements: mockElements,
  components: mockComponents,
  conditions: mockConditions,
};