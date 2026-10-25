'use client';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">{description}</p>}
    </div>
  );
}
