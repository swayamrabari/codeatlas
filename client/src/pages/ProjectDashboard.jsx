import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import Docs from './Docs';
import Explorer from './Explorer';
import Raw from './Raw';
import Chat from './Chat';
import Header from '@/components/Header';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../components/ui/tabs';

function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from current route
  const currentPath = location.pathname.split('/').pop();
  const activeTab = ['docs', 'explorer', 'raw', 'chat'].includes(currentPath)
    ? currentPath
    : 'docs';

  const handleTabChange = (value) => {
    navigate(`/project/${id}/${value}`);
  };

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
            <TabsTrigger value="explorer">Explorer</TabsTrigger>
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
          <Route path="explorer" element={<Explorer projectId={id} />} />
          <Route path="raw" element={<Raw projectId={id} />} />
          <Route path="chat" element={<Chat projectId={id} />} />
        </Routes>
      </div>
    </div>
  );
}

export default ProjectDashboard;
