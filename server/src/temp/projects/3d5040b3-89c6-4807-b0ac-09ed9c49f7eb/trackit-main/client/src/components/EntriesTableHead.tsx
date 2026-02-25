import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import AddEntry from './AddEntry';
import ExportDialog from './ExportDialog';
import { useCategoriesStore } from '@/store/categoriesStore';
import { Button } from '@/components/ui/button';
import { Filter, FilterX, CalendarIcon, CheckIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface EntriesTableHeadProps {
  type: string;
  category: string;
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  className?: string;
  // Time filter props
  filterType?: 'all' | 'month' | 'quarter' | 'year' | 'custom';
  filterMonth?: number | null;
  filterYear?: number | null;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  onTimeFilterChange?: (
    type: string,
    month: number | null,
    year: number | null,
    start: Date | undefined,
    end: Date | undefined
  ) => void;
}

export default function EntriesTableHead({
  type,
  category,
  onTypeChange,
  onCategoryChange,
  className = '',
  filterType = 'all',
  filterMonth = null,
  filterYear = null,
  startDate = undefined,
  endDate = undefined,
  onTimeFilterChange,
}: EntriesTableHeadProps) {
  const location = useLocation();
  // Do not show filters on home route (assumes home route path is "/")
  const showFilters = location.pathname !== '/';

  const categories = useCategoriesStore((state) => state.categories);
  const entryTypes = Object.keys(categories);

  const resetFilters = () => {
    // Reset both local state and applied filters
    setLocalType('');
    setLocalCategory('');
    setLocalFilterType('all');
    setLocalFilterMonth(null);
    setLocalFilterYear(null);
    setLocalStartDate(undefined);
    setLocalEndDate(undefined);

    // Apply the reset immediately (for reset button outside dialog)
    onTypeChange('');
    onCategoryChange('');
    onTimeFilterChange?.('all', null, null, undefined, undefined);
  };

  // Local filter state (used when opening the dialog) - for type, category, and time filters
  const [localFilterType, setLocalFilterType] = useState(filterType);
  const [localFilterMonth, setLocalFilterMonth] = useState<number | null>(
    filterMonth
  );
  const [localFilterYear, setLocalFilterYear] = useState<number | null>(
    filterYear
  );
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(
    startDate
  );
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate);
  const [localType, setLocalType] = useState(type);
  const [localCategory, setLocalCategory] = useState(category);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

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

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      // Reset local state to current filter values when opening dialog
      setLocalFilterType(filterType);
      setLocalFilterMonth(filterMonth ?? null);
      setLocalFilterYear(filterYear ?? null);
      setLocalStartDate(startDate ? new Date(startDate) : undefined);
      setLocalEndDate(endDate ? new Date(endDate) : undefined);
      setLocalType(type);
      setLocalCategory(category);
    }
  };

  const applyTimeFilters = () => {
    // Apply all filters (type, category, and time) when Apply button is clicked
    const start = localStartDate ? localStartDate : undefined;
    const end = localEndDate ? localEndDate : undefined;

    // Apply type and category filters
    onTypeChange(localType);
    onCategoryChange(localCategory);

    // Apply time filters
    onTimeFilterChange?.(
      localFilterType,
      localFilterMonth,
      localFilterYear,
      start,
      end
    );
  };

  return (
    <div
      className={`w-full bg-background pb-5 md:py-5 flex items-center justify-between border-none sm:border-b border-border ${className}`}
    >
      <div>
        <div
          className={`title font-bold ${
            location.pathname === '/' ? 'text-2xl' : 'text-[27px] md:text-3xl'
          }`}
        >
          Entries
        </div>
        <div
          className={`text-muted-foreground font-semibold ${
            location.pathname === '/' ? 'text-sm' : 'text-sm md:text-base'
          } ${location.pathname === '/' ? '' : 'hidden sm:block'}`}
        >
          Recent entries in your account
        </div>
      </div>
      <div className="flex gap-3">
        {showFilters && (
          <>
            <ExportDialog />
            <Dialog onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-10 sm:w-fit font-semibold"
                >
                  <Filter className="stroke-[2.5px]" />
                  <span className="hidden sm:block">Filter</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-h-full sm:w-[420px] overflow-auto">
                <DialogHeader className="mb-2">
                  <DialogTitle>Filter Entries</DialogTitle>
                  <DialogDescription>
                    Filter by type, category, and date range
                  </DialogDescription>
                </DialogHeader>
                <Label className="text-sm font-medium block">Type</Label>
                <Select
                  value={localType}
                  onValueChange={(value) => {
                    setLocalType(value);
                    // Reset category when type changes
                    setLocalCategory('');
                  }}
                >
                  <SelectTrigger className="bg-secondary -mt-2">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {entryTypes.map((entryType) => (
                        <SelectItem key={entryType} value={entryType}>
                          {entryType.charAt(0).toUpperCase() +
                            entryType.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {/* Time Filters (Entries page only) */}

                <Label className="text-sm font-medium block">Category</Label>
                <Select
                  value={localCategory}
                  onValueChange={setLocalCategory}
                  disabled={!localType}
                >
                  <SelectTrigger className="bg-secondary -mt-2">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(
                        (categories[
                          localType as keyof typeof categories
                        ] as string[]) || []
                      ).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className="pt-3 border-t border-border">
                  <Label className="text-sm font-medium block mb-2">
                    Select Period
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={
                        localFilterType === 'all' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setLocalFilterType('all')}
                      className="w-full border-[1.5px]"
                    >
                      All
                    </Button>
                    <Button
                      variant={
                        localFilterType === 'month' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        setLocalFilterType('month');
                        setLocalFilterMonth(currentMonth);
                        setLocalFilterYear(currentYear);
                      }}
                      className="w-full border-[1.5px]"
                    >
                      Month
                    </Button>
                    <Button
                      variant={
                        localFilterType === 'quarter' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        setLocalFilterType('quarter');
                        setLocalFilterMonth(
                          Math.floor((currentMonth - 1) / 3) + 1
                        );
                        setLocalFilterYear(currentYear);
                      }}
                      className="w-full border-[1.5px]"
                    >
                      Quarter
                    </Button>
                    <Button
                      variant={
                        localFilterType === 'year' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        setLocalFilterType('year');
                        setLocalFilterYear(currentYear);
                      }}
                      className="w-full border-[1.5px]"
                    >
                      Year
                    </Button>
                    <Button
                      variant={
                        localFilterType === 'custom' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setLocalFilterType('custom')}
                      className="w-full col-span-2 border-[1.5px]"
                    >
                      Custom
                    </Button>
                  </div>

                  {localFilterType === 'month' && (
                    <div className="grid grid-cols-1 gap-2 mt-3">
                      <div>
                        <Label className="text-sm font-medium block mb-1.5">
                          Month
                        </Label>
                        <Select
                          value={localFilterMonth?.toString() || ''}
                          onValueChange={(v) =>
                            setLocalFilterMonth(parseInt(v))
                          }
                        >
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="Select Month" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {monthNames.map((m, idx) => (
                                <SelectItem
                                  key={m}
                                  value={(idx + 1).toString()}
                                >
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium block mb-1.5">
                          Year
                        </Label>
                        <Select
                          value={localFilterYear?.toString() || ''}
                          onValueChange={(v) => setLocalFilterYear(parseInt(v))}
                        >
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {yearOptions.map((y) => (
                                <SelectItem key={y} value={y.toString()}>
                                  {y}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {localFilterType === 'quarter' && (
                    <div className="grid grid-cols-1  gap-2 mt-3">
                      <div>
                        <Label className="text-sm font-medium block mb-1.5">
                          Quarter
                        </Label>
                        <Select
                          value={localFilterMonth?.toString() || ''}
                          onValueChange={(v) =>
                            setLocalFilterMonth(parseInt(v))
                          }
                        >
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="Select Quarter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {[1, 2, 3, 4].map((q) => (
                                <SelectItem key={q} value={q.toString()}>
                                  Q{q}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium block mb-1.5">
                          Year
                        </Label>
                        <Select
                          value={localFilterYear?.toString() || ''}
                          onValueChange={(v) => setLocalFilterYear(parseInt(v))}
                        >
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {yearOptions.map((y) => (
                                <SelectItem key={y} value={y.toString()}>
                                  {y}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {localFilterType === 'year' && (
                    <div className="mt-3">
                      <Label className="text-sm font-medium block mb-1.5">
                        Year
                      </Label>
                      <Select
                        value={localFilterYear?.toString() || ''}
                        onValueChange={(v) => setLocalFilterYear(parseInt(v))}
                      >
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {yearOptions.map((y) => (
                              <SelectItem key={y} value={y.toString()}>
                                {y}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {localFilterType === 'custom' && (
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
                              {localStartDate ? (
                                format(localStartDate, 'PPP')
                              ) : (
                                <span>Start Date</span>
                              )}
                              {localStartDate && (
                                <CheckIcon className="ml-auto h-4 w-4" />
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={localStartDate}
                              onSelect={(date) => {
                                setLocalStartDate(date);
                                setStartDateOpen(false);
                              }}
                              disabled={(date) =>
                                date > currentDate ||
                                (localEndDate ? date > localEndDate : false)
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
                              {localEndDate ? (
                                format(localEndDate, 'PPP')
                              ) : (
                                <span>End Date</span>
                              )}
                              {localEndDate && (
                                <CheckIcon className="ml-auto h-4 w-4" />
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={localEndDate}
                              onSelect={(date) => {
                                setLocalEndDate(date);
                                setEndDateOpen(false);
                              }}
                              disabled={(date) =>
                                date > currentDate ||
                                (localStartDate ? date < localStartDate : false)
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="secondary"
                  type="button"
                  className="w-full mt-4 font-semibold"
                  onClick={() => {
                    // Reset local state in dialog (not applied until Apply is clicked)
                    setLocalType('');
                    setLocalCategory('');
                    setLocalFilterType('all');
                    setLocalFilterMonth(null);
                    setLocalFilterYear(null);
                    setLocalStartDate(undefined);
                    setLocalEndDate(undefined);
                  }}
                >
                  Reset
                </Button>
                <DialogClose asChild>
                  <Button
                    className="w-full font-semibold"
                    onClick={applyTimeFilters}
                  >
                    Apply
                  </Button>
                </DialogClose>
              </DialogContent>
            </Dialog>

            <Button
              onClick={resetFilters}
              className="btn btn-secondary w-10 sm:w-fit font-semibold"
              type="button"
              variant="secondary"
            >
              <FilterX />
              <span className="hidden sm:block">Reset</span>
            </Button>
          </>
        )}
        <AddEntry />
      </div>
    </div>
  );
}
