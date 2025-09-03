'use client';

import { useState, useEffect, useCallback } from 'react';

interface TileCache {
  z: number;
  x: number;
  y: number;
  data: Uint8Array;
  timestamp: Date;
  size: number; // in bytes
}

interface OfflineMapState {
  isOnline: boolean;
  tilesDownloaded: number;
  totalTiles: number;
  cacheSize: number; // in MB
  lastSync: Date | null;
  isDownloading: boolean;
  downloadProgress: number; // 0-100
  errorMessage: string | null;
}

interface MapBounds {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

interface UseOfflineMapOptions {
  maxCacheSize?: number; // in MB
  tileExpiryDays?: number;
}

export function useOfflineMap(options: UseOfflineMapOptions = {}) {
  const { maxCacheSize = 100, tileExpiryDays = 30 } = options;
  
  const [state, setState] = useState<OfflineMapState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    tilesDownloaded: 0,
    totalTiles: 0,
    cacheSize: 0,
    lastSync: null,
    isDownloading: false,
    downloadProgress: 0,
    errorMessage: null,
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, errorMessage: null }));
    };
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached tile information on mount
  useEffect(() => {
    loadCacheInfo();
  }, []);

  const loadCacheInfo = useCallback(async () => {
    try {
      // In production, this would check IndexedDB for cached tiles
      // For now, generate mock cache info
      const storedInfo = localStorage.getItem('map-cache-info');
      
      if (storedInfo) {
        const cacheInfo = JSON.parse(storedInfo);
        setState(prev => ({
          ...prev,
          ...cacheInfo,
          lastSync: cacheInfo.lastSync ? new Date(cacheInfo.lastSync) : null,
        }));
      } else {
        // Initialize with empty cache
        setState(prev => ({
          ...prev,
          tilesDownloaded: 0,
          totalTiles: 0,
          cacheSize: 0,
          lastSync: null,
        }));
      }
    } catch (error) {
      console.error('Failed to load cache info:', error);
      setState(prev => ({ ...prev, errorMessage: 'Failed to load cache information' }));
    }
  }, []);

  const calculateTileCount = useCallback((bounds: MapBounds, minZoom: number, maxZoom: number) => {
    let totalTiles = 0;
    
    for (let z = minZoom; z <= maxZoom; z++) {
      const n = Math.pow(2, z);
      const latRadMin = (bounds.southWest.lat * Math.PI) / 180;
      const latRadMax = (bounds.northEast.lat * Math.PI) / 180;
      
      const xMin = Math.floor(((bounds.southWest.lng + 180) / 360) * n);
      const xMax = Math.floor(((bounds.northEast.lng + 180) / 360) * n);
      const yMin = Math.floor((1 - Math.log(Math.tan(latRadMax) + 1 / Math.cos(latRadMax)) / Math.PI) / 2 * n);
      const yMax = Math.floor((1 - Math.log(Math.tan(latRadMin) + 1 / Math.cos(latRadMin)) / Math.PI) / 2 * n);
      
      totalTiles += (xMax - xMin + 1) * (yMax - yMin + 1);
    }
    
    return totalTiles;
  }, []);

  const downloadTiles = useCallback(async (bounds: MapBounds, maxZoom: number = 15) => {
    if (!state.isOnline) {
      setState(prev => ({ ...prev, errorMessage: 'Cannot download tiles while offline' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isDownloading: true, 
      downloadProgress: 0, 
      errorMessage: null 
    }));
    
    try {
      const totalTiles = calculateTileCount(bounds, 10, maxZoom);
      setState(prev => ({ ...prev, totalTiles }));
      
      // Mock tile download with progress updates
      for (let progress = 0; progress <= 100; progress += 5) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate download time
        
        const tilesDownloaded = Math.floor((progress / 100) * totalTiles);
        const cacheSize = tilesDownloaded * 0.02; // Estimate 20KB per tile
        
        setState(prev => ({
          ...prev,
          downloadProgress: progress,
          tilesDownloaded,
          cacheSize,
        }));
      }
      
      const finalState = {
        isDownloading: false,
        downloadProgress: 100,
        lastSync: new Date(),
        tilesDownloaded: totalTiles,
        cacheSize: totalTiles * 0.02,
      };
      
      setState(prev => ({ ...prev, ...finalState }));
      
      // Store cache info in localStorage
      localStorage.setItem('map-cache-info', JSON.stringify({
        tilesDownloaded: totalTiles,
        totalTiles,
        cacheSize: finalState.cacheSize,
        lastSync: finalState.lastSync.toISOString(),
      }));
      
    } catch (error) {
      console.error('Failed to download tiles:', error);
      setState(prev => ({ 
        ...prev, 
        isDownloading: false, 
        downloadProgress: 0,
        errorMessage: 'Failed to download map tiles'
      }));
    }
  }, [state.isOnline, calculateTileCount]);

  const clearCache = useCallback(async () => {
    try {
      // In production, this would clear IndexedDB cache
      localStorage.removeItem('map-cache-info');
      
      setState(prev => ({
        ...prev,
        tilesDownloaded: 0,
        totalTiles: 0,
        cacheSize: 0,
        lastSync: null,
        downloadProgress: 0,
        errorMessage: null,
      }));
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setState(prev => ({ ...prev, errorMessage: 'Failed to clear cache' }));
    }
  }, []);

  const syncTiles = useCallback(async () => {
    if (!state.isOnline) {
      setState(prev => ({ ...prev, errorMessage: 'Cannot sync tiles while offline' }));
      return;
    }
    
    try {
      setState(prev => ({ 
        ...prev, 
        isDownloading: true, 
        downloadProgress: 0,
        errorMessage: null 
      }));
      
      // Mock sync operation
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setState(prev => ({ ...prev, downloadProgress: progress }));
      }
      
      setState(prev => ({
        ...prev,
        isDownloading: false,
        downloadProgress: 100,
        lastSync: new Date(),
      }));
      
      // Update stored cache info
      const cacheInfo = {
        tilesDownloaded: state.tilesDownloaded,
        totalTiles: state.totalTiles,
        cacheSize: state.cacheSize,
        lastSync: new Date().toISOString(),
      };
      localStorage.setItem('map-cache-info', JSON.stringify(cacheInfo));
      
    } catch (error) {
      console.error('Failed to sync tiles:', error);
      setState(prev => ({ 
        ...prev, 
        isDownloading: false,
        errorMessage: 'Failed to sync map tiles'
      }));
    }
  }, [state.isOnline, state.tilesDownloaded, state.totalTiles, state.cacheSize]);

  // Get cache status
  const getCacheStatus = useCallback(() => {
    if (!state.isOnline) return 'offline';
    if (state.isDownloading) return 'syncing';
    if (state.tilesDownloaded > 0) return 'cached';
    return 'online';
  }, [state.isOnline, state.isDownloading, state.tilesDownloaded]);

  // Check if cache needs refresh
  const needsCacheRefresh = useCallback(() => {
    if (!state.lastSync) return true;
    
    const daysSinceSync = (Date.now() - state.lastSync.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSync > tileExpiryDays;
  }, [state.lastSync, tileExpiryDays]);

  // Get cache usage percentage
  const getCacheUsage = useCallback(() => {
    return Math.round((state.cacheSize / maxCacheSize) * 100);
  }, [state.cacheSize, maxCacheSize]);

  // Check if cache is full
  const isCacheFull = useCallback(() => {
    return state.cacheSize >= maxCacheSize;
  }, [state.cacheSize, maxCacheSize]);

  return {
    ...state,
    downloadTiles,
    clearCache,
    syncTiles,
    getCacheStatus,
    needsCacheRefresh,
    getCacheUsage,
    isCacheFull,
  };
}