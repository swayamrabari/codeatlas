import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// AddBudgetSvg is now inlined below
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectSeparator,
} from '@/components/ui/select';
import { useCategoriesStore } from '@/store/categoriesStore';
import { Budget } from '@/store/budgetStore';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { SelectGroup } from '@radix-ui/react-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type AddBudgetDialogProps = {
  onAdd: (budget: Omit<Budget, 'id'>) => void;
  inSidebar?: boolean;
};

export default function AddBudgetDialog({
  onAdd,
  inSidebar,
}: AddBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  const categories = useCategoriesStore(
    (state) => state.categories[type as keyof typeof state.categories]
  );
  const { addCategory } = useCategoriesStore();
  const [error, setError] = useState('');

  // Focus input when entering add new category mode
  useEffect(() => {
    if (isAddingNewCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isAddingNewCategory]);

  const typeOptions = ['expense', 'savings', 'investment'];

  const periodOptions = ['monthly', 'quarterly', 'half-yearly', 'yearly'];

  const handleCategoryChange = async (value: string) => {
    if (value === '__add_new__') {
      setIsAddingNewCategory(true);
      setCategory('');
    } else {
      setIsAddingNewCategory(false);
      setCategory(value);
      setNewCategoryName('');
    }
  };

  const handleAddNewCategory = async () => {
    const trimmedName = newCategoryName.trim();
    
    // Validation: Check for empty values
    if (!trimmedName) {
      return; // Don't proceed if empty
    }
    
    if (!type) {
      return; // Don't proceed if no type selected
    }

    const categoryName = trimmedName.toLowerCase();
    
    // Check if category already exists
    if ((categories ?? []).includes(categoryName)) {
      setCategory(categoryName);
      setIsAddingNewCategory(false);
      setNewCategoryName('');
      return;
    }

    // Add category to store
    await addCategory(
      type as 'income' | 'expense' | 'investment' | 'savings',
      categoryName
    );

    // Select the newly created category
    setCategory(categoryName);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
  };

  const handleNewCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewCategory();
    } else if (e.key === 'Escape') {
      setIsAddingNewCategory(false);
      setNewCategoryName('');
      setCategory('');
    }
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !amount) {
      setError('Please fill all fields');
      return;
    }
    if (Number(amount) <= 0) {
      setError('Amount must be positive');
      return;
    }
    onAdd({
      type,
      category,
      amount: Number(amount),
      period,
      spent: 0,
    });
    setOpen(false);
    setCategory('');
    setAmount('');
    setPeriod('monthly');
    setType('expense');
    setError('');
    setIsAddingNewCategory(false);
    setNewCategoryName('');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setError('');
        if (!v) {
          setIsAddingNewCategory(false);
          setNewCategoryName('');
        }
      }}
    >
      {inSidebar ? (
        <DialogTrigger asChild>
          <div className="transition-all font-medium w-full flex gap-2 hover:bg-secondary cursor-pointer items-center justify-start px-2.5 py-2 rounded-md text-foreground">
            <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[25px]">
              <path d="M17 0C18.6569 0 20 1.34315 20 3V12.0723C19.6733 12.0255 19.3396 12 19 12C18.6604 12 18.3267 12.0255 18 12.0723V10H16.0996C15.6049 10.0001 15.0497 10.2647 14.707 10.6074C14.6836 10.6308 14.6585 10.6528 14.6328 10.6738L13.5557 11.5547C11.581 13.4784 8.52394 13.4798 6.54785 11.5586L5.4668 10.6738C5.41769 10.6336 5.37266 10.5888 5.33203 10.54C5.06298 10.2172 4.57375 10 4 10H2V17C2 17.5523 2.44771 18 3 18H12.0723C12.0255 18.3267 12 18.6604 12 19C12 19.3396 12.0255 19.6733 12.0723 20H3C1.34315 20 0 18.6569 0 17V3C0 1.34315 1.34315 0 3 0H17ZM3 6C2.73478 6 2.48051 6.10543 2.29297 6.29297C2.10543 6.48051 2 6.73478 2 7V8H4C4.99065 8 6.05856 8.35815 6.78906 9.17188L7.83301 10.0264L7.90723 10.0928C9.1167 11.3022 10.9839 11.3022 12.1934 10.0928L12.2666 10.0264L13.3418 9.14648C14.0011 8.5111 15.0211 8.00012 16.0996 8H18V7C18 6.73478 17.8946 6.48051 17.707 6.29297C17.5429 6.12883 17.3276 6.02757 17.0986 6.00488L17 6H3ZM3 2C2.44772 2 2 2.44772 2 3V4.1748C2.3185 4.06206 2.65569 4 3 4H17C17.3443 4 17.6815 4.06206 18 4.1748V3C18 2.44771 17.5523 2 17 2H3Z" fill="currentColor" />
              <path d="M17 19H21M19 17V21M24 19C24 21.7614 21.7614 24 19 24C16.2386 24 14 21.7614 14 19C14 16.2386 16.2386 14 19 14C21.7614 14 24 16.2386 24 19Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-base">Add Budget</span>
          </div>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="secondary" className="w-10 sm:w-fit font-semibold">
            <Plus className="stroke-[2.5px]" />
            <span className="hidden sm:block">Add Budget</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-full max-h-full sm:w-[520px] overflow-auto">
        <DialogHeader className="mb-2">
          <DialogTitle>Add Budget</DialogTitle>
          <DialogDescription>
            Create a new budget for a category and period.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3 mt-2" onSubmit={handleSubmit}>
          <Input
            type="number"
            min={0}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="num-inp caret-muted-foreground h-fit text-4xl appearance-none border-2 focus:outline-none tracking-wide"
            required
          />
          <Label className="mt-3 font-semibold">Select Budget Type</Label>
          <RadioGroup
            value={type}
            onValueChange={(v) => {
              setType(v as Budget['type']);
              setCategory('');
              setIsAddingNewCategory(false);
              setNewCategoryName('');
            }}
            className="flex flex-col sm:flex-row gap-2 font-semibold"
          >
            {typeOptions.map((btype) => {
              const uniqueId = `dialog-budget-type-${btype}`;
              return (
                <Label
                  key={btype}
                  htmlFor={uniqueId}
                  className={cn(
                    `flex flex-1 font-bold items-center justify-center rounded-md border-[1.5px] min-h-10 text-${btype}`,
                    type === btype &&
                    `bg-${btype}/10 border-${btype} transition-all duration-75`
                  )}
                >
                  <RadioGroupItem
                    value={btype}
                    id={uniqueId}
                    className="sr-only"
                  />
                  {btype.charAt(0).toUpperCase() + btype.slice(1)}
                </Label>
              );
            })}
          </RadioGroup>
          <Label className="mt-3 font-semibold">Select Category</Label>
          {!isAddingNewCategory ? (
            <Select value={category} onValueChange={handleCategoryChange} disabled={!type}>
              <SelectTrigger className="bg-secondary border-none capitalize">
                <SelectValue
                  placeholder="Select Category"
                  className="w-full text-left"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    value="__add_new__"
                    className="text-primary font-semibold"
                  >
                    <Plus className="inline h-4 w-4 mr-2" />
                    Add New Category
                  </SelectItem>
                  <SelectSeparator />
                  {(categories ?? []).map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input
                ref={newCategoryInputRef}
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleNewCategoryKeyDown}
                className="col-span-2 capitalize text-sm font-semibold"
                autoFocus
              />
              <Button
                type="button"
                onClick={handleAddNewCategory}
                disabled={!newCategoryName.trim() || !type}
                variant="secondary"
                className="text-sm font-semibold"
              >
                Add
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsAddingNewCategory(false);
                  setNewCategoryName('');
                  setCategory('');
                }}
                variant="outline"
                className="text-sm font-semibold"
              >
                Cancel
              </Button>
            </div>
          )}
          <Label className="mt-3 font-semibold">Select Period</Label>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as Budget['period'])}
          >
            <SelectTrigger className="bg-secondary border-none capitalize">
              <SelectValue placeholder="Period" className="w-full text-left" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && (
            <div className="text-sm text-red-500 font-medium">{error}</div>
          )}
          <Button
            type="submit"
            className="font-semibold mt-3 w-full"
            disabled={
              !type || !category || !amount || !period || Number(amount) <= 0
            }
          >
            Add
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
