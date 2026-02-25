import { useState } from 'react';
import EntriesTableHead from '@/components/EntriesTableHead';
import Summary from '../components/Summary';
import EntriesTable from '@/components/EntriesTable';

export default function Home() {
  const [filterType, setFilterType] = useState<
    'all' | 'month' | 'quarter' | 'year' | 'custom'
  >('month');
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  return (
    <div className="h-fit w-full flex flex-col py-5 md:py-10 gap-5">
      <Summary
        onFilterChange={(type, month, year, start, end) => {
          setFilterType(type as typeof filterType);
          setFilterMonth(month);
          setFilterYear(year);
          setStartDate(start);
          setEndDate(end);
        }}
      />
      <div>
        <EntriesTableHead
          type=""
          category=""
          onTypeChange={() => {}}
          onCategoryChange={() => {}}
          filterType={filterType}
          filterMonth={filterMonth}
          filterYear={filterYear}
          startDate={startDate}
          endDate={endDate}
          onTimeFilterChange={(type, month, year, start, end) => {
            setFilterType(type as typeof filterType);
            setFilterMonth(month);
            setFilterYear(year);
            setStartDate(start);
            setEndDate(end);
          }}
        />
        <EntriesTable
          filterType={filterType}
          filterMonth={filterMonth}
          filterYear={filterYear}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
}
