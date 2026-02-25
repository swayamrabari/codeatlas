import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategoriesStore } from '@/store/categoriesStore';
import { useEntriesStore } from '@/store/entriesStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function ExportDialog({ inSidebar = false }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');

  // Time filters
  const [timeFilterType, setTimeFilterType] = useState<
    'all' | 'month' | 'quarter' | 'year' | 'custom'
  >('all');
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const { categories } = useCategoriesStore();
  const { entries } = useEntriesStore();
  const entryTypes = Object.keys(categories);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const yearOptions = Array.from(
    { length: currentYear - 2019 },
    (_, i) => 2020 + i
  ).reverse();
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset filters on open
      setType('all');
      setCategory('all');
      setTimeFilterType('all');
      setMonth(currentMonth);
      setYear(currentYear);
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  const handleExport = () => {
    let filtered = entries;

    if (type !== 'all') {
      filtered = filtered.filter((e) => e.type === type);
    }

    if (category !== 'all') {
      filtered = filtered.filter((e) => e.category === category);
    }

    if (timeFilterType !== 'all') {
      if (timeFilterType === 'month' && month && year) {
        filtered = filtered.filter((e) => {
          const d = new Date(e.date);
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        });
      } else if (timeFilterType === 'quarter' && month && year) {
        filtered = filtered.filter((e) => {
          const d = new Date(e.date);
          const q = Math.floor(d.getMonth() / 3) + 1;
          return q === month && d.getFullYear() === year;
        });
      } else if (timeFilterType === 'year' && year) {
        filtered = filtered.filter(
          (e) => new Date(e.date).getFullYear() === year
        );
      } else if (timeFilterType === 'custom' && startDate && endDate) {
        filtered = filtered.filter((e) => {
          const d = new Date(e.date);
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return d >= start && d <= end;
        });
      }
    }

    // Sort by date desc
    filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const headers = ['Date', 'Type', 'Category', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...filtered.map((e) => {
        const date = format(new Date(e.date), 'yyyy-MM-dd');
        return `${date},${e.type},${e.category},${e.amount}`;
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `trackit_export_${format(new Date(), 'yyyy-MM-dd')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {inSidebar ? (
        <DialogTrigger asChild>
          <div className="transition-all font-medium w-full flex gap-2 hover:bg-secondary cursor-pointer items-center justify-start px-2.5 py-2 rounded-md text-foreground">
            <Upload className="h-[20px]" />
            <span className="text-base">Export Entries</span>
          </div>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="secondary" className="w-10 sm:w-fit font-semibold">
            <Upload className="stroke-[2.5px]" />
            <span className="hidden sm:block">Export</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-full max-h-full sm:w-[420px] overflow-auto">
        <DialogHeader className="mb-2">
          <DialogTitle>Export Entries</DialogTitle>
          <DialogDescription>
            Download your entries as a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium block mb-1.5">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v);
                setCategory('all');
              }}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  {entryTypes.map((etype) => (
                    <SelectItem key={etype} value={etype}>
                      {etype.charAt(0).toUpperCase() + etype.slice(1)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium block mb-1.5">Category</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={type === 'all'}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  {type !== 'all' &&
                    categories[type as keyof typeof categories].map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-3 border-t border-border">
            <Label className="text-sm font-medium block mb-2">
              Select Period
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={timeFilterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilterType('all')}
                className="w-full border-[1.5px]"
              >
                All
              </Button>
              <Button
                variant={timeFilterType === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTimeFilterType('month');
                  setMonth(currentMonth);
                  setYear(currentYear);
                }}
                className="w-full border-[1.5px]"
              >
                Month
              </Button>
              <Button
                variant={timeFilterType === 'quarter' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTimeFilterType('quarter');
                  setMonth(Math.floor((currentMonth - 1) / 3) + 1);
                  setYear(currentYear);
                }}
                className="w-full border-[1.5px]"
              >
                Quarter
              </Button>
              <Button
                variant={timeFilterType === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTimeFilterType('year');
                  setYear(currentYear);
                }}
                className="w-full border-[1.5px]"
              >
                Year
              </Button>
              <Button
                variant={timeFilterType === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilterType('custom')}
                className="w-full col-span-2 border-[1.5px]"
              >
                Custom
              </Button>
            </div>

            {timeFilterType === 'month' && (
              <div className="grid grid-cols-1 gap-2 mt-3">
                <div>
                  <Label className="text-sm font-medium block mb-1.5">
                    Month
                  </Label>
                  <Select
                    value={month?.toString()}
                    onValueChange={(v) => setMonth(parseInt(v))}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium block mb-1.5">
                    Year
                  </Label>
                  <Select
                    value={year?.toString()}
                    onValueChange={(v) => setYear(parseInt(v))}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {timeFilterType === 'quarter' && (
              <div className="grid grid-cols-1 gap-2 mt-3">
                <div>
                  <Label className="text-sm font-medium block mb-1.5">
                    Quarter
                  </Label>
                  <Select
                    value={month?.toString()}
                    onValueChange={(v) => setMonth(parseInt(v))}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((q) => (
                        <SelectItem key={q} value={q.toString()}>
                          Q{q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium block mb-1.5">
                    Year
                  </Label>
                  <Select
                    value={year?.toString()}
                    onValueChange={(v) => setYear(parseInt(v))}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {timeFilterType === 'year' && (
              <div className="mt-3">
                <Label className="text-sm font-medium block mb-1.5">Year</Label>
                <Select
                  value={year?.toString()}
                  onValueChange={(v) => setYear(parseInt(v))}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {timeFilterType === 'custom' && (
              <div className="grid grid-cols-1 gap-2 mt-3">
                <div>
                  <Label className="text-sm font-medium block mb-1.5">
                    Start Date
                  </Label>
                  <Popover
                    modal={true}
                    open={startDateOpen}
                    onOpenChange={setStartDateOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="secondary"
                        className="justify-start text-left font-semibold w-full flex items-center"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? (
                          format(startDate, 'PPP')
                        ) : (
                          <span>Start Date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          setStartDate(d);
                          setStartDateOpen(false);
                        }}
                        disabled={(d) =>
                          d > currentDate || (endDate ? d > endDate : false)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm font-medium block mb-1.5">
                    End Date
                  </Label>
                  <Popover
                    modal={true}
                    open={endDateOpen}
                    onOpenChange={setEndDateOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="secondary"
                        className="justify-start text-left font-semibold w-full flex items-center"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? (
                          format(endDate, 'PPP')
                        ) : (
                          <span>End Date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          setEndDate(d);
                          setEndDateOpen(false);
                        }}
                        disabled={(d) =>
                          d > currentDate || (startDate ? d < startDate : false)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          <Button className="w-full font-semibold" onClick={handleExport}>
            Download CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
