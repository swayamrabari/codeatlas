// not found page
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center text-foreground">
      <section className="mx-auto w-full max-w-3xl space-y-6 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight text-balance text-foreground">
            404 - Page Not Found
          </h1>
          <p className="font-medium text-muted-foreground text-balance">
            Oops! The page you're looking for doesn't exist. It might have been
            removed or is temporarily unavailable.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">Go back home</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
