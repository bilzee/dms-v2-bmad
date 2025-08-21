// Application constants

export const ASSESSMENT_TYPES = {
  HEALTH: 'HEALTH',
  WASH: 'WASH',
  SHELTER: 'SHELTER',
  FOOD: 'FOOD',
  SECURITY: 'SECURITY',
  POPULATION: 'POPULATION',
} as const;

export const SYNC_STATUS = {
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  CONFLICT: 'CONFLICT',
  FAILED: 'FAILED',
} as const;

export const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  AUTO_VERIFIED: 'AUTO_VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export const GPS_ACCURACY_THRESHOLD = 50; // meters
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
export const SYNC_RETRY_LIMIT = 3;
export const OFFLINE_QUEUE_BATCH_SIZE = 10;