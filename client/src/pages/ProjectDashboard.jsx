import { lazy, Suspense, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectAPI } from '../services/api';
import Header from '@/components/Header';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';

const Overview = lazy(() => import('./Overview'));
const Files = lazy(() => import('./Files'));
const Source = lazy(() => import('./Source'));
const Insights = lazy(() => import('./Insights'));
const Ask = lazy(() => import('./Ask'));

function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Determine active tab from current route
  const currentPath = location.pathname.split('/').pop();
  const activeTab = ['overview', 'source', 'files', 'insights', 'ask'].includes(
    currentPath,
  )
    ? currentPath
    : 'overview';

  const handleTabChange = (value) => {
    navigate(`/project/${id}/${value}`);
  };

  // Check project status on mount
  const { data: statusRes, isLoading: isStatusLoading } = useQuery({
    queryKey: ['projectStatus', id],
    queryFn: () => projectAPI.getProjectStatus(id),
    staleTime: 5000,
  });

  const projectStatus = statusRes?.data?.status;
  const projectName = statusRes?.data?.name || '';

  useEffect(() => {
    if (projectStatus === 'documenting') {
      navigate(`/upload?resume=${id}`, { replace: true });
    } else if (projectStatus === 'ready') {
      // Prefetch core page datasets so route switches feel instant.
      queryClient.prefetchQuery({
        queryKey: ['overviewPage', id],
        queryFn: () => projectAPI.getOverviewPage(id),
      });
      queryClient.prefetchQuery({
        queryKey: ['insightsPage', id],
        queryFn: () => projectAPI.getInsightsPage(id),
      });
      queryClient.prefetchQuery({
        queryKey: ['filesPage', id],
        queryFn: () => projectAPI.getFilesPage(id),
      });
      queryClient.prefetchQuery({
        queryKey: ['sourceFileList', id],
        queryFn: () => projectAPI.getSourceFileList(id),
      });
      queryClient.prefetchQuery({
        queryKey: ['projectChats', id],
        queryFn: () => projectAPI.listProjectChats(id),
      });
    }
  }, [projectStatus, id, navigate, queryClient]);

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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
            <TabsTrigger value="ask">Ask</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sub Pages */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
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
