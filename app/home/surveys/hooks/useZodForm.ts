import { useMemo } from 'react';
import { useForm, UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StatusResult } from '../schemas/types';

/**
 * Enhanced useForm hook that integrates Zod validation with status computation
 * This eliminates duplication between form validation and status tracking
 */
export function useZodForm<
  TSchema extends z.ZodType<any, any, any>
>(
  schema: TSchema,
  statusComputer: (data: unknown) => StatusResult,
  options?: Omit<UseFormProps<z.input<TSchema>>, 'resolver'>
) {
  const form = useForm<z.input<TSchema>>({
    resolver: zodResolver(schema),
    ...options
  });

  // Reactive status computation based on watched form data
  const watchedData = form.watch();
  const statusResult = useMemo(() => 
    statusComputer(watchedData), 
    [statusComputer, watchedData]
  );

  return {
    ...form,
    // Status from the same validation logic
    status: statusResult.status,
    hasData: statusResult.hasData,
    isValid: statusResult.isValid,
    validationErrors: statusResult.errors || [],
    // Computed helper flags
    isComplete: statusResult.status === 'complete',
    isInProgress: statusResult.status === 'in-progress',
    isEmpty: !statusResult.hasData
  };
}

/**
 * Example usage for Report Details form
 */
/*
import { reportDetailsSchema, zodReportDetailsStatus } from '../schemas';

export function ReportDetailsForm() {
  const {
    register,
    control,
    handleSubmit,
    status,
    hasData,
    isValid,
    validationErrors,
    isComplete,
    formState: { errors }
  } = useZodForm(reportDetailsSchema, zodReportDetailsStatus);

  return (
    <form>
      <input {...register('clientName')} />
      <div>Status: {status}</div>
      <div>Complete: {isComplete ? 'Yes' : 'No'}</div>
      {validationErrors.length > 0 && (
        <div>
          <h4>Validation Issues:</h4>
          <ul>
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
*/