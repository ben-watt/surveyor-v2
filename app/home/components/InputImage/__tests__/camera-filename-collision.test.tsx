/**
 * Test demonstrating the camera filename collision issue
 *
 * PROBLEM: Camera apps often reuse generic filenames like "image-01.jpg" for
 * DIFFERENT photos. The current implementation incorrectly assumes files with
 * the same name are the same image and tries to replace them.
 *
 * SCENARIO:
 * 1. User takes a photo of the front of a building → camera saves as "image-01.jpg"
 * 2. User uploads it to the survey
 * 3. User takes a photo of the back of the building → camera ALSO saves as "image-01.jpg"
 * 4. User tries to upload this NEW photo
 * 5. App incorrectly tries to REPLACE the front photo with the back photo
 * 6. If using table.add(), it fails with "cannot replace" error
 *
 * EXPECTED BEHAVIOR:
 * The app should recognize these are different images and either:
 * - Rename the second image (e.g., "image-01-2.jpg" or "image-01_1704110400000.jpg")
 * - Prompt the user to choose what to do
 * - Use a better naming strategy from the start
 */

describe('Camera Filename Collision Issue', () => {
  it('demonstrates the problem: camera reuses "image-01.jpg" for DIFFERENT photos', () => {
    // Simulate camera behavior
    const camera = {
      takePhoto: (content: string) => {
        // Camera always uses the same filename pattern!
        return new File([content], 'image-01.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
      }
    };

    // User takes first photo
    const frontOfBuilding = camera.takePhoto('Front facade with main entrance');
    expect(frontOfBuilding.name).toBe('image-01.jpg');
    expect(frontOfBuilding.size).toBe(31); // Different content

    // User takes second photo (DIFFERENT image!)
    const backOfBuilding = camera.takePhoto('Rear elevation with garden');
    expect(backOfBuilding.name).toBe('image-01.jpg'); // Same name!
    expect(backOfBuilding.size).toBe(26); // Different content

    // These are DIFFERENT images that happen to share a name
    expect(frontOfBuilding.size).not.toBe(backOfBuilding.size);
    expect(frontOfBuilding.lastModified).not.toBe(backOfBuilding.lastModified);
  });

  it('shows current wrong behavior: treating different images as the same', () => {
    const surveyImages: Map<string, File> = new Map();

    // Upload first photo
    const photo1 = new File(['Kitchen damage'], 'image-01.jpg', { type: 'image/jpeg' });
    surveyImages.set(photo1.name, photo1);

    // Upload second DIFFERENT photo with same name
    const photo2 = new File(['Bathroom leak'], 'image-01.jpg', { type: 'image/jpeg' });

    // Current logic (WRONG): Replace because names match
    if (surveyImages.has(photo2.name)) {
      console.log('File exists, replacing...'); // This is wrong!
      surveyImages.set(photo2.name, photo2);
    }

    // Result: Lost the kitchen photo!
    expect(surveyImages.size).toBe(1); // Should be 2!
    expect(surveyImages.get('image-01.jpg')).toBe(photo2); // Kitchen photo is gone
  });

  it('shows desired behavior: rename to avoid collision', () => {
    const surveyImages: Map<string, File> = new Map();

    function uploadWithRename(file: File): string {
      let finalName = file.name;
      let counter = 1;

      // Check if name exists and generate unique name
      while (surveyImages.has(finalName)) {
        const nameParts = file.name.split('.');
        const ext = nameParts.pop();
        const baseName = nameParts.join('.');
        finalName = `${baseName}-${counter}.${ext}`;
        counter++;
      }

      // Create renamed file if needed
      const uploadFile = finalName !== file.name
        ? new File([file], finalName, { type: file.type })
        : file;

      surveyImages.set(finalName, uploadFile);
      return finalName;
    }

    // Upload first photo
    const photo1 = new File(['Kitchen damage'], 'image-01.jpg', { type: 'image/jpeg' });
    const name1 = uploadWithRename(photo1);
    expect(name1).toBe('image-01.jpg');

    // Upload second DIFFERENT photo with same original name
    const photo2 = new File(['Bathroom leak'], 'image-01.jpg', { type: 'image/jpeg' });
    const name2 = uploadWithRename(photo2);
    expect(name2).toBe('image-01-1.jpg'); // Renamed!

    // Upload third photo with same original name
    const photo3 = new File(['Roof damage'], 'image-01.jpg', { type: 'image/jpeg' });
    const name3 = uploadWithRename(photo3);
    expect(name3).toBe('image-01-2.jpg'); // Renamed!

    // Result: All photos preserved
    expect(surveyImages.size).toBe(3);
    expect(Array.from(surveyImages.keys())).toEqual([
      'image-01.jpg',
      'image-01-1.jpg',
      'image-01-2.jpg'
    ]);
  });

  it('alternative solution: use timestamp-based naming', async () => {
    const surveyImages: Map<string, File> = new Map();

    function uploadWithTimestamp(file: File): string {
      const timestamp = Date.now();
      const nameParts = file.name.split('.');
      const ext = nameParts.pop();
      const baseName = nameParts.join('.');
      const uniqueName = `${baseName}_${timestamp}.${ext}`;

      const uploadFile = new File([file], uniqueName, { type: file.type });
      surveyImages.set(uniqueName, uploadFile);
      return uniqueName;
    }

    // Even if camera uses same name, we make it unique
    const photo1 = new File(['Kitchen damage'], 'image-01.jpg', { type: 'image/jpeg' });
    const name1 = uploadWithTimestamp(photo1);
    expect(name1).toMatch(/image-01_\d+\.jpg/);

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1));

    const photo2 = new File(['Bathroom leak'], 'image-01.jpg', { type: 'image/jpeg' });
    const name2 = uploadWithTimestamp(photo2);
    expect(name2).toMatch(/image-01_\d+\.jpg/);

    // Names are guaranteed unique
    expect(name1).not.toBe(name2);
    expect(surveyImages.size).toBe(2);
  });

  it('shows the error path in current implementation', () => {
    // This simulates what happens in DropZoneInputImage.tsx lines 318-343

    const existingFiles = [
      { name: 'image-01.jpg', path: 'survey/image-01.jpg', isArchived: false }
    ];

    const newCameraPhoto = new File(['Different content'], 'image-01.jpg', { type: 'image/jpeg' });

    // Current logic checks if file exists
    const existingFile = existingFiles.find(f => f.name === newCameraPhoto.name);

    if (existingFile && !existingFile.isArchived) {
      // Current code tries to REPLACE (wrong for new photos!)
      // This calls imageUploadStore.create() which uses table.add()
      // table.add() fails because the key already exists

      // This is where the error "cannot replace image-01.jpg" occurs
      expect(() => {
        throw new Error(`Cannot replace ${newCameraPhoto.name} - Key already exists`);
      }).toThrow('Cannot replace image-01.jpg');
    }
  });
});