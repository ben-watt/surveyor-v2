import React, { useEffect, useRef } from 'react';
import { FieldValues, Path, UseControllerProps, useController } from 'react-hook-form';
import { DropZoneInputFile, DropZoneInputImage, DropZoneInputImageProps } from './index';
import { ErrorMessage } from '@hookform/error-message';
import { Label } from '../Input/Label';
import InputError from '../InputError';

export interface RhfDropZoneInputImageProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> extends Omit<DropZoneInputImageProps, 'onChange'> {
  rhfProps: UseControllerProps<TFieldValues, TName>;
  labelText?: string;
}

const MemoizedDropZoneInputImage = React.memo(DropZoneInputImage);

export function RhfDropZoneInputImage<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>({ path, rhfProps, labelText, ...props }: RhfDropZoneInputImageProps<TFieldValues, TName>) {
  const { field } = useController<TFieldValues, TName>(rhfProps);
  const lastSigRef = useRef<string | null>(null);
  const lastTimeRef = useRef<number>(0);

  const commit = (files: DropZoneInputFile[]) => {
    const mappedFiles = files.map((file) => ({
      path: file.path,
      isArchived: file.isArchived,
      hasMetadata: file.hasMetadata,
    }));
    const sig = JSON.stringify(mappedFiles);
    const now = Date.now();
    // De-dupe rapid duplicate events (e.g., onReorder then onChange from child)
    if (lastSigRef.current === sig && now - lastTimeRef.current < 50) return;
    lastSigRef.current = sig;
    lastTimeRef.current = now;
    field.onChange(mappedFiles as any);
    // Mark field as touched so autosave/watchers reliably pick up the first drag
    field.onBlur();
  };

  // Prime autosave baseline for non-empty initial values so the first drag isn't treated as initialization
  useEffect(() => {
    if (Array.isArray(field.value) && field.value.length > 0) {
      // Defer to ensure the autosave watcher subscription is established
      const id = setTimeout(() => {
        try {
          const next = [...(field.value as any[])];
          field.onChange(next as any);
          field.onBlur();
        } catch {
          // no-op
        }
      }, 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {labelText && <Label text={labelText} />}
      <MemoizedDropZoneInputImage
        path={path}
        value={Array.isArray(field.value) ? (field.value as any) : []}
        onChange={commit}
        onReorder={commit}
        {...props}
      />
      <ErrorMessage
        name={rhfProps.name as string}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
}
