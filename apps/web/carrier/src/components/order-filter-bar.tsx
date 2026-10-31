'use client';
import { MapPin, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { localizeCity } from '@naqla/shared-utils';
import { cn } from '@/lib/utils';

export interface OrderFilterBarProps {
  /** Free-text search over order number / route / cargo. */
  search: string;
  onSearchChange: (v: string) => void;
  /** Selected origin-or-destination city, or 'ALL'. */
  city: string;
  onCityChange: (v: string) => void;
  /** City options — pass the cities present across the orders in view. */
  cities: string[];
  searchPlaceholder: string;
  allCitiesLabel: string;
  clearSearchLabel: string;
  className?: string;
}

/**
 * Reusable orders filter bar: text search + city dropdown. The order-status
 * filter is provided by the page's status tabs, so it is intentionally not
 * duplicated here. Filtering itself stays on the page (client-side over the
 * loaded orders) — this component only renders the controls.
 */
export function OrderFilterBar({
  search, onSearchChange, city, onCityChange, cities,
  searchPlaceholder, allCitiesLabel, clearSearchLabel, className,
}: OrderFilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      <div className="relative flex-1">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ps-9 pe-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground"
            aria-label={clearSearchLabel}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Select value={city} onValueChange={onCityChange}>
        <SelectTrigger className="w-full sm:w-56">
          <span className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={allCitiesLabel} />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{allCitiesLabel}</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>{localizeCity(c)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
