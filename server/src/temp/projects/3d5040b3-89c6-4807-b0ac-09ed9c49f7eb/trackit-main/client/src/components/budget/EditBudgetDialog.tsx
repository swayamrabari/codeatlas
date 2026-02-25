import React, { useState, useEffect } from 'react';
import { Budget } from '@/store/budgetStore';
import { useCategoriesStore } from '@/store/categoriesStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const periodOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const typeOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
];

export function EditBudgetDialog({
  budget,
  onUpdate,
  open,
  onOpenChange,
}: {
  budget: Budget | null;
  onUpdate: (id: string, updatedBudget: Partial<Budget>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = useState<Budget['type']>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<Budget['period']>('monthly');
  const categories = useCategoriesStore(
    (s) => s.categories[type as keyof typeof s.categories] || []
  );

  // Initialize form when budget changes
  useEffect(() => {
    if (budget) {
      setType(budget.type);
      setCategory(budget.category);
      setAmount(budget.amount.toString());
      setPeriod(budget.period);
    }
  }, [budget]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!budget || !category || !amount) return;

    onUpdate(budget.id, {
      type,
      category,
      amount: Number(amount),
      period,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-h-full sm:w-[520px] overflow-auto">
        <DialogHeader className="mb-2">
          <DialogTitle>Edit Budget</DialogTitle>
          <DialogDescription>
            Make changes to your budget here.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <Input
            type="number"
            min={0}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="num-inp caret-muted-foreground h-fit text-4xl appearance-none border-2 focus:outline-none tracking-wide"
            required
          />
          <div className="flex flex-col gap-3">
            <Label className="mt-3 font-semibold">Select Budget Type</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => {
                setType(value as Budget['type']);
                setCategory('');
              }}
              className="flex flex-col sm:flex-row gap-2 font-semibold"
            >
              {typeOptions.map((opt) => {
                const uniqueId = `edit-dialog-budget-type-${opt.value}`;
                return (
                  <Label
                    key={opt.value}
                    htmlFor={uniqueId}
                    className={cn(
                      `flex flex-1 font-bold items-center justify-center rounded-md border-[1.5px] min-h-10 text-${opt.value}`,
                      type === opt.value &&
                        `bg-${opt.value}/10 border-${opt.value} transition-all duration-75`
                    )}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={uniqueId}
                      className="sr-only"
                    />
                    {opt.label}
                  </Label>
                );
              })}
            </RadioGroup>
          </div>
          <Label className="mt-3 font-semibold">Select Category</Label>
          <Select value={category} onValueChange={setCategory} disabled={!type}>
            <SelectTrigger className="bg-secondary border-none capitalize">
              <SelectValue
                placeholder="Select Category"
                className="w-full text-left"
              />
            </SelectTrigger>
            <SelectContent>
              {(categories || []).map((cat: string) => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="mt-3 font-semibold">Select Period</Label>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as Budget['period'])}
          >
            <SelectTrigger className="bg-secondary border-none capitalize">
              <SelectValue placeholder="Period" className="w-full text-left" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="font-semibold mt-3 w-full">
            Update
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
