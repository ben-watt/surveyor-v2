import { ClipboardList, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface EmptyStateProps {
  searchQuery: string;
  hasFilters: boolean;
}

export function EmptyState({ searchQuery, hasFilters }: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <div className="relative m-auto flex max-w-[65px] items-center justify-center">
          <div className="absolute -inset-4 animate-pulse rounded-full bg-gradient-to-r from-primary/10 to-primary/5" />
          <div className="relative rounded-full bg-background p-6 ring-8 ring-background">
            <ClipboardList className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h3 className="mt-8 text-2xl font-semibold tracking-tight">No surveys found</h3>
        <p className="mt-2 text-muted-foreground">
          {searchQuery || hasFilters ? (
            <span className="flex items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              No surveys match your current filters. Try adjusting your search or filters.
            </span>
          ) : (
            'Get started by creating your first building survey.'
          )}
        </p>
        <Button
          onClick={() => router.push('/home/surveys/create')}
          className="mt-6 gap-2"
          size="lg"
        >
          <Plus className="h-5 w-5" />
          Create Survey
        </Button>
      </div>
    </div>
  );
}
