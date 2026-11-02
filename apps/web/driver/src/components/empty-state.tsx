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
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-[hsl(var(--mint))]/5 ring-1 ring-[hsl(var(--mint))]/10" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(var(--mint))]/10 text-[hsl(var(--mint))] ring-1 ring-[hsl(var(--mint))]/15">
          <Icon className="h-7 w-7" />
        </div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">{description}</p>}
    </div>
  );
}
