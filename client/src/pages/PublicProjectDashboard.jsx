import { lazy, Suspense, useEffect, useTransition } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectAPI, PUBLIC_PROJECT_ID } from '../services/api';
import Header from '@/components/Header';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

const loadOverviewPage = () => import('./Overview');
const loadFilesPage = () => import('./Files');
const loadSourcePage = () => import('./Source');
const loadInsightsPage = () => import('./Insights');
const loadAskPage = () => import('./Ask');

const Overview = lazy(loadOverviewPage);
const Files = lazy(loadFilesPage);
const Source = lazy(loadSourcePage);
const Insights = lazy(loadInsightsPage);
const Ask = lazy(loadAskPage);

const PUBLIC_TABS = ['overview', 'insights', 'files', 'source', 'ask'];

export default function PublicProjectDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSwitchingTab, startTabTransition] = useTransition();

  const projectId = PUBLIC_PROJECT_ID;

  const currentPath = location.pathname.split('/').pop();
  const activeTab = PUBLIC_TABS.includes(currentPath)
    ? currentPath
    : 'overview';

  const handleTabChange = (value) => {
    if (value === activeTab) return;
    startTabTransition(() => {
      navigate(`/explore/${value}`);
    });
  };

  const preloadTabChunk = (tab) => {
    if (tab === 'overview') return loadOverviewPage();
    if (tab === 'insights') return loadInsightsPage();
    if (tab === 'files') return loadFilesPage();
    if (tab === 'source') return loadSourcePage();
    if (tab === 'ask') return loadAskPage();
    return Promise.resolve();
  };

  const { data: statusRes, isLoading: isStatusLoading } = useQuery({
    queryKey: ['publicProjectStatus', projectId],
    queryFn: () => projectAPI.getPublicProjectStatus(projectId),
    staleTime: 5000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!projectId,
  });

  const projectStatus = statusRes?.data?.status;
  const projectName = statusRes?.data?.name || 'Public Project';

  useEffect(() => {
    if (projectStatus !== 'ready') return;

    const preload = () => {
      loadInsightsPage();
      loadFilesPage();
      loadSourcePage();
      loadAskPage();
    };

    if (typeof window === 'undefined') return;

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preload, 120);
    return () => window.clearTimeout(timeoutId);
  }, [projectStatus]);

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
            <TabsTrigger
              value="overview"
              onMouseEnter={() => preloadTabChunk('overview')}
              onFocus={() => preloadTabChunk('overview')}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              onMouseEnter={() => preloadTabChunk('insights')}
              onFocus={() => preloadTabChunk('insights')}
            >
              Insights
            </TabsTrigger>
            <TabsTrigger
              value="files"
              onMouseEnter={() => preloadTabChunk('files')}
              onFocus={() => preloadTabChunk('files')}
            >
              Files
            </TabsTrigger>
            <TabsTrigger
              value="source"
              onMouseEnter={() => preloadTabChunk('source')}
              onFocus={() => preloadTabChunk('source')}
            >
              Source
            </TabsTrigger>
            <TabsTrigger
              value="ask"
              onMouseEnter={() => preloadTabChunk('ask')}
              onFocus={() => preloadTabChunk('ask')}
            >
              Ask
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {isSwitchingTab && (
          <div className="flex items-center text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </div>
        )}
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
            <div className="min-h-full flex items-center justify-center">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate to="overview" replace />} />
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
