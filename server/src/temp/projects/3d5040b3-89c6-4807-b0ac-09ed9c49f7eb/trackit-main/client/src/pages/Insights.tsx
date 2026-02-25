import { IncomeChart } from '../components/charts/IncomeChart';
import { ExpenseChart } from '../components/charts/ExpenseChart';
import { InvestmentChart } from '@/components/charts/InvestmentChart';
import { SavingsChart } from '@/components/charts/SavingsChart';
import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Adjust import path as needed
import { Label } from '@/components/ui/label'; // Adjust import path as needed
import { cn } from '@/lib/utils';
import TimeFilterDialog from '@/components/TimeFilterDialog';

export default function Insights() {
  const [selectedChart, setSelectedChart] = useState('Income');

  // Time filter state
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();
  const [filterType, setFilterType] = useState('month');
  const [filterMonth, setFilterMonth] = useState<number | null>(currentMonth);
  const [filterYear, setFilterYear] = useState<number | null>(currentYear);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const chartOptions = [
    {
      label: 'Income',
      component: (
        <IncomeChart
          filterType={filterType}
          filterMonth={filterMonth}
          filterYear={filterYear}
          startDate={startDate}
          endDate={endDate}
        />
      ),
    },
    {
      label: 'Expense',
      component: (
        <ExpenseChart
          filterType={filterType}
          filterMonth={filterMonth}
          filterYear={filterYear}
          startDate={startDate}
          endDate={endDate}
        />
      ),
    },
    {
      label: 'Savings',
      component: (
        <SavingsChart
          filterType={filterType}
          filterMonth={filterMonth}
          filterYear={filterYear}
          startDate={startDate}
          endDate={endDate}
        />
      ),
    },
    {
      label: 'Investment',
      component: (
        <InvestmentChart
          filterType={filterType}
          filterMonth={filterMonth}
          filterYear={filterYear}
          startDate={startDate}
          endDate={endDate}
        />
      ),
    },
  ];

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
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full h-full gap-10 items-center justify-center py-5 md:py-10">
        <div className="page-header w-full flex items-center justify-between pb-5">
          <div className="head">
            <h1 className="title text-[27px] md:text-3xl font-bold">
              Insights
            </h1>
            <p className="hidden md:block md:text-base text-muted-foreground font-semibold">
              Gain insights into your financial habits.
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
        <div className="charts-container flex flex-col gap-6 w-full">
          <div className="w-full overflow-x-auto page">
            <RadioGroup
              onValueChange={(value) => setSelectedChart(value)}
              className="flex gap-2 md:grid w-[400px] md:w-full grid-cols-4 gap-2 md:gap-4 font-semibold"
              value={selectedChart}
            >
              {chartOptions.map((option) => (
                <Label
                  key={option.label}
                  htmlFor={option.label}
                  className={cn(
                    `flex font-bold items-center justify-center rounded-md border-2 py-2 px-4 text-sm md:text-base cursor-pointer text-${option.label.toLowerCase()}`,
                    selectedChart === option.label &&
                      `bg-${option.label.toLowerCase()}/10 border-${option.label.toLowerCase()}/20 transition-all duration-75`
                  )}
                >
                  <RadioGroupItem
                    value={option.label}
                    id={option.label}
                    className="sr-only"
                  />
                  {option.label}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="chart-display">
            {
              chartOptions.find((option) => option.label === selectedChart)
                ?.component
            }
          </div>
        </div>
      </div>
    </div>
  );
}
