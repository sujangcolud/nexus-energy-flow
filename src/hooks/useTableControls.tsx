import { useState } from "react";
import { DateRange } from "react-day-picker";

const useTableControls = (itemsPerPage = 50) => {
  const [page, setPage] = useState(1);
  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  });

  const onPageChange = (newPage: number) => {
    setPage(newPage);
  };

  const onRangeChange = (newRange: DateRange | undefined) => {
    setRange(newRange);
    setPage(1); // Reset to first page when date range changes
  };

  const getPaginationSlice = <T,>(data: T[]): T[] => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  return {
    page,
    range,
    onPageChange,
    onRangeChange,
    getPaginationSlice,
    itemsPerPage,
  };
};

export default useTableControls;
