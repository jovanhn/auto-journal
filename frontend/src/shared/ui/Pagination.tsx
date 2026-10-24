import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

type PaginationProps = {
  /** Zero-based page index (API convention). */
  page: number;
  size: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, size, totalItems, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 0}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page + 1 >= totalPages}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
