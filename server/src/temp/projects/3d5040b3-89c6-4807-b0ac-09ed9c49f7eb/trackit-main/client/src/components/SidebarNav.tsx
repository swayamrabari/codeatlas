import React from 'react';
import { NavLink } from 'react-router-dom';
import navOptions from '../constants/navOtions';
import AddEntry from './AddEntry';
import AddBudgetDialog from './budget/AddBudgetDialog';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuthStore } from '@/store/authStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { EllipsisVertical, LogOut, Moon, Sun } from 'lucide-react';
import { CategoryDialog } from './CategoryDialog';
import { FeedbackDialog } from './FeedbackDialog';
import { useTheme } from '@/hooks/use-theme';
import ExportDialog from './ExportDialog';

export default function SidebarNav() {
  const addBudget = useBudgetStore((s) => s.addBudget);
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useTheme();
  const filteredNavOptions = navOptions.filter((option) =>
    user?.role === 'admin' ? option.adminOnly : !option.adminOnly
  );
  return (
    <aside className="hidden tracking-normal lg:flex flex-col h-svh w-64 bg-sidebar border-r border-border top-0">
      <div className="px-6 py-7 flex items-center gap-3">
        <img src="/trackit.svg" alt="Trackit Logo" className="h-8" />
        <h1 className="text-[1.35rem] font-logo font-semibold tracking-wide">
          TrackIt
        </h1>
      </div>
      {/* Navigation */}
      <div className="workspace flex flex-col">
        <span className="px-6 text-xs tracking-wide font-semibold text-muted-foreground">
          Workspace
        </span>
        <nav className="flex flex-col w-full overflow-y px-2.5 py-1">
          {filteredNavOptions.map((option) => (
            <NavLink
              key={option.label}
              to={option.path}
              className={({ isActive }) =>
                `transition-all font-semibold w-full flex gap-2 items-center px-2.5 py-2 rounded-md ${
                  isActive ? 'bg-secondary' : ''
                }`
              }
            >
              {React.cloneElement(option.icon, {
                className: 'h-[20px]',
              })}
              <span className="text-base font-medium">{option.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      {user?.role !== 'admin' && (
        <div className="actions mt-2">
          <span className="px-6 text-xs tracking-wide font-semibold text-muted-foreground">
            Actions
          </span>
          {/* display here add entry and budget dialogue triggers */}
          <div className="px-2.5 py-1 flex flex-col select-none">
            <AddEntry inSidebar />
            <AddBudgetDialog onAdd={addBudget} inSidebar />
            <CategoryDialog />
            <ExportDialog inSidebar />
          </div>
        </div>
      )}
      {/* Avatar */}
      <div className="mt-auto profile-card p-3">
        <div className="relative overflow-hidden group flex items-center gap-3 p-3 bg-secondary rounded-lg">
          <div className="absolute z-50 bg-gradient-to-l from-secondary from-70% to-transparent h-full w-14 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Popover>
              <PopoverTrigger className="w-full flex items-center justify-center h-full ml-1.5">
                <EllipsisVertical />
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1.5 rounded-xl">
                <div className="flex flex-col gap-1.5">
                  <FeedbackDialog />
                  <div
                    className="flex text-foreground font-semibold text-sm gap-2 items-center cursor-pointer bg-secondary hover:bg-secondary/80 transition-all rounded-md p-2"
                    onClick={toggleTheme}
                  >
                    {theme === 'dark' ? (
                      <Sun className="inline h-5 w-5" />
                    ) : (
                      <Moon className="inline h-5 w-5" />
                    )}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  <div
                    className="flex text-expense font-semibold text-sm gap-2 items-center cursor-pointer bg-expense/15 hover:bg-expense/10 transition-all rounded-md p-2"
                    onClick={() => useAuthStore.getState().logout()}
                  >
                    <LogOut className="inline h-5 w-5" />
                    <span onClick={() => useAuthStore.getState().logout()}>
                      Logout
                    </span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-foreground text-secondary text-xl flex items-center justify-center font-bold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col gap-[-5px] overflow-hidden">
            <span className="font-semibold truncate relative">
              {user?.name}
            </span>
            <span className="text-sm font-semibold text-muted-foreground truncate relative">
              {user?.email}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
