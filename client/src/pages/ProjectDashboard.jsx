import { lazy, Suspense, useEffect, useTransition } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectAPI } from '../services/api';
import Header from '@/components/Header';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
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

const PROJECT_TABS = ['overview', 'insights', 'files', 'source', 'ask'];

function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSwitchingTab, startTabTransition] = useTransition();

  // Determine active tab from current route
  const currentPath = location.pathname.split('/').pop();
  const activeTab = PROJECT_TABS.includes(currentPath)
    ? currentPath
    : 'overview';

  const handleTabChange = (value) => {
    if (value === activeTab) return;
    startTabTransition(() => {
      navigate(`/project/${id}/${value}`);
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

  // Check project status on mount
  const { data: statusRes, isLoading: isStatusLoading } = useQuery({
    queryKey: ['projectStatus', id],
    queryFn: () => projectAPI.getProjectStatus(id),
    enabled: !!id,
    staleTime: 5000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const projectStatus = statusRes?.data?.status;
  const projectName = statusRes?.data?.name || '';

  useEffect(() => {
    if (projectStatus === 'documenting') {
      navigate(`/upload?resume=${id}`, { replace: true });
    }
  }, [projectStatus, id, navigate]);

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

  // Loading state
  if (isStatusLoading || !projectStatus) {
    return (
      <div className="h-screen flex flex-col">
        <Header projectName={projectName} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header projectName={projectName} />
      <div className="border-b px-4 flex gap-6">
        {/* tabs */}
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
          <div className="flex items-center text-muted-foreground pr-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      {/* Sub Pages */}
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
            <Route path="overview" element={<Overview projectId={id} />} />
            <Route path="insights" element={<Insights projectId={id} />} />
            <Route path="files" element={<Files projectId={id} />} />
            <Route path="source" element={<Source projectId={id} />} />
            <Route path="ask" element={<Ask projectId={id} />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default ProjectDashboard;
