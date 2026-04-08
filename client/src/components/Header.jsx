import React from 'react';
import LogoIcon from '../assets/logo';
import Wordmark from '../assets/wordmark';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, LogOut, Upload } from 'lucide-react';

export default function Header({ projectName = '' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === '/dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header>
      <div className="mx-auto flex items-center justify-between px-6 pt-4 pb-0.5">
        <div className="logo flex items-center gap-3 min-w-0">
          <Link to="/" className="flex gap-3 items-baseline shrink-0">
            <LogoIcon className="h-4.5 w-auto themed-svg" />
            <Wordmark className="h-3.75 w-auto themed-svg" />
          </Link>

          {projectName ? (
            <div className="min-w-0 flex items-center gap-2 pt-1.5">
              <span className="text-muted-foreground">/</span>
              <p className="truncate font-medium text-foreground/90 max-w-[40vw]">
                {projectName}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Desktop buttons */}
              {!isDashboard && (
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/upload')}
                  >
                    <Upload className="h-4 w-4" />
                    New Project
                  </Button>
                </div>
              )}

              {/* Dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-base font-bold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {user.name.charAt(0).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {/* Mobile buttons */}
                  {!isDashboard && (
                    <div className="md:hidden">
                      <DropdownMenuItem
                        onClick={() => navigate('/dashboard')}
                        className="cursor-pointer"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate('/upload')}
                        className="cursor-pointer"
                      >
                        <Upload className="h-4 w-4" />
                        New Project
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </div>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleLogout}
                    className="cursor-pointer font-medium"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
