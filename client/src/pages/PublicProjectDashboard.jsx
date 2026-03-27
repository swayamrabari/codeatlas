import { lazy, Suspense, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectAPI, PUBLIC_PROJECT_ID } from '../services/api';
import Header from '@/components/Header';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { buildProjectTabStateKey } from '@/hooks/usePersistentState';
import { Badge } from '@/components/ui/badge';

const Overview = lazy(() => import('./Overview'));
const Files = lazy(() => import('./Files'));
const Source = lazy(() => import('./Source'));
const Insights = lazy(() => import('./Insights'));
const Ask = lazy(() => import('./Ask'));

const PUBLIC_TABS = ['overview', 'insights', 'files', 'source', 'ask'];

function getStoredPublicTab(storageKey) {
  if (typeof window === 'undefined') return 'overview';

  try {
    const stored = window.localStorage.getItem(storageKey);
    return PUBLIC_TABS.includes(stored) ? stored : 'overview';
  } catch {
    return 'overview';
  }
}

function setStoredPublicTab(storageKey, tab) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, tab);
  } catch {
    // Ignore storage errors.
  }
}

export default function PublicProjectDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const projectId = PUBLIC_PROJECT_ID;
  const activeTabStorageKey = buildProjectTabStateKey(
    projectId,
    'public-dashboard',
    'active',
  );

  const currentPath = location.pathname.split('/').pop();
  const activeTab = PUBLIC_TABS.includes(currentPath)
    ? currentPath
    : getStoredPublicTab(activeTabStorageKey);

  const handleTabChange = (value) => {
    setStoredPublicTab(activeTabStorageKey, value);
    navigate(`/explore/${value}`);
  };

  useEffect(() => {
    if (!PUBLIC_TABS.includes(currentPath)) return;
    setStoredPublicTab(activeTabStorageKey, currentPath);
  }, [activeTabStorageKey, currentPath]);

  const { data: statusRes, isLoading: isStatusLoading } = useQuery({
    queryKey: ['publicProjectStatus', projectId],
    queryFn: () => projectAPI.getPublicProjectStatus(projectId),
    staleTime: 5000,
    enabled: !!projectId,
  });

  const projectStatus = statusRes?.data?.status;
  const projectName = statusRes?.data?.name || 'Public Project';

  useEffect(() => {
    if (projectStatus !== 'ready') return;

    queryClient.prefetchQuery({
      queryKey: ['overviewPage', projectId, 'public'],
      queryFn: () => projectAPI.getPublicOverviewPage(projectId),
    });
    queryClient.prefetchQuery({
      queryKey: ['insightsPage', projectId, 'public'],
      queryFn: () => projectAPI.getPublicInsightsPage(projectId),
    });
    queryClient.prefetchQuery({
      queryKey: ['filesPage', projectId, 'public'],
      queryFn: () => projectAPI.getPublicFilesPage(projectId),
    });
    queryClient.prefetchQuery({
      queryKey: ['sourceFileList', projectId, 'public'],
      queryFn: () => projectAPI.getPublicSourceFileList(projectId),
    });
    queryClient.prefetchQuery({
      queryKey: ['projectChats', projectId, 'public'],
      queryFn: async () => ({ success: true, data: [] }),
    });
  }, [projectStatus, projectId, queryClient]);

  if (isStatusLoading || !projectStatus) {
    return (
      <div className="h-screen flex flex-col">
        <Header projectName={projectName} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-muted-foreground">Loading public explorer...</p>
          </div>
        </div>
      </div>
    );
  }

  if (projectStatus !== 'ready') {
    return (
      <div className="h-screen flex flex-col">
        <Header projectName={projectName} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-xl rounded-xl border bg-card p-8 text-center space-y-3">
            <h1 className="text-2xl font-semibold">Project is preparing</h1>
            <p className="text-muted-foreground">
              This public project is currently in status: {projectStatus}.
              Please check back in a few minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header projectName={projectName} />
      <div className="border-b px-4 pt-1.5 flex items-center justify-between gap-4">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList variant="line" className="justify-start *:cursor-pointer">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
            <TabsTrigger value="ask">Ask</TabsTrigger>
          </TabsList>
        </Tabs>
        <Badge
          variant="secondary"
          className="whitespace-nowrap text-xs font-semibold"
        >
          Public Demo
        </Badge>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <Navigate
                  to={getStoredPublicTab(activeTabStorageKey)}
                  replace
                />
              }
            />
            <Route
              path="overview"
              element={<Overview projectId={projectId} isPublic />}
            />
            <Route
              path="insights"
              element={<Insights projectId={projectId} isPublic />}
            />
            <Route
              path="files"
              element={<Files projectId={projectId} isPublic />}
            />
            <Route
              path="source"
              element={<Source projectId={projectId} isPublic />}
            />
            <Route
              path="ask"
              element={<Ask projectId={projectId} isPublic />}
            />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
