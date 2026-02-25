import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import logo from './assets/trackit.svg';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import ForgotPassword from './pages/ForgotPassword';
import VerifyForgotPassword from './pages/VerifyForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Main Pages
import Home from './pages/Home';
import Budget from './pages/Budget';
import Entries from './pages/Entries';
import Insights from './pages/Insights';
import Assistant from './pages/Assistant';
import Admin from './pages/Admin';

// Components
import Navbar from './components/Navbar';
import MobileNavbar from './components/MobileNavbar';
import SidebarNav from './components/SidebarNav';
import { Protected } from './components/Protected';
import { AdminProtected } from './components/AdminProtected';

// Page transition animations
const pageVariants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.2, 0, 0.4, 1] },
  },
  exit: {
    opacity: 0,
    y: 40,
    transition: { duration: 0.2, ease: [0.2, 0, 0.4, 1] },
  },
};

// Wrapper for route pages
const PageWrapper = ({ children }: { children: ReactNode }) => (
  <motion.div
    layout
    style={{
      width: '100%',
      willChange: 'opacity, transform',
      transform: 'translateZ(0)',
      position: 'relative',
    }}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
  >
    {children}
  </motion.div>
);

// Layout for protected pages
function AppLayout() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {!isAdminPage && <SidebarNav />}
      <div className="flex flex-col flex-1 w-full min-w-0">
        <Navbar hideNavOptions={isAdminPage} forceVisible={isAdminPage} />
        <div className="page px-5 w-full md:px-12 flex-1 overflow-y-auto">
          <div className="max-w-[1000px] mx-auto w-full">
            <AnimatePresence
              mode="wait"
              initial={false}
              onExitComplete={() => {
                const pageContainer = document.querySelector('.page');
                if (pageContainer) {
                  pageContainer.scrollTo({ top: 0 });
                }
              }}
            >
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/"
                  element={
                    <PageWrapper>
                      <Home />
                    </PageWrapper>
                  }
                />
                <Route
                  path="/entries"
                  element={
                    <PageWrapper>
                      <Entries />
                    </PageWrapper>
                  }
                />
                <Route
                  path="/insights"
                  element={
                    <PageWrapper>
                      <Insights />
                    </PageWrapper>
                  }
                />
                <Route
                  path="/budget"
                  element={
                    <PageWrapper>
                      <Budget />
                    </PageWrapper>
                  }
                />
                <Route
                  path="/assistant"
                  element={
                    <PageWrapper>
                      <Assistant />
                    </PageWrapper>
                  }
                />
                <Route element={<AdminProtected />}>
                  <Route
                    path="/admin"
                    element={
                      <PageWrapper>
                        <Admin />
                      </PageWrapper>
                    }
                  />
                </Route>
                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </div>
        </div>
        {!isAdminPage && <MobileNavbar />}
      </div>
    </div>
  );
}

// PublicRoute: redirect if user already logged in
function PublicRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return children;
  }

  return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
}

// Main App component
function App() {
  const { checkAuthStatus, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={logo} alt="TrackIt Logo" className="w-20 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/verify"
          element={
            <PublicRoute>
              <Verify />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-forgot-password"
          element={
            <PublicRoute>
              <VerifyForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route element={<Protected />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/entries" element={<Entries />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route element={<AdminProtected />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
