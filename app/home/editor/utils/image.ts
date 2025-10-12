import { getUrl } from 'aws-amplify/storage';

export async function getImagesHref(imagesUri: string[]): Promise<string[]> {
  if (!imagesUri?.length) return [];

  try {
    const tasks = imagesUri.map(getImageHref);
    return await Promise.all(tasks);
  } catch (error: any) {
    console.error('[getImagesHref] Failed to get image hrefs for images', imagesUri, error);
    return [];
  }
}

export async function getImageHref(imageUri: string): Promise<string> {
  try {
    const path = await getUrl({ path: imageUri });
    return path.url.href;
  } catch (error: any) {
    console.error(`[getImageHref] Failed to get image href for ${imageUri}`, error);
    return '';
  }
}
