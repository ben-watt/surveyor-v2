import { ColumnDef, ColumnMeta } from '@tanstack/react-table';

export interface TableColumnMeta extends ColumnMeta<any, any> {
  tw?: {
    headerClassName?: string;
    cellClassName?: string;
  };
}

export type TableColumnDef<TData> = ColumnDef<TData, any> & {
  meta?: TableColumnMeta;
};
