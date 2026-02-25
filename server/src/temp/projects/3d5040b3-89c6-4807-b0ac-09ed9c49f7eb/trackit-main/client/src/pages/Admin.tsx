import { useEffect, useState } from 'react';
import { adminApi, User, DashboardStats, Feedback } from '@/api/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, ArrowLeftRight, WalletCards, Stars } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, statsData, feedbackData] = await Promise.all([
        adminApi.getAllUsers(),
        adminApi.getDashboardStats(),
        adminApi.getAllFeedback(),
      ]);
      setUsers(usersData.users);
      setStats(statsData.stats);
      setFeedback(feedbackData.feedback);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackStatusChange = async (
    feedbackId: string,
    newStatus: string
  ) => {
    try {
      await adminApi.updateFeedbackStatus(feedbackId, newStatus);
      setFeedback(
        feedback.map((f) =>
          f._id === feedbackId ? { ...f, status: newStatus as any } : f
        )
      );
      toast.success('Feedback status updated successfully');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to update feedback status'
      );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'issue':
        return 'bg-red-500/20 text-red-500';
      case 'bug-report':
        return 'bg-orange-500/20 text-orange-500';
      case 'feature-request':
        return 'bg-blue-500/20 text-blue-500';
      case 'review':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600/20 text-red-600';
      case 'high':
        return 'bg-orange-500/20 text-orange-500';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-fit w-full flex flex-col py-5 md:py-10 gap-6">
      <div className="head">
        <h1 className="title text-[27px] md:text-3xl font-bold">Admin</h1>
        <p className="hidden md:block text-sm md:text-base text-muted-foreground font-semibold">
          View users, statistics and handle feedback
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="px-4 py-3 border-2 rounded-lg shadow-sm">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-base font-semibold">Total Users</h3>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </div>
          <div className="px-4 py-3 border-2 rounded-lg shadow-sm">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium">Total Entries</h3>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
          </div>
          <div className="px-4 py-3 border-2 rounded-lg shadow-sm">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium">Total Budgets</h3>
              <WalletCards className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalBudgets}</div>
          </div>
          <div className="px-4 py-3 border-2 rounded-lg shadow-sm">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium">Total Chats</h3>
              <Stars className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalChats}</div>
          </div>
        </div>
      )}

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="feedback">
            Feedback
            {feedback.filter((f) => f.status === 'new').length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-xs rounded-full">
                {feedback.filter((f) => f.status === 'new').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead>Budgets</TableHead>
                <TableHead>Chats</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {user.role.toLocaleLowerCase().charAt(0).toUpperCase() +
                        user.role.toLocaleLowerCase().slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.counts.entries}</TableCell>
                  <TableCell>{user.counts.budgets}</TableCell>
                  <TableCell>{user.counts.chats}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No feedback yet
                  </TableCell>
                </TableRow>
              ) : (
                feedback.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.userId.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.userId.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(item.type)}>
                        {item.type.replace('-', ' ').charAt(0).toUpperCase() +
                          item.type.replace('-', ' ').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(item.priority)}>
                        {item.priority.charAt(0).toUpperCase() +
                          item.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={item.message}>
                        {item.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(value) =>
                          handleFeedbackStatusChange(item._id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
