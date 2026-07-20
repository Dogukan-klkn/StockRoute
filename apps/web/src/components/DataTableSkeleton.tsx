import { Skeleton, TableBody, TableCell, TableRow } from '@mui/material';

/**
 * Tablo yükleme durumu için satır iskeletleri. `TableBody` içine yerleştirilir;
 * gerçek satırların yerini tutar, böylece veri gelene kadar düzen kaymaz
 * (bkz. plan §12 — yükleme durumları).
 */
interface DataTableSkeletonProps {
  /** Tablonun sütun sayısı (her hücrede bir skeleton çubuğu çizilir). */
  columns: number;
  /** İskelet satır sayısı (varsayılan: 5). */
  rows?: number;
}

export function DataTableSkeleton({ columns, rows = 5 }: DataTableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton variant="text" width={colIndex === 0 ? '70%' : '50%'} height={24} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
