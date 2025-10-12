/**
 * A simple store to keep track of upload status for different paths
 * Designed to avoid re-renders when status changes
 */

type UploadStatusCallback = (isUploading: boolean, path: string) => void;

class ImageUploadStatusStore {
  private uploadingPaths: Record<string, boolean> = {};
  private subscribers: Set<UploadStatusCallback> = new Set();

  /**
   * Set a path as currently uploading
   */
  setUploading(path: string, isUploading: boolean): void {
    this.uploadingPaths[path] = isUploading;
    this.notifySubscribers(path);
  }

  /**
   * Mark a path as uploaded (not uploading anymore)
   */
  setUploaded(path: string): void {
    this.uploadingPaths[path] = false;
    this.notifySubscribers(path);
  }

  /**
   * Check if a specific path is currently uploading
   */
  isUploading(path: string): boolean {
    return !!this.uploadingPaths[path];
  }

  /**
   * Subscribe to status changes
   * @returns An unsubscribe function
   */
  subscribe(callback: UploadStatusCallback): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of a status change
   */
  private notifySubscribers(path: string): void {
    const isUploading = this.isUploading(path);
    this.subscribers.forEach((callback) => {
      callback(isUploading, path);
    });
  }
}

export const imageUploadStatusStore = new ImageUploadStatusStore();
