// Shared utility functions

import { v4 as uuidv4 } from 'uuid';

export function generateOfflineId(): string {
  return `offline_${uuidv4()}`;
}

export function generateUUID(): string {
  return uuidv4();
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}