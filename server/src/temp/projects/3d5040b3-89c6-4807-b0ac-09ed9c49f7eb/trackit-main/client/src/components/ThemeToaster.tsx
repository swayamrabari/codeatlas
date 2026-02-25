import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToaster() {
  const { theme } = useTheme();
  
  return (
    <SonnerToaster 
      theme={theme === 'dark' ? 'dark' : 'light'} 
      richColors 
      position="top-center" 
    />
  );
}

