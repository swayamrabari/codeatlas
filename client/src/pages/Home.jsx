import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    projectAPI
      .listProjects()
      .then((res) => {
        setProjects(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load projects:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-12 space-y-16">
        <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-primary/10 px-3 py-1">
              <span className="text-xs font-semibold text-primary">
                GenAI code comprehension
              </span>
            </div>
            <h1 className="text-4xl font-bold leading-tight text-foreground">
              Understand any codebase with visual maps, AI docs, and chat.
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload a ZIP or Git repo to get automatic architecture diagrams,
              feature grouping, and an AI assistant scoped to your project.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href="/upload">Get Started</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#recent">View Recent</a>
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-semibold text-foreground">Upload</p>
                  <p className="text-muted-foreground">
                    ZIP or Git repo ingestion
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-semibold text-foreground">Analysis</p>
                  <p className="text-muted-foreground">
                    Pattern-based code insights
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-semibold text-foreground">Diagrams</p>
                  <p className="text-muted-foreground">
                    Architecture & feature flows
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-semibold text-foreground">Chat</p>
                  <p className="text-muted-foreground">Context-aware Q&A</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="recent" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">
              Recent projects
            </h2>
            <Button variant="link" asChild>
              <a href="/upload">Upload new →</a>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  No projects yet. Upload your first codebase to get started.
                </p>
                <Button asChild>
                  <a href="/upload">Upload Project</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project._id}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/project/${project._id}`)}
                >
                  <CardContent className="pt-6">
                    <CardTitle className="text-base mb-2">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="text-sm mb-2">
                      {project.description ||
                        `${project.stats?.totalFiles || 0} files · ${project.stats?.projectType || 'unknown'}`}
                    </CardDescription>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {project.uploadType === 'github' ? '🔗 Git' : '📦 ZIP'}{' '}
                        · {project.stats?.totalFiles || 0} files
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          project.status === 'ready'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : project.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
