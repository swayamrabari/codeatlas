import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <Header />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center px-6 py-12">
        <section className="mx-auto w-full max-w-3xl space-y-6 text-center">
          <div className="space-y-4">
            <Badge variant="secondary" className="font-semibold px-3 py-1">
              Open Source Demo
            </Badge>
            <h1 className="text-4xl font-bold leading-tight text-balance text-foreground">
              Explore a codebase with deterministic AI insights
            </h1>
            <p className="font-medium text-muted-foreground text-balance">
              CodeAtlas analyzes real-world repositories and turns them into an
              explorable knowledge space with AI-generated documentation,
              architecture insights, categorized files, and readable source
              view. For now it is focused on MERN stack ecosystems!
            </p>
          </div>

          <div className="rounded-xl max-w-fit border border-blue-500/35 bg-blue-500/10 px-5 py-4">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-blue-300">
                Demo Project Info
              </p>
              <p className="text-sm text-center text-balance text-blue-100/90">
                This public demo opens directly in explore mode with no login.
                Use it to quickly review project structure, documentation,
                insights, and source files.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/explore/overview">Explore Public Project</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
