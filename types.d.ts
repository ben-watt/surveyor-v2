import React from 'react';

declare global {
  namespace React {
    interface TdHTMLAttributes<T> extends React.TdHTMLAttributes<T> {
      colwidth?: string;
    }
  }
}

import '@tanstack/react-table'

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    tw: {
      cellClassName: string;
    }
  }
}