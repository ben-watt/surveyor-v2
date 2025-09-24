'use client';

import { useState } from 'react';
import {
  migrateFromImageUploadStore,
  verifyMigration,
  exportMigrationBackup,
  cleanupOldImageUploads,
  MigrationStats
} from '../utils/migrateImageStore';
import { Download, Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function ImageStoreMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleMigration = async () => {
    setIsRunning(true);
    setProgress(null);
    setStats(null);
    setVerificationResult(null);

    try {
      const result = await migrateFromImageUploadStore({
        dryRun: isDryRun,
        onProgress: (current, total) => setProgress({ current, total }),
        batchSize: 5
      });

      setStats(result);

      // Auto-verify after migration
      if (!isDryRun) {
        const verification = await verifyMigration();
        setVerificationResult(verification);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      alert(`Migration failed: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await exportMigrationBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-migration-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Backup failed: ${(error as Error).message}`);
    }
  };

  const handleCleanup = async () => {
    if (!stats || stats.failed > 0) {
      alert('Cannot cleanup: migration not complete or has failures');
      return;
    }

    try {
      await cleanupOldImageUploads();
      alert('Old image upload records have been cleaned up');
    } catch (error) {
      alert(`Cleanup failed: ${(error as Error).message}`);
    }
  };

  const handleVerify = async () => {
    const result = await verifyMigration();
    setVerificationResult(result);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Image Store Migration</h2>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800">
              This will migrate images from the old storage system to the new enhanced store with thumbnail support.
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              <strong>Always run a dry run first and backup your data!</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDryRun}
              onChange={(e) => setIsDryRun(e.target.checked)}
              disabled={isRunning}
              className="rounded"
            />
            <span>Dry Run (preview only)</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleMigration}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Running...' : `Start ${isDryRun ? 'Dry Run' : 'Migration'}`}
          </button>

          <button
            onClick={handleExportBackup}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Backup
          </button>

          <button
            onClick={handleVerify}
            disabled={isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verify Migration
          </button>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {stats && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">
            {isDryRun ? 'Dry Run Results' : 'Migration Results'}
          </h3>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Images:</div>
            <div className="font-medium">{stats.total}</div>

            <div>Migrated:</div>
            <div className="font-medium text-green-600">
              <CheckCircle className="inline h-4 w-4 mr-1" />
              {stats.migrated}
            </div>

            <div>Skipped:</div>
            <div className="font-medium text-yellow-600">{stats.skipped}</div>

            <div>Failed:</div>
            <div className="font-medium text-red-600">
              {stats.failed > 0 && <XCircle className="inline h-4 w-4 mr-1" />}
              {stats.failed}
            </div>
          </div>

          {stats.errors.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-600">
                View {stats.errors.length} errors
              </summary>
              <div className="mt-2 text-xs space-y-1">
                {stats.errors.map((error, i) => (
                  <div key={i} className="bg-red-50 p-2 rounded">
                    <strong>{error.id}:</strong> {error.error}
                  </div>
                ))}
              </div>
            </details>
          )}

          {!isDryRun && stats.failed === 0 && (
            <button
              onClick={handleCleanup}
              className="mt-4 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              Clean Up Old Data
            </button>
          )}
        </div>
      )}

      {/* Verification */}
      {verificationResult && (
        <div className={`p-4 rounded ${
          verificationResult.isValid ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <h3 className="font-semibold mb-2">Verification Result</h3>
          <p className={`text-sm ${
            verificationResult.isValid ? 'text-green-800' : 'text-red-800'
          }`}>
            {verificationResult.message}
          </p>
          <div className="text-xs mt-2 space-y-1">
            <div>Old store: {verificationResult.oldCount} images</div>
            <div>New store: {verificationResult.newCount} images</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 pt-6 border-t text-sm text-gray-600">
        <h4 className="font-semibold mb-2">Migration Steps:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Export a backup of your current data</li>
          <li>Run a dry run to preview the migration</li>
          <li>If dry run looks good, uncheck "Dry Run" and start migration</li>
          <li>Verify the migration was successful</li>
          <li>Test the application with new image system</li>
          <li>Once confirmed working, clean up old data</li>
        </ol>
      </div>
    </div>
  );
}