import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { projectAPI } from '../services/api';
import Docs from './Docs';
import Raw from './Raw';
import Source from './Explorer';
import Chat from './Chat';
import Header from '@/components/Header';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';

function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [projectStatus, setProjectStatus] = useState(null); // null = loading
  const pollRef = useRef(null);

  // Determine active tab from current route
  const currentPath = location.pathname.split('/').pop();
  const activeTab = ['docs', 'source', 'raw', 'chat'].includes(currentPath)
    ? currentPath
    : 'docs';

  const handleTabChange = (value) => {
    navigate(`/project/${id}/${value}`);
  };

  // Check project status on mount
  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await projectAPI.getProjectStatus(id);
        if (cancelled) return;
        const status = res.data?.status;
        if (status === 'documenting') {
          // Redirect to upload page with resume param
          navigate(`/upload?resume=${id}`, { replace: true });
        } else {
          setProjectStatus(status || 'ready');
        }
      } catch {
        if (!cancelled) setProjectStatus('ready');
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // Loading state
  if (projectStatus === null) {
    return (
      <div className="h-screen flex flex-col">
        <Header />
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
      <Header />
      <div className="border-b px-4 flex gap-6 font-medium">
        {/* tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList variant="line" className="justify-start *:cursor-pointer">
            <TabsTrigger value="docs">Docs</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
            <TabsTrigger value="raw">Raw Analysis</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sub Pages */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Routes>
          <Route path="/" element={<Navigate to="docs" replace />} />
          <Route path="docs" element={<Docs projectId={id} />} />
          <Route path="source" element={<Source projectId={id} />} />
          <Route path="raw" element={<Raw projectId={id} />} />
          <Route path="chat" element={<Chat projectId={id} />} />
        </Routes>
      </div>
    </div>
  );
}

export default ProjectDashboard;
