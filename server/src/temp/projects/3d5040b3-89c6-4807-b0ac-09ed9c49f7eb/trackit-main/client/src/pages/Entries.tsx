import { useState } from 'react';
import EntriesTable from '@/components/EntriesTable';
import EntriesTableHead from '@/components/EntriesTableHead';

export default function Entries() {
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  // time filters
  const [timeFilterType, setTimeFilterType] = useState<'all' | 'month' | 'quarter' | 'year' | 'custom'>('all');
  const [timeFilterMonth, setTimeFilterMonth] = useState<number | null>(null);
  const [timeFilterYear, setTimeFilterYear] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  return (
    <div className="h-fit w-full flex flex-col items-center py-5 pb-10">
      <EntriesTableHead
        type={filterType}
        category={filterCategory}
        onTypeChange={(value) => {
          setFilterType(value);
          setFilterCategory('');
        }}
        onCategoryChange={setFilterCategory}
        filterType={timeFilterType}
        filterMonth={timeFilterMonth}
        filterYear={timeFilterYear}
        startDate={startDate}
        endDate={endDate}
        onTimeFilterChange={(t, m, y, s, e) => {
          setTimeFilterType(t as typeof timeFilterType);
          setTimeFilterMonth(m);
          setTimeFilterYear(y);
          setStartDate(s);
          setEndDate(e);
        }}
      />
      <EntriesTable
        type={filterType}
        category={filterCategory}
        filterType={timeFilterType}
        filterMonth={timeFilterMonth}
        filterYear={timeFilterYear}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
