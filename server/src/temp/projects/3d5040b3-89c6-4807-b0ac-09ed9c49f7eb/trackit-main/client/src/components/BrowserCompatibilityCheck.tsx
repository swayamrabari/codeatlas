import { useEffect, useState } from 'react';
import logo from '../assets/trackit.svg';

// Function to detect incompatible browsers
const isIncompatibleBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent;
  
  // Detect Safari (but exclude Chrome, Edge, and other Chromium-based browsers)
  // Safari's user agent contains "Safari" but not "Chrome" or "Chromium"
  const isSafari = 
    /safari/i.test(userAgent) && 
    !/chrome/i.test(userAgent) && 
    !/chromium/i.test(userAgent) &&
    !/edg/i.test(userAgent);
  
  // Detect Samsung Internet
  const isSamsungInternet = /samsungbrowser/i.test(userAgent);
  
  return isSafari || isSamsungInternet;
};

const BrowserCompatibilityCheck = ({ children }: { children: React.ReactNode }) => {
  const [isIncompatible, setIsIncompatible] = useState(false);

  useEffect(() => {
    setIsIncompatible(isIncompatibleBrowser());
  }, []);

  if (isIncompatible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 shadow-lg text-center">
          <img 
            src={logo} 
            alt="TrackIt Logo" 
            className="w-16 h-16 mx-auto mb-6" 
          />
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Browser Not Supported
          </h1>
          <p className="text-muted-foreground mb-6">
            We're sorry, but TrackIt doesn't support Safari or Samsung Internet browsers 
            due to compatibility limitations. Please use one of the following browsers 
            for the best experience:
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-foreground">
              <span className="font-semibold">✓</span>
              <span>Google Chrome</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-foreground">
              <span className="font-semibold">✓</span>
              <span>Mozilla Firefox</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-foreground">
              <span className="font-semibold">✓</span>
              <span>Microsoft Edge</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-foreground">
              <span className="font-semibold">✓</span>
              <span>Opera</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            These browsers provide better compatibility and performance for TrackIt.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default BrowserCompatibilityCheck;

