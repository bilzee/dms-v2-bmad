'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Clock, FileText } from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';
import type { PriorityQueueItem } from '@dms/shared';

interface ManualPriorityOverrideProps {
  isOpen: boolean;
  onClose: () => void;
  queueItem: PriorityQueueItem | null;
}

/**
 * ManualPriorityOverride component for coordinator control
 * Implements AC: 3 - Manual priority override capability
 */
export function ManualPriorityOverride({
  isOpen,
  onClose,
  queueItem,
}: ManualPriorityOverrideProps) {
  const { overridePriority, error } = useSyncStore();
  
  const [newPriority, setNewPriority] = useState<number[]>([50]);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens with new item
  useEffect(() => {
    if (queueItem && isOpen) {
      setNewPriority([queueItem.priorityScore || 50]);
      setJustification('');
    }
  }, [queueItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!queueItem || !justification.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await overridePriority(queueItem.id, newPriority[0], justification.trim());
      onClose();
      setJustification('');
    } catch (error) {
      // Error handling is managed by the store
      console.error('Priority override failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setJustification('');
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-orange-500';
    if (score >= 20) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 70) return 'Critical';
    if (score >= 40) return 'High';
    if (score >= 20) return 'Normal';
    return 'Low';
  };

  if (!queueItem) return null;

  const originalScore = queueItem.priorityScore || 0;
  const newScore = newPriority[0];
  const hasExistingOverride = !!queueItem.manualOverride;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Manual Priority Override
            </DialogTitle>
            <DialogDescription>
              Override the automatic priority calculation for this sync item. 
              This action requires justification and will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Queue Item Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {queueItem.type} • {queueItem.action}
                </span>
                <Badge variant="outline" className="text-xs">
                  {queueItem.id.slice(0, 8)}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Created: {new Date(queueItem.createdAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4" />
                  Reason: {queueItem.priorityReason || 'Automatic assignment'}
                </div>
              </div>
            </div>

            {/* Current Priority Display */}
            <div>
              <Label className="text-sm font-medium">Current Priority</Label>
              <div className="flex items-center gap-3 mt-2">
                <div 
                  className={`w-4 h-4 rounded-full ${getPriorityColor(originalScore)}`}
                />
                <span className="font-semibold">{originalScore}</span>
                <Badge variant="secondary">
                  {getPriorityLabel(originalScore)}
                </Badge>
              </div>
            </div>

            {/* Existing Override Info */}
            {hasExistingOverride && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-yellow-800 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Previous Override</span>
                </div>
                <div className="text-xs text-yellow-700 space-y-1">
                  <div>By: {queueItem.manualOverride!.coordinatorName}</div>
                  <div>From: {queueItem.manualOverride!.originalPriority} → {queueItem.manualOverride!.overridePriority}</div>
                  <div>Reason: {queueItem.manualOverride!.justification}</div>
                  <div>At: {new Date(queueItem.manualOverride!.timestamp).toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* New Priority Slider */}
            <div>
              <Label htmlFor="priority-slider" className="text-sm font-medium">
                New Priority Score
              </Label>
              <div className="mt-2 space-y-3">
                <Slider
                  id="priority-slider"
                  min={0}
                  max={100}
                  step={5}
                  value={newPriority}
                  onValueChange={setNewPriority}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Low (0)</span>
                  <span>Normal (50)</span>
                  <span>Critical (100)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-4 h-4 rounded-full ${getPriorityColor(newScore)}`}
                  />
                  <span className="font-semibold text-lg">{newScore}</span>
                  <Badge variant="secondary">
                    {getPriorityLabel(newScore)}
                  </Badge>
                  {newScore !== originalScore && (
                    <Badge variant={newScore > originalScore ? "destructive" : "default"}>
                      {newScore > originalScore ? '+' : ''}{newScore - originalScore}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Justification */}
            <div>
              <Label htmlFor="justification" className="text-sm font-medium">
                Justification <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="justification"
                placeholder="Explain why this priority change is necessary. Include specific reasons such as emergency conditions, coordinator assessment, or operational requirements."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="mt-2 min-h-[100px]"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This justification will be recorded in the audit log.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !justification.trim() || newScore === originalScore}
              className="min-w-[100px]"
            >
              {isSubmitting ? 'Applying...' : 'Apply Override'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}