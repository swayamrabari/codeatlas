import { useState } from 'react';
import { useEntriesStore } from '@/store/entriesStore';
import TimeFilterDialog from '@/components/TimeFilterDialog';

interface SummaryProps {
  onFilterChange?: (
    type: string,
    month: number | null,
    year: number | null,
    start: Date | undefined,
    end: Date | undefined
  ) => void;
}

export default function Summary({ onFilterChange }: SummaryProps = {}) {
  const { entries, mainEntries } = useEntriesStore();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();
  const [filterType, setFilterType] = useState('month');
  const [filterMonth, setFilterMonth] = useState<number | null>(currentMonth);
  const [filterYear, setFilterYear] = useState<number | null>(currentYear);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Month names for display
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Calculate filtered data based on the filter type and value
  const filteredData = (() => {
    if (filterType === 'all') {
      return mainEntries; // Return all data if no filter is applied
    }

    // Filter entries based on the selected time period
    const filteredEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      const entryMonth = entryDate.getMonth() + 1; // 1-12
      const entryYear = entryDate.getFullYear();

      if (filterType === 'month' && filterMonth && filterYear) {
        return entryMonth === filterMonth && entryYear === filterYear;
      } else if (filterType === 'year' && filterYear) {
        return entryYear === filterYear;
      } else if (filterType === 'custom' && startDate && endDate) {
        return entryDate >= startDate && entryDate <= endDate;
      } else if (filterType === 'quarter' && filterYear) {
        // Calculate quarter (1-4) from month
        const quarter = Math.floor((entryMonth - 1) / 3) + 1;
        return quarter === filterMonth && entryYear === filterYear;
      }
      return true;
    });

    // Aggregate the filtered entries by type
    return filteredEntries.reduce(
      (
        acc: {
          income: number;
          expense: number;
          investment: number;
          savings: number;
        },
        entry
      ) => {
        const type = entry.type as
          | 'income'
          | 'expense'
          | 'investment'
          | 'savings';
        acc[type] = (acc[type] || 0) + entry.amount;
        return acc;
      },
      { income: 0, expense: 0, investment: 0, savings: 0 }
    );
  })();

  const total =
    filteredData.expense + filteredData.investment + filteredData.savings;
  const expensePercent = total ? (filteredData.expense / total) * 100 : 0;
  const investmentPercent = total ? (filteredData.investment / total) * 100 : 0;
  const savingsPercent = total ? (filteredData.savings / total) * 100 : 0;

  // Get the filter display text
  const getFilterDisplayText = () => {
    if (filterType === 'all') {
      return 'All Time';
    } else if (filterType === 'month' && filterMonth && filterYear) {
      return `${monthNames[filterMonth - 1]} ${filterYear}`;
    } else if (filterType === 'year' && filterYear) {
      return `Year ${filterYear}`;
    } else if (filterType === 'quarter' && filterMonth && filterYear) {
      return `Q${filterMonth} ${filterYear}`;
    } else if (filterType === 'custom' && startDate && endDate) {
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
    return 'Select Filter';
  };

  // Handle filter changes from the dialog
  const handleFilterChange = (
    type: string,
    month: number | null,
    year: number | null,
    start: Date | undefined,
    end: Date | undefined
  ) => {
    setFilterType(type);
    setFilterMonth(month);
    setFilterYear(year);
    setStartDate(start);
    setEndDate(end);
    onFilterChange?.(type, month, year, start, end);
  };

  return (
    <div className="h-auto w-full flex flex-col">
      <div className="summary-card flex flex-col gap-5 place-items-center">
        <div className="page-header w-full flex items-center justify-between pb-0 md:pb-5">
          <div className="head">
            <h1 className="title text-[27px] md:text-3xl font-bold">Summary</h1>
            <p className="hidden md:block md:text-base text-muted-foreground font-semibold">
              Overview of your financial tracks.
            </p>
          </div>
          <div>
            <TimeFilterDialog
              filterType={filterType}
              filterMonth={filterMonth}
              filterYear={filterYear}
              startDate={startDate}
              endDate={endDate}
              onFilterChange={handleFilterChange}
              displayText={getFilterDisplayText()}
            />
          </div>
        </div>
        <div className="amount-info w-full grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-0 grid-flow-row items-center justify-between text-foreground">
          <div className="total">
            <div className="text-lg font-bold text-muted-foreground">
              Net Total
            </div>
            <div className="amount flex items-baseline gap-1">
              <div className="text-2xl font-bold tracking-wide">
                {(
                  filteredData.income -
                  filteredData.expense +
                  filteredData.investment +
                  filteredData.savings
                ).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
          <div className="h-2 line flex gap-1 rounded-full box-content">
            {[
              { percent: expensePercent, className: 'bg-expense' },
              { percent: investmentPercent, className: 'bg-investment' },
              { percent: savingsPercent, className: 'bg-savings' },
            ].map((item, index) => (
              <div
                key={index}
                className={`h-full transition-all duration-1000 rounded-full ${item.className} bg-opacity-85`}
                style={{
                  width: `${Math.min(Math.max(item.percent, 2), 100)}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="summary-report font-bold grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 md:grid-cols-4 md:gap-5 mt-5 sm:mt-5">
        {[
          {
            key: 'income',
            title: 'Income',
            amount: filteredData.income,
            percentage: null,
            textClass: 'text-income',
          },
          {
            key: 'expense',
            title: 'Expense',
            amount: filteredData.expense,
            percentage: expensePercent.toFixed(2),
            textClass: 'text-expense',
          },
          {
            key: 'investment',
            title: 'Investment',
            amount: filteredData.investment,
            percentage: investmentPercent.toFixed(2),
            textClass: 'text-investment',
          },
          {
            key: 'savings',
            title: 'Savings',
            amount: filteredData.savings,
            percentage: savingsPercent.toFixed(2),
            textClass: 'text-savings',
          },
        ].map((item) => (
          <div
            key={item.key}
            className={`py-2 px-3 bg-${item.key} bg-opacity-10 border-2 border-${item.key}/20 rounded-xl md:rounded-lg`}
          >
            <div
              className={`text-base mb-1 ${item.textClass} flex items-center justify-between`}
            >
              <div className="title">{item.title}</div>
              {item.percentage && (
                <div className="percentage">{item.percentage}%</div>
              )}
            </div>
            <div className="amount text-xl font-bold text-foreground">
              {item.amount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
