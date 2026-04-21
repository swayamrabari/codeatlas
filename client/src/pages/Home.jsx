import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <Header />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center px-6 py-12">
        <section className="mx-auto w-full max-w-3xl space-y-6 text-center">
          <div className="space-y-4">
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

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/explore/overview">Explore Demo Project</Link>
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
