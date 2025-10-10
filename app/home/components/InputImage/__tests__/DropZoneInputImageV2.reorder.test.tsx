import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DropZoneInputImage } from '../index';
import { ImageMetadata } from '@/app/home/clients/Database';
import { SyncStatus } from '@/app/home/clients/Dexie';

// Mocks similar to core tests
jest.mock('@/app/home/clients/enhancedImageMetadataStore', () => ({
  enhancedImageStore: {
    getActiveImages: jest.fn(),
    getArchivedImages: jest.fn(),
    uploadImage: jest.fn(),
    archiveImage: jest.fn(),
    unarchiveImage: jest.fn(),
    markDeleted: jest.fn(),
    replaceDeletedImage: jest.fn(),
    useGet: jest.fn(),
    findDuplicate: jest.fn(),
  },
}));

jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
  }),
}));

const { enhancedImageStore } = require('@/app/home/clients/enhancedImageMetadataStore');

describe('DropZoneInputImageV2 Reordering', () => {
  const mockPath = 'surveys/test-id/photos';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders active images in the controlled value order', async () => {
    const activeImages: ImageMetadata[] = [
      {
        id: 'img-1',
        imagePath: `${mockPath}/a.jpg`,
        fileName: 'a.jpg',
        isArchived: false,
        uploadStatus: 'uploaded',
        syncStatus: SyncStatus.Synced,
        thumbnailDataUrl: 'data:image/jpeg;base64,a',
        tenantId: 'tenant',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'img-2',
        imagePath: `${mockPath}/b.jpg`,
        fileName: 'b.jpg',
        isArchived: false,
        uploadStatus: 'uploaded',
        syncStatus: SyncStatus.Synced,
        thumbnailDataUrl: 'data:image/jpeg;base64,b',
        tenantId: 'tenant',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    enhancedImageStore.getActiveImages.mockResolvedValue({ ok: true, val: activeImages });
    enhancedImageStore.getArchivedImages.mockResolvedValue({ ok: true, val: [] });
    // Hydration for thumbnails
    const metaById: Record<string, any> = Object.fromEntries(activeImages.map(img => [img.id, img])); enhancedImageStore.useGet.mockImplementation((id: string) => [true, metaById[id]]);

    // Controlled order is [b, a]
    const controlledValue = [
      { path: `${mockPath}/b.jpg`, isArchived: false, hasMetadata: false },
      { path: `${mockPath}/a.jpg`, isArchived: false, hasMetadata: false },
    ];

    const { container } = render(
      <DropZoneInputImage
        path={mockPath}
        value={controlledValue}
        onChange={jest.fn()}
        onReorder={jest.fn()}
        features={{ metadata: true, archive: true }}
      />
    );

    // Wait for the list to be present
    const lists = await screen.findAllByRole('list');
    const firstList = lists[0] as HTMLElement;
    const items = Array.from(firstList.querySelectorAll('li'));
    // For each item, find the file name label
    const names = items.map((li) => {
      const label = li.querySelector('aside:nth-of-type(2) p');
      return label?.textContent?.trim();
    });
    expect(names).toEqual(['b.jpg', 'a.jpg']);
  });

  it('does not overwrite a provided controlled value on initial load', async () => {
    const activeImages: ImageMetadata[] = [
      {
        id: 'img-1',
        imagePath: `${mockPath}/a.jpg`,
        fileName: 'a.jpg',
        isArchived: false,
        uploadStatus: 'uploaded',
        syncStatus: SyncStatus.Synced,
        tenantId: 'tenant',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'img-2',
        imagePath: `${mockPath}/b.jpg`,
        fileName: 'b.jpg',
        isArchived: false,
        uploadStatus: 'uploaded',
        syncStatus: SyncStatus.Synced,
        tenantId: 'tenant',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    enhancedImageStore.getActiveImages.mockResolvedValue({ ok: true, val: activeImages });
    enhancedImageStore.getArchivedImages.mockResolvedValue({ ok: true, val: [] });
    const metaById: Record<string, any> = Object.fromEntries(activeImages.map(img => [img.id, img]));
    enhancedImageStore.useGet.mockImplementation((id: string) => [true, metaById[id]]);

    const controlledValue = [
      { path: `${mockPath}/b.jpg`, isArchived: false, hasMetadata: false },
      { path: `${mockPath}/a.jpg`, isArchived: false, hasMetadata: false },
    ];

    const onChange = jest.fn();
    render(
      <DropZoneInputImage
        path={mockPath}
        value={controlledValue}
        onChange={onChange}
        features={{}}
      />
    );

    // Wait for any async refresh to complete
    await waitFor(() => expect(enhancedImageStore.getActiveImages).toHaveBeenCalled());
    // onChange should not be called to overwrite the provided value
    expect(onChange).not.toHaveBeenCalled();
  });
});

