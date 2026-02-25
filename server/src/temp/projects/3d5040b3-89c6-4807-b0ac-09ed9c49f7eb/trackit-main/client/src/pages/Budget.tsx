import { useMemo, useState } from 'react';
import {
  useBudgetStore,
  calculateBudgetProgress,
  Budget,
} from '@/store/budgetStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pencil, Trash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { EditBudgetDialog } from '@/components/budget/EditBudgetDialog';
import AddBudgetDialog from '@/components/budget/AddBudgetDialog';
import BudgetTimePeriodFilterDialog, {
  BudgetPeriod,
} from '@/components/budget/BudgetTimePeriodFilterDialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function BudgetCard({
  budget,
  onRemove,
  onEdit,
}: {
  budget: Budget;
  onRemove: (id: string) => void;
  onEdit: (budget: Budget) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { currentSpending, progress, remaining } =
    calculateBudgetProgress(budget);

  // Determine status based on budget type and percentage
  const getStatusInfo = () => {
    if (budget.type === 'expense') {
      if (progress < 70) {
        return {
          label: 'Safe',
          color: 'bg-income',
          textColor: 'text-income',
        };
      } else if (progress < 90) {
        return {
          label: 'Warning',
          color: 'bg-savings',
          textColor: 'text-savings',
        };
      } else {
        return {
          label: 'Critical',
          color: 'bg-expense',
          textColor: 'text-expense',
        };
      }
    } else {
      // For savings and investment
      if (progress < 30) {
        return {
          label: 'Behind Target',
          color: 'bg-expense',
          textColor: 'text-expense',
        };
      } else if (progress < 70) {
        return {
          label: 'Progressing',
          color: 'bg-savings',
          textColor: 'text-savings',
        };
      } else {
        return {
          label: 'On Track',
          color: 'bg-income',
          textColor: 'text-income',
        };
      }
    }
  };

  const status = getStatusInfo();

  return (
    <div className="flex bg-accent/30 items-center gap-6 rounded-xl px-5 py-4 border-2 border-border shadow-md transition-all hover:shadow-lg relative">
      <div className="flex-1 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-xl md:text-xl capitalize">
            {budget.category}
          </span>
        </div>
        <div className="flex items-center gap-2 *:rounded-md *:px-2.5 *:py-1 *:text-xs *:font-semibold">
          <div
            className={`${
              status.textColor
            } bg-opacity-15 ${status.color.replace(
              'bg-',
              'bg-opacity-10 bg-'
            )}`}
          >
            {status.label}
          </div>
          <div className="text-foreground/80 bg-muted capitalize">
            {budget.period}
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-semibold text-primary">
            {currentSpending.toLocaleString('en-IN')}
          </span>
          <span className="text-base text-muted-foreground font-semibold">
            / {budget.amount.toLocaleString('en-IN')}
          </span>
        </div>
        <Progress value={progress} className="h-2 mt-1" />
        <div className="flex justify-between text-sm mt-1 font-semibold">
          <span className="text-muted-foreground">
            Remaining: <span>{remaining.toLocaleString('en-IN')}</span>
          </span>
          <span>{progress}% Spent</span>
        </div>
      </div>

      {/* Edit and Delete Buttons */}
      <div className="flex absolute top-3 right-3 gap-2">
        <button
          className="h-9 w-9 flex items-center justify-center rounded-md bg-muted hover:bg-primary/10 text-primary transition"
          onClick={() => onEdit(budget)}
          aria-label="Edit Budget"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          className="h-9 w-9 flex items-center justify-center rounded-md bg-expense/15 hover:bg-expense/20 text-expense/80 transition"
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete Budget"
        >
          <Trash className="h-[18px]" />
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold capitalize">
                {budget.category}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onRemove(budget.id);
                setConfirmOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BudgetPage() {
  const budgets = useBudgetStore((s) => s.budgets);
  const addBudget = useBudgetStore((s) => s.addBudget);
  const removeBudget = useBudgetStore((s) => s.removeBudget);
  const updateBudget = useBudgetStore((s) => s.updateBudget);

  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<Budget['type']>('expense');
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod>('all');

  // Helper function to get type-specific classes
  const getTypeClasses = (type: Budget['type']) => {
    const classMap: Record<
      Budget['type'],
      {
        text: string;
        bg: string;
        border: string;
        bgOpacity: string;
        borderOpacity: string;
        bgCard: string;
        borderCard: string;
      }
    > = {
      expense: {
        text: 'text-expense',
        bg: 'bg-expense',
        border: 'border-expense',
        bgOpacity: 'bg-expense/10',
        borderOpacity: 'border-expense/20',
        bgCard: 'bg-expense/5',
        borderCard: 'border-expense/20',
      },
      savings: {
        text: 'text-savings',
        bg: 'bg-savings',
        border: 'border-savings',
        bgOpacity: 'bg-savings/10',
        borderOpacity: 'border-savings/20',
        bgCard: 'bg-savings/5',
        borderCard: 'border-savings/20',
      },
      investment: {
        text: 'text-investment',
        bg: 'bg-investment',
        border: 'border-investment',
        bgOpacity: 'bg-investment/10',
        borderOpacity: 'border-investment/20',
        bgCard: 'bg-investment/5',
        borderCard: 'border-investment/20',
      },
    };
    return classMap[type];
  };

  const handleEditBudget = (budget: Budget) => {
    setEditBudget(budget);
    setEditDialogOpen(true);
  };

  // Map budget period to filter period
  const mapBudgetPeriodToFilterPeriod = (period: string): BudgetPeriod => {
    if (period === 'monthly') return 'monthly';
    if (period === 'quarterly') return 'quarterly';
    if (period === 'half-yearly') return 'half-yearly';
    if (period === 'yearly') return 'yearly';
    return 'all';
  };

  // Filter budgets by selected type and period
  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const typeMatch = budget.type === selectedType;
      const periodMatch =
        selectedPeriod === 'all' ||
        mapBudgetPeriodToFilterPeriod(budget.period) === selectedPeriod;
      return typeMatch && periodMatch;
    });
  }, [budgets, selectedType, selectedPeriod]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full h-full gap-10 items-center justify-center py-5 md:py-10">
        <div className="page-header flex items-center justify-between pb-5">
          <div>
            <h1 className="title text-[27px] md:text-3xl font-bold">Budgets</h1>
            <p className="hidden md:block md:text-base text-muted-foreground font-semibold">
              Manage your budgets and track your spending
            </p>
          </div>
          <div className="flex items-center gap-3">
            <BudgetTimePeriodFilterDialog
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />
            <AddBudgetDialog onAdd={addBudget} />
          </div>
        </div>

        {/* Tabbed interface for transaction types */}
        <div className="w-full mb-6">
          <RadioGroup
            onValueChange={(value) => setSelectedType(value as Budget['type'])}
            className="grid grid-cols-3 gap-2 md:gap-4 font-semibold"
            value={selectedType}
          >
            {(['expense', 'savings', 'investment'] as Budget['type'][]).map(
              (type) => {
                const typeClasses = getTypeClasses(type);
                return (
                  <Label
                    key={type}
                    htmlFor={type}
                    className={cn(
                      'flex font-bold items-center justify-center rounded-md border-2 py-2 text-sm md:text-base cursor-pointer',
                      typeClasses.text,
                      selectedType === type &&
                        `${typeClasses.bgOpacity} ${typeClasses.borderOpacity} transition-all duration-75`
                    )}
                  >
                    <RadioGroupItem
                      value={type}
                      id={type}
                      className="sr-only"
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Label>
                );
              }
            )}
          </RadioGroup>
        </div>

        {/* Budgets list for selected type */}
        <div className="flex flex-col gap-10">
          {filteredBudgets.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 text-lg font-medium">
              No {selectedType} budgets yet.
            </div>
          ) : (
            <div className="budget-group">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredBudgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onRemove={removeBudget}
                    onEdit={handleEditBudget}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Budget Dialog */}
      <EditBudgetDialog
        budget={editBudget}
        onUpdate={updateBudget}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
