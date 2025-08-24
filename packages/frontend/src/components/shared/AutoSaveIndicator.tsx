'use client';

import { Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved?: Date;
}

export function AutoSaveIndicator({ isSaving, lastSaved }: AutoSaveIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isSaving ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </>
      ) : lastSaved ? (
        <>
          <Check className="w-3 h-3 text-status-verified" />
          Saved {formatDistanceToNow(lastSaved)} ago
        </>
      ) : null}
    </div>
  );
}