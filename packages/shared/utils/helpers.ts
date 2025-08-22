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

export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isWithinNigeriaBounds(lat: number, lng: number): boolean {
  // Nigeria approximate bounds: lat 4°-14°N, lng 3°-15°E
  return lat >= 4 && lat <= 14 && lng >= 3 && lng <= 15;
}