import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// AddCategoryIcon is now inlined below
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useCategoriesStore } from '@/store/categoriesStore';

export function CategoryDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');

  const { addCategory } = useCategoriesStore();
  const entryTypes = ['income', 'expense', 'investment', 'savings'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!type) {
      setError('Please select a category type');
      return;
    }
    if (!categoryName.trim()) {
      setError('Please enter a category name');
      return;
    }

    // Add category to store
    addCategory(type as 'income' | 'expense' | 'investment' | 'savings', categoryName.toLowerCase().trim());

    // Reset form and close dialog
    setType('');
    setCategoryName('');
    setError('');
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setError('');
      }}
    >
      <DialogTrigger asChild>
        <div className="transition-all font-medium w-full flex gap-2 hover:bg-secondary cursor-pointer items-center justify-start px-2.5 py-2 rounded-md text-foreground">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[24px]">
            <path d="M16.722 18.5366H20.3512M18.5366 16.722V20.3512M23.0732 18.5366C23.0732 21.0421 21.0421 23.0732 18.5366 23.0732C16.0311 23.0732 14 21.0421 14 18.5366C14 16.0311 16.0311 14 18.5366 14C21.0421 14 23.0732 16.0311 23.0732 18.5366Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.1719 0C10.9674 0.000169916 11.7305 0.316364 12.293 0.878906L20.999 9.58496C21.6368 10.2268 21.9951 11.0951 21.9951 12C21.9951 12.3197 21.9483 12.6343 21.8623 12.9365C21.2882 12.5888 20.6558 12.3289 19.9834 12.1719C19.9903 12.1151 19.9951 12.0578 19.9951 12C19.9951 11.6244 19.8471 11.264 19.583 10.9971L10.8789 2.29297C10.7148 2.12884 10.4994 2.02764 10.2705 2.00488L10.1719 2H3C2.73478 2 2.4805 2.10543 2.29297 2.29297C2.10543 2.4805 2 2.73478 2 3V10.1719L2.00488 10.2705C2.02764 10.4994 2.12884 10.7148 2.29297 10.8789L10.9951 19.5811L11.0996 19.6748C11.3529 19.881 11.6705 19.9951 12 19.9951C12.0578 19.9951 12.1151 19.9903 12.1719 19.9834C12.3289 20.6558 12.5888 21.2882 12.9365 21.8623C12.6343 21.9483 12.3197 21.9951 12 21.9951C11.0951 21.9951 10.2268 21.6368 9.58496 20.999L0.878906 12.293C0.316364 11.7305 0.000169916 10.9674 0 10.1719V3C0 2.20435 0.316297 1.44152 0.878906 0.878906C1.44152 0.316297 2.20435 0 3 0H10.1719ZM6.5 5C7.32843 5 8 5.67157 8 6.5C8 7.32843 7.32843 8 6.5 8C5.67157 8 5 7.32843 5 6.5C5 5.67157 5.67157 5 6.5 5Z" fill="currentColor" />
          </svg>
          <span className="text-base">Add Category</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>
            Create a new category for relatability.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <Label>Category Type</Label>
          <RadioGroup
            onValueChange={(value) => {
              setType(value);
              setCategoryName('');
            }}
            className="grid grid-cols-2 grid-rows-2 gap-2 font-semibold"
            value={type}
          >
            {entryTypes.map((etype) => (
              <Label
                key={etype}
                htmlFor={etype}
                className={cn(
                  `flex font-bold items-center justify-center rounded-md border-[1.5px] h-10 text-${etype}`,
                  type === etype &&
                  `bg-${etype}/10 border-${etype} transition-all duration-75`
                )}
              >
                <RadioGroupItem value={etype} id={etype} className="sr-only" />
                {etype.charAt(0).toUpperCase() + etype.slice(1)}
              </Label>
            ))}
          </RadioGroup>
          <Label className="mt-3">Category Name</Label>
          <Input
            className="w-full border-2"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Category Name"
          />
          {error && (
            <div className="text-sm text-red-500 font-medium">{error}</div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!type || !categoryName.trim()}
          >
            Add Category
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
