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
import { FilterIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';

export type BudgetPeriod =
  | 'all'
  | 'monthly'
  | 'quarterly'
  | 'half-yearly'
  | 'yearly';

type BudgetTimePeriodFilterDialogProps = {
  selectedPeriod: BudgetPeriod;
  onPeriodChange: (period: BudgetPeriod) => void;
  displayText?: string;
};

export default function BudgetTimePeriodFilterDialog({
  selectedPeriod,
  onPeriodChange,
  displayText,
}: BudgetTimePeriodFilterDialogProps) {
  const [localPeriod, setLocalPeriod] = useState<BudgetPeriod>(selectedPeriod);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const periodOptions: { value: BudgetPeriod; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'half-yearly', label: 'Half-yearly' },
  ];

  // Get display text for the button
  const getDisplayText = () => {
    if (displayText) return displayText;
    const option = periodOptions.find((opt) => opt.value === selectedPeriod);
    return option ? option.label : 'Select Period';
  };

  // Apply the period and close the dialog
  const applyPeriod = () => {
    onPeriodChange(localPeriod);
    setIsDialogOpen(false);
  };

  // Reset local state when dialog opens
  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      // Reset local state to current period value
      setLocalPeriod(selectedPeriod);
    }
    setIsDialogOpen(open);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4" />
          {getDisplayText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-h-[90vh] sm:w-[400px] overflow-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl">Budget Period</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select a budget period to filter your budgets
          </p>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium block mb-3">
              Select Period
            </Label>
            {/* if half yearly than have colspan 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {periodOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={localPeriod === option.value ? 'default' : 'outline'}
                  className={`w-full border-[1.5px] ${option.value === 'half-yearly' ? 'col-span-2' : ''
                    }`}
                  onClick={() => setLocalPeriod(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <DialogClose asChild>
            <Button
              onClick={applyPeriod}
              className="px-4 bg-primary w-full text-primary-foreground hover:bg-primary/90 border-[1.5px] border-primary font-semibold mt-3"
            >
              Apply
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
