"use client";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  isLoading = false,
  onPageChange,
}: PaginationProps) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const handleChange = (nextPage: number) => {
    if (isLoading) return;
    if (nextPage < 1 || nextPage > totalPages) return;
    if (nextPage === currentPage) return;
    onPageChange(nextPage);
  };

  return (
    <div className="mt-4 flex flex-col items-start gap-3 border-t border-gray-200 pt-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleChange(currentPage - 1)}
          disabled={isLoading || currentPage <= 1}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleChange(currentPage + 1)}
          disabled={isLoading || currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
