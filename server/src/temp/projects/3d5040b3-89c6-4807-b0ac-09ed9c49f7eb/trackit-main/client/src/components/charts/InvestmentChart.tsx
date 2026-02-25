'use client';

import { Pie, PieChart, CartesianGrid, Line, LineChart, XAxis } from 'recharts';
import { useCategoriesStore } from '@/store/categoriesStore';
import { useEntriesStore } from '@/store/entriesStore';
import { useMemo } from 'react';

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const baseColor = '#2196F3';

type InvestmentChartProps = {
  filterType?: string;
  filterMonth?: number | null;
  filterYear?: number | null;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
};

export function InvestmentChart({
  filterType = 'all',
  filterMonth = null,
  filterYear = null,
  startDate = undefined,
  endDate = undefined,
}: InvestmentChartProps = {}) {
  const categories = useCategoriesStore((state) => state.categories.investment);
  const allEntries = useEntriesStore((state) => state.entries);

  const entries = useMemo(() => {
    let filteredEntries = allEntries.filter(
      (entry) => entry.type === 'investment'
    );

    if (filterType === 'all') {
      return filteredEntries;
    }

    // Apply time-based filtering
    filteredEntries = filteredEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      const entryMonth = entryDate.getMonth() + 1; // 1-12
      const entryYear = entryDate.getFullYear();

      if (filterType === 'month' && filterMonth && filterYear) {
        return entryMonth === filterMonth && entryYear === filterYear;
      } else if (filterType === 'year' && filterYear) {
        return entryYear === filterYear;
      } else if (filterType === 'custom' && startDate && endDate) {
        return entryDate >= startDate && entryDate <= endDate;
      } else if (filterType === 'quarter' && filterMonth && filterYear) {
        // Calculate quarter (1-4) from month
        const quarter = Math.floor((entryMonth - 1) / 3) + 1;
        return quarter === filterMonth && entryYear === filterYear;
      }
      return true;
    });

    return filteredEntries;
  }, [allEntries, filterType, filterMonth, filterYear, startDate, endDate]);

  const totalInvestment = useMemo(
    () => entries.reduce((acc, entry) => acc + entry.amount, 0),
    [entries]
  );

  const totalInvestmentByCategory = useMemo(
    () =>
      categories
        .map((category) => {
          const total = entries
            .filter((entry) => entry.category === category)
            .reduce((acc, entry) => acc + entry.amount, 0);
          const percentage =
            totalInvestment > 0
              ? ((total / totalInvestment) * 100).toFixed(1)
              : '0.0';
          return {
            category,
            total: total.toFixed(2),
            percentage,
          };
        })
        .sort((a, b) => Number(b.total) - Number(a.total)),
    [categories, entries, totalInvestment]
  );

  const chartData = useMemo(
    () =>
      totalInvestmentByCategory.reduce((acc, category, index) => {
        if (index < 4) {
          const opacity = Math.round((255 * (100 - index * 15)) / 100);
          const opacityHex = opacity.toString(16).padStart(2, '0');
          acc.push({
            category:
              category.category.charAt(0).toUpperCase() +
              category.category.slice(1),
            fill: `${baseColor}${opacityHex}`,
            total: Number(category.total),
          });
        } else if (index === 4) {
          const otherTotal = totalInvestmentByCategory
            .slice(4)
            .reduce((sum, cat) => sum + Number(cat.total), 0);
          const opacity = Math.round((255 * (100 - index * 15)) / 100);
          const opacityHex = opacity.toString(16).padStart(2, '0');
          acc.push({
            category: 'Other Categories',
            total: otherTotal,
            fill: `${baseColor}${opacityHex}`,
          });
        }
        return acc;
      }, [] as { category: string; total: number; fill?: string }[]),
    [totalInvestmentByCategory]
  );

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    categories.forEach((category) => {
      config[category] = {
        label: category,
      };
    });
    return config;
  }, [categories]);

  const lineChartConfig = useMemo(() => {
    const config: ChartConfig = {
      date: { label: 'Date', color: baseColor },
      total: { label: 'Investment' },
    };
    return config;
  }, []);

  // Line chart data processing
  const lineChartData = useMemo(() => {
    const dailyInvestment = entries.reduce((acc, entry) => {
      const date = new Date(entry.date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, total: 0 };
      }
      acc[date].total += entry.amount;
      return acc;
    }, {} as Record<string, { date: string; total: number }>);

    // Convert to array and sort by date
    return Object.values(dailyInvestment).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [entries]);

  const totalLineChart = useMemo(
    () => lineChartData.reduce((acc, curr) => acc + curr.total, 0),
    [lineChartData]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="chart-container bg-investment/5 border-2 border-investment/20 flex flex-col items-center justify-center rounded-xl p-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Investment Distribution</h2>
            <p className="text-sm font-semibold text-muted-foreground">
              A breakdown of your investments by category
            </p>
          </div>
          <ChartContainer
            config={chartConfig}
            className="min-h-[260px] sm:max-h-[250px] w-full sm:w-fit flex-1 flex-shrink-0"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie data={chartData} dataKey="total" nameKey="category" />
            </PieChart>
          </ChartContainer>
          <div className="text-center mt-4 text-xs text-muted-foreground">
            Data is based on your recorded investment entries
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex gap-4 overflow-hidden bg-investment/5 border-2 border-investment/20 rounded-xl p-4">
            <div className="bg-investment w-1.5 rounded-full"></div>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-muted-foreground">
                Total Investment
              </div>
              <div className="text-2xl font-bold tracking-wide">
                {totalInvestment.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          <div className="entries-list flex flex-col gap-2 mt-4 max-h-[300px] overflow-auto table-container p-2 border-2 border-investment/25 rounded-xl">
            {totalInvestmentByCategory.map((item) => (
              <div
                key={item.category}
                className="grid grid-cols-[60%_40%] md:grid-cols-[50%_25%_25%] items-center text-sm p-2 pr-4 bg-secondary rounded-md"
              >
                <div className="capitalize font-semibold flex items-center gap-3">
                  <div className="h-6 w-1 rounded-full bg-investment flex-shrink-0"></div>
                  {item.category}
                </div>
                <div className="text-right font-semibold">
                  {Number(item.total).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-right hidden md:block text-muted-foreground font-semibold">
                  {item.percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
        <Card className="py-4 md:col-span-2 sm:py-0 rounded-xl border-investment/20 bg-investment/5 border-2">
          <CardHeader className="flex flex-col items-stretch px-3.5 py-2.5 sm:flex-row">
            <div className="flex-1 p-4">
              <CardTitle className="text-lg text-foreground font-bold">
                Investment Over Time
              </CardTitle>
              <CardDescription className="text-sm font-semibold text-muted-foreground">
                Track your investment trends over time
                {totalLineChart > 0
                  ? ` - Total: ${totalLineChart.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}`
                  : ''}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <ChartContainer
              config={lineChartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <LineChart
                accessibilityLayer
                data={lineChartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      }}
                    />
                  }
                />
                <Line
                  dataKey="total"
                  type="monotone"
                  strokeWidth={3}
                  stroke={baseColor}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
