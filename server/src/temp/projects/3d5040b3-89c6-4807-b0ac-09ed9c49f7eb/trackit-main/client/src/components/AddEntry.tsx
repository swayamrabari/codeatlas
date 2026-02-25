import { useState, useRef, useEffect } from 'react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectValue,
  SelectSeparator,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { CalendarIcon, Plus } from 'lucide-react';
// AddEntryIcon is now inlined below
import { useCategoriesStore } from '@/store/categoriesStore';
import { Input } from './ui/input';
import { format } from 'date-fns';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useEntriesStore } from '@/store/entriesStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function AddEntry({ inSidebar = false }) {
  const [date, setDate] = useState<Date>();
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  const isEligible = type && category && amount > 0 && date;

  const categoriesStore = useCategoriesStore();
  const entryTypes = Object.keys(categoriesStore.categories);

  const relevantCategories =
    categoriesStore.categories[
      type as keyof typeof categoriesStore.categories
    ] || [];

  // Focus input when entering add new category mode
  useEffect(() => {
    if (isAddingNewCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isAddingNewCategory]);

  const handleCategoryChange = (value: string) => {
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
    if (relevantCategories.includes(categoryName)) {
      setCategory(categoryName);
      setIsAddingNewCategory(false);
      setNewCategoryName('');
      return;
    }

    // Add category to store
    await categoriesStore.addCategory(
      type as keyof typeof categoriesStore.categories,
      categoryName
    );

    // Select the newly created category
    setCategory(categoryName);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
  };

  const handleNewCategoryKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewCategory();
    } else if (e.key === 'Escape') {
      setIsAddingNewCategory(false);
      setNewCategoryName('');
      setCategory('');
    }
  };

  return (
    <>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingNewCategory(false);
            setNewCategoryName('');
          }
        }}
      >
        {inSidebar ? (
          <DialogTrigger asChild>
            <div className="transition-all font-medium w-full flex gap-2 hover:bg-secondary cursor-pointer items-center justify-start px-2.5 py-2 rounded-md text-foreground">
              <svg
                width="22"
                height="23"
                viewBox="0 0 22 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-[20px] w-[22px]"
              >
                <path
                  d="M4.29297 10.293C4.68349 9.90245 5.31651 9.90245 5.70703 10.293C6.09752 10.6835 6.09754 11.3165 5.70703 11.707L3.41406 14H9.6748C9.37938 14.6218 9.1733 15.2938 9.07227 16H3.41406L5.70703 18.293C6.09752 18.6835 6.09754 19.3165 5.70703 19.707C5.31652 20.0975 4.68348 20.0975 4.29297 19.707L0.292969 15.707C-0.097543 15.3165 -0.0975178 14.6835 0.292969 14.293L4.29297 10.293ZM12.293 0.29297C12.6835 -0.0975548 13.3165 -0.0975548 13.707 0.29297L17.707 4.29297C18.0975 4.6835 18.0975 5.31652 17.707 5.70703L13.707 9.70703C13.3165 10.0975 12.6835 10.0975 12.293 9.70703C11.9025 9.31652 11.9025 8.6835 12.293 8.29297L14.5859 6H1C0.44774 6 4.08113e-05 5.55225 0 5C0 4.44772 0.447715 4 1 4H14.5859L12.293 1.70703C11.9025 1.31652 11.9025 0.683497 12.293 0.29297Z"
                  fill="currentColor"
                />
                <path
                  d="M14 17H18M16 15V19M21 17C21 19.7614 18.7614 22 16 22C13.2386 22 11 19.7614 11 17C11 14.2386 13.2386 12 16 12C18.7614 12 21 14.2386 21 17Z"
                  stroke="currentColor"
                  strokeWidth="1.33333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-base">Add Entry</span>
            </div>
          </DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-10 sm:w-fit font-semibold">
              <Plus className="stroke-[2.5px]" />
              <span className="hidden sm:block">Add</span>
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="w-full max-h-full sm:w-[400px] overflow-auto">
          <DialogHeader className="mb-2">
            <DialogTitle>Add Entry</DialogTitle>
            <DialogDescription>
              Add a new entry to your records
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            placeholder="0.00"
            className="num-inp caret-muted-foreground h-fit text-4xl appearance-none border-2 focus:outline-none tracking-wide"
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <Label className="mt-1">Select Entry Type</Label>
          <RadioGroup
            onValueChange={(value) => {
              setType(value);
              setCategory('');
              setIsAddingNewCategory(false);
              setNewCategoryName('');
            }}
            className="grid grid-cols-2 grid-rows-2 gap-2 font-semibold"
            value={type}
          >
            {entryTypes.map((etype) => (
              <Label
                key={etype}
                htmlFor={`add-entry-${etype}`}
                className={cn(
                  `flex font-bold items-center justify-center rounded-md border-[1.5px] h-10 text-${etype}`,
                  type === etype &&
                    `bg-${etype}/10 border-${etype} transition-all duration-75`
                )}
              >
                <RadioGroupItem
                  value={etype}
                  id={`add-entry-${etype}`}
                  className="sr-only"
                />
                {etype.charAt(0).toUpperCase() + etype.slice(1)}
              </Label>
            ))}
          </RadioGroup>

          <Label className="mt-3">Select Category</Label>
          {!isAddingNewCategory ? (
            <Select
              key={type}
              disabled={!type}
              value={category}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger
                disabled={!type}
                className="bg-secondary border-none capitalize"
              >
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
                  {relevantCategories.map((cat: string) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
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
          <Label className="mt-3">Select Date</Label>
          <Popover
            modal={true}
            open={datePickerOpen}
            onOpenChange={setDatePickerOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                className={cn(
                  'justify-start text-left font-semibold w-full',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon />
                {date ? format(date, 'PPP') : <span>Entry Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                  setDatePickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <DialogClose>
            <Button
              disabled={!isEligible}
              className="font-semibold mt-3 w-full"
              onClick={() => {
                useEntriesStore.getState().addEntry({
                  type,
                  category,
                  amount,
                  date: date ? format(date, 'yyyy-MM-dd') : '',
                });

                setType('');
                setCategory('');
                setAmount(0);
                setDate(undefined);
                setIsAddingNewCategory(false);
                setNewCategoryName('');
              }}
            >
              Add Entry
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
