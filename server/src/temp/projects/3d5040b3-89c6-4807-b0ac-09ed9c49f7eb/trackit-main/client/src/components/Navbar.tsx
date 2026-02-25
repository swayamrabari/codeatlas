import React from 'react';
import { NavLink } from 'react-router-dom';
import navOptions from '../constants/navOtions';
import { useAuthStore } from '@/store/authStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

interface NavbarProps {
  hideNavOptions?: boolean;
  forceVisible?: boolean;
}

export default function Navbar({ hideNavOptions, forceVisible }: NavbarProps) {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useTheme();
  const filteredNavOptions = navOptions.filter((option) =>
    user?.role === 'admin' ? option.adminOnly : !option.adminOnly
  );
  return (
    <>
      <header
        className={`sticky top-0 w-screen border-b flex items-center justify-center border-border bg-background z-30 ${
          forceVisible ? '' : 'lg:hidden'
        }`}
      >
        <div className="max-w-[1000px] w-full flex items-center justify-between py-5 px-5 lg:px-0">
          <img src="/trackit.svg" alt="Trackit Logo" className="h-8" />
          {/* Navigation */}
          {!hideNavOptions && (
            <nav className="hidden items-center gap-3 sm:flex">
              {filteredNavOptions.map((option) => (
                <NavLink
                  key={option.label}
                  to={option.path}
                  className={({ isActive }) =>
                    `transition-all font-semibold items-center gap-2 flex px-4 py-2 rounded-md ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`
                  }
                >
                  {React.cloneElement(option.icon, {
                    className: 'h-5 w-5 stroke-[2.2px]',
                  })}
                  <span>{option.label}</span>
                </NavLink>
              ))}
            </nav>
          )}
          {/* Avatar + Account actions */}
          <Popover>
            <PopoverTrigger className="avatar h-10 w-10 bg-muted/50 rounded-full flex items-center justify-center">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-secondary">
                <span className="text-secondary-foreground/80 font-semibold text-base">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1.5 rounded-xl" align="end">
              <div className="flex flex-col gap-1.5">
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
                  <span>Logout</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
    </>
  );
}
