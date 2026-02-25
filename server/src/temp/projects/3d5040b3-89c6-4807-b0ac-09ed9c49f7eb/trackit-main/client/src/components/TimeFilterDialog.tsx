import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FilterIcon, CheckIcon, CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';

type TimeFilterDialogProps = {
  filterType: string;
  filterMonth: number | null;
  filterYear: number | null;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onFilterChange: (
    type: string,
    month: number | null,
    year: number | null,
    start: Date | undefined,
    end: Date | undefined
  ) => void;
  displayText: string;
};

export default function TimeFilterDialog({
  filterType,
  filterMonth,
  filterYear,
  startDate,
  endDate,
  onFilterChange,
  displayText,
}: TimeFilterDialogProps) {
  // Local state for the dialog
  const [localFilterType, setLocalFilterType] = useState(filterType);
  const [localFilterMonth, setLocalFilterMonth] = useState(filterMonth);
  const [localFilterYear, setLocalFilterYear] = useState(filterYear);
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(
    startDate
  );
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get current date for validation
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  // Generate year options (from 2020 to current year)
  const yearOptions = Array.from(
    { length: currentYear - 2019 },
    (_, i) => 2020 + i
  );

  // Month names for dropdown
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

  // Check if a month should be disabled based on the selected year
  const isMonthDisabled = (month: number) => {
    if (localFilterYear === currentYear) {
      return month > currentMonth;
    }
    return false;
  };

  const handleFilterTypeChange = (type: string) => {
    setLocalFilterType(type);

    if (type === 'month') {
      setLocalFilterMonth(currentMonth);
      setLocalFilterYear(currentYear);
    } else if (type === 'quarter') {
      const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;
      setLocalFilterMonth(currentQuarter);
      setLocalFilterYear(currentYear);
    } else if (type === 'year') {
      setLocalFilterYear(currentYear);
    } else {
      setLocalFilterMonth(null);
      setLocalFilterYear(null);
      setLocalStartDate(undefined);
      setLocalEndDate(undefined);
    }
  };

  // Check if the filter is complete and can be applied
  const isFilterComplete = () => {
    if (localFilterType === 'all') return true;
    if (localFilterType === 'month' && localFilterMonth && localFilterYear)
      return true;
    if (localFilterType === 'quarter' && localFilterMonth && localFilterYear)
      return true;
    if (localFilterType === 'year' && localFilterYear) return true;
    if (localFilterType === 'custom' && localStartDate && localEndDate)
      return true;
    return false;
  };

  // Apply the filter and close the dialog
  const applyFilter = () => {
    onFilterChange(
      localFilterType,
      localFilterMonth,
      localFilterYear,
      localStartDate,
      localEndDate
    );
    setIsDialogOpen(false);
  };

  // Reset local state when dialog opens
  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      // Reset local state to current filter values
      setLocalFilterType(filterType);
      setLocalFilterMonth(filterMonth);
      setLocalFilterYear(filterYear);
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
    }
    setIsDialogOpen(open);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4" />
          {displayText}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-h-[90vh] sm:w-[400px] overflow-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl">Time Range</DialogTitle>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            Select a time period to view your financial data
          </p>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium block mb-3">
              Select Period
            </Label>

            {/* Filter Type Selector */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={localFilterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterTypeChange('all')}
                className="w-full border-[1.5px]"
              >
                All
              </Button>
              <Button
                variant={localFilterType === 'month' ? 'default' : 'outline'}
                size="sm" 
                onClick={() => handleFilterTypeChange('month')}
                className="w-full border-[1.5px]"
              >
                Month
              </Button>
              <Button
                variant={localFilterType === 'quarter' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterTypeChange('quarter')}
                className="w-full border-[1.5px]"
              >
                Quarter
              </Button>
              <Button
                variant={localFilterType === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterTypeChange('year')}
                className="w-full border-[1.5px]"
              >
                Year
              </Button>
              <Button
                variant={localFilterType === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterTypeChange('custom')}
                className="w-full col-span-2 border-[1.5px]"
              >
                Custom Range
              </Button>
            </div>
          </div>

          {/* Filter form - separated with border */}
          {localFilterType !== 'all' && (
            <div className="pt-3 border-t-[1.5px] border-border">
              {/* Month & Year selectors for Monthly filter */}
              {localFilterType === 'month' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium block mb-1.5">
                      Month
                    </Label>
                    <Select
                      value={localFilterMonth?.toString() || ''}
                      onValueChange={(value) =>
                        setLocalFilterMonth(parseInt(value) || null)
                      }
                    >
                      <SelectTrigger className="bg-secondary border-none capitalize">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {monthNames.map((month, index) => (
                            <SelectItem
                              key={month}
                              value={(index + 1).toString()}
                              disabled={
                                localFilterYear === currentYear &&
                                isMonthDisabled(index + 1)
                              }
                            >
                              {month}
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
                      onValueChange={(value) =>
                        setLocalFilterYear(parseInt(value) || null)
                      }
                    >
                      <SelectTrigger className="bg-secondary border-none capitalize">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {yearOptions
                            .slice()
                            .reverse()
                            .map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Quarter & Year selectors for Quarterly filter */}
              {localFilterType === 'quarter' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium block mb-1.5">
                      Quarter
                    </Label>
                    <Select
                      value={localFilterMonth?.toString() || ''}
                      onValueChange={(value) =>
                        setLocalFilterMonth(parseInt(value) || null)
                      }
                    >
                      <SelectTrigger className="bg-secondary border-none capitalize">
                        <SelectValue placeholder="Select Quarter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {[1, 2, 3, 4].map((quarter) => (
                            <SelectItem
                              key={quarter}
                              value={quarter.toString()}
                              disabled={
                                localFilterYear === currentYear &&
                                quarter > Math.floor((currentMonth - 1) / 3) + 1
                              }
                            >
                              Q{quarter}
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
                      onValueChange={(value) =>
                        setLocalFilterYear(parseInt(value) || null)
                      }
                    >
                      <SelectTrigger className="bg-secondary border-none capitalize">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {yearOptions
                            .slice()
                            .reverse()
                            .map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Year selector for Yearly filter */}
              {localFilterType === 'year' && (
                <div>
                  <Label className="text-sm font-medium block mb-1.5">
                    Year
                  </Label>
                  <Select
                    value={localFilterYear?.toString() || ''}
                    onValueChange={(value) =>
                      setLocalFilterYear(parseInt(value) || null)
                    }
                  >
                    <SelectTrigger className="bg-secondary border-none capitalize">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {yearOptions
                          .slice()
                          .reverse()
                          .map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date range selector for Custom filter */}
              {localFilterType === 'custom' && (
                <div className="space-y-4">
                  {/* Start Date Picker */}
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

                  {/* End Date Picker */}
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
          )}

          {/* Apply Button */}
          <DialogClose asChild>
            <Button
              disabled={!isFilterComplete()}
              onClick={applyFilter}
              className="px-4 bg-primary w-full text-primary-foreground hover:bg-primary/90 border-[1.5px] border-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-3"
            >
              Apply Time Range
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

