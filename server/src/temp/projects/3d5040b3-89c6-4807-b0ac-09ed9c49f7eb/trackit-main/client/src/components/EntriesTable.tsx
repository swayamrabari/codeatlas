import { useState, useMemo, useEffect, memo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEntriesStore, Entry } from '@/store/entriesStore';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Pencil, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import EditEntry from './EditEntry';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface EntriesTableProps {
  type?: string;
  category?: string;
  filterType?: 'all' | 'month' | 'quarter' | 'year' | 'custom';
  filterMonth?: number | null; // for month or quarter
  filterYear?: number | null;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

const bgClasses: Record<string, string> = {
  income: 'bg-income',
  expense: 'bg-expense',
  investment: 'bg-investment',
  savings: 'bg-savings',
};

const hoverBgClasses: Record<string, string> = {
  income: 'bg-income/10',
  expense: 'bg-expense/10',
  investment: 'bg-investment/10',
  savings: 'bg-savings/10',
};

const ITEMS_PER_PAGE = 50;

// Memoized date formatter function
const formatDate = (date: string | Date): string => {
  return new Date(date)
    .toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace(/(\w{3}) (\d{2})/, '$1, $2');
};

// Memoized desktop table row component
const DesktopTableRow = memo(({ 
  entry, 
  onEdit, 
  onDelete 
}: { 
  entry: Entry; 
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) => {
  const formattedDate = useMemo(() => formatDate(entry.date), [entry.date]);
  const formattedAmount = useMemo(
    () => entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    [entry.amount]
  );

  return (
    <TableRow
      className={`hover:${hoverBgClasses[entry.type]}`}
    >
      <TableCell>
        <span
          className={`capitalize text-${entry.type} bg-${entry.type}/15 px-2 py-1 rounded-md`}
        >
          {entry.type}
        </span>
      </TableCell>
      <TableCell className="capitalize">{entry.category}</TableCell>
      <TableCell>{formattedDate}</TableCell>
      <TableCell className={`text-right font-bold text-${entry.type}`}>
        {formattedAmount}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground hover:bg-transparent"
            onClick={() => onEdit(entry)}
            aria-label="Edit Entry"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-expense hover:text-expense hover:bg-transparent"
            onClick={() => onDelete(entry)}
            aria-label="Delete Entry"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

DesktopTableRow.displayName = 'DesktopTableRow';

// Memoized mobile card component
const MobileEntryCard = memo(({ 
  entry, 
  onEdit, 
  onDelete 
}: { 
  entry: Entry; 
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) => {
  const formattedDate = useMemo(() => formatDate(entry.date), [entry.date]);
  const formattedAmount = useMemo(
    () => entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    [entry.amount]
  );

  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${
        bgClasses[entry.type] || 'bg-secondary'
      }/5 border-2 border-${entry.type}/20 hover:${
        hoverBgClasses[entry.type]
      } transition-colors`}
    >
      {/* Top Row: Category and Actions */}
      <div className="flex justify-between items-center mb-2">
        <span
          className={`text-[12px] font-semibold capitalize ${
            bgClasses[entry.type] || 'bg-secondary'
          }/15 text-${entry.type} px-2 py-0.5 rounded-sm`}
        >
          {entry.category}
        </span>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-foreground hover:bg-transparent"
            onClick={() => onEdit(entry)}
            aria-label="Edit Entry"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-expense hover:text-expense hover:bg-transparent"
            onClick={() => onDelete(entry)}
            aria-label="Delete Entry"
          >
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Middle: Amount (Most Prominent) */}
      <div className="flex items-end justify-between text-[10px] font-semibold">
        <span className="text-xl font-bold tracking-tight text-foreground">
          {formattedAmount}
        </span>
        <span className="text-foreground/70">{formattedDate}</span>
      </div>
    </div>
  );
});

MobileEntryCard.displayName = 'MobileEntryCard';

export default function EntriesTable({
  type,
  category,
  filterType = 'all',
  filterMonth = null,
  filterYear = null,
  startDate = undefined,
  endDate = undefined,
}: EntriesTableProps) {
  const { entries, removeEntry } = useEntriesStore();
  const location = useLocation();
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleEdit = useCallback((entry: Entry) => {
    setEditEntry(entry);
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((entry: Entry) => {
    setDeleteEntry(entry);
    setDeleteDialogOpen(true);
  }, []);

  // Memoize filtered entries for performance
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (type && entry.type !== type) return false;
      if (category && entry.category !== category) return false;

      // Apply time-based filtering when provided
      if (filterType && filterType !== 'all') {
        const entryDate = new Date(entry.date);
        const entryMonth = entryDate.getMonth() + 1; // 1-12
        const entryYear = entryDate.getFullYear();

        if (filterType === 'month' && filterMonth && filterYear) {
          if (!(entryMonth === filterMonth && entryYear === filterYear))
            return false;
        } else if (filterType === 'year' && filterYear) {
          if (entryYear !== filterYear) return false;
        } else if (filterType === 'custom' && startDate && endDate) {
          if (!(entryDate >= startDate && entryDate <= endDate)) return false;
        } else if (filterType === 'quarter' && filterMonth && filterYear) {
          const quarter = Math.floor((entryMonth - 1) / 3) + 1;
          if (!(quarter === filterMonth && entryYear === filterYear))
            return false;
        }
      }

      return true;
    });
  }, [
    entries,
    type,
    category,
    filterType,
    filterMonth,
    filterYear,
    startDate,
    endDate,
  ]);

  // Memoize sorted entries
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return bTime - aTime;
    });
  }, [filteredEntries]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [type, category, filterType, filterMonth, filterYear, startDate, endDate]);

  // Calculate pagination
  const isEntriesPage = location.pathname === '/entries';
  const totalPages = Math.ceil(sortedEntries.length / ITEMS_PER_PAGE);

  const displayEntries = useMemo(() => {
    if (location.pathname === '/') {
      return sortedEntries.slice(0, 10);
    }
    // Paginate for entries page
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedEntries.slice(startIndex, endIndex);
  }, [sortedEntries, currentPage, location.pathname]);

  if (filteredEntries.length === 0) {
    return (
      <div className="w-full text-center py-10 font-semibold">
        No entries found!
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      {/* Mobile View - Hidden on desktop (md and above) */}
      <div className="flex flex-col gap-3 md:hidden">
        {displayEntries.map((entry) => (
          <MobileEntryCard
            key={entry.id}
            entry={entry}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
      
      {/* Desktop View - Hidden on mobile, shown on desktop (md and above) */}
      <Table className="font-semibold hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="font-semibold border-none">
          {displayEntries.map((entry) => (
            <DesktopTableRow
              key={entry.id}
              entry={entry}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </TableBody>
      </Table>
      {location.pathname === '/' && displayEntries.length > 0 && (
        <Link
          to="/entries"
          className="text-investment hover:underline font-semibold w-full text-center block mt-5"
        >
          View all entries
        </Link>
      )}

      {/* Pagination Controls - Only show on entries page */}
      {isEntriesPage && sortedEntries.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center gap-4 mt-8 mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-10 w-10"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 font-semibold text-base">
            <span>Page </span>
            <span className="text-primary font-bold">{currentPage}</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="h-10 w-10"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Entry Dialog */}
      <EditEntry
        entry={editEntry}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteEntry) {
                  removeEntry(deleteEntry.id);
                  setDeleteDialogOpen(false);
                  setDeleteEntry(null);
                }
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
