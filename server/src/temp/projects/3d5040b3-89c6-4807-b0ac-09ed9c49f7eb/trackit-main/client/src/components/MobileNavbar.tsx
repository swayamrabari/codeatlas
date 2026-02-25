import { NavLink } from 'react-router-dom';
import React from 'react';
import navOptions from '../constants/navOtions';
import { useAuthStore } from '@/store/authStore';

function MobileNavbar() {
  const user = useAuthStore((s) => s.user);
  const filteredNavOptions = navOptions.filter((option) =>
    user?.role === 'admin' ? option.adminOnly : !option.adminOnly
  );

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-5 gap-0 sm:hidden w-full py-6 bg-background border-t border-border px-5 ">
      {filteredNavOptions.map((option) => (
        <NavLink
          key={option.label}
          to={option.path}
          className={({ isActive }) =>
            `transition-all bg-background py-2 rounded-3xl px-8 duration-75 font-semibold flex flex-col items-center justify-center gap-1 ${
              isActive
                ? 'text-foreground bg-secondary'
                : 'text-muted-foreground'
            }`
          }
        >
          {React.cloneElement(option.icon, {
            className: 'stroke-[2.2px]',
          })}
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileNavbar;
