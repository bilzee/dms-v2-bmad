'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Wifi, WifiOff, Download, Cloud, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OfflineMapState {
  isOnline: boolean;
  tilesDownloaded: number;
  totalTiles: number;
  cacheSize: number; // in MB
  lastSync: Date | null;
  isDownloading: boolean;
  downloadProgress: number; // 0-100
}

interface OfflineMapContextType {
  state: OfflineMapState;
  downloadTiles: (bounds: any, maxZoom: number) => Promise<void>;
  clearCache: () => Promise<void>;
  syncTiles: () => Promise<void>;
}

const OfflineMapContext = createContext<OfflineMapContextType | null>(null);

interface OfflineMapProviderProps {
  children: ReactNode;
}

export function OfflineMapProvider({ children }: OfflineMapProviderProps) {
  const [state, setState] = useState<OfflineMapState>({
    isOnline: true, // Default to true for SSR, will be updated in useEffect
    tilesDownloaded: 0,
    totalTiles: 0,
    cacheSize: 0,
    lastSync: null,
    isDownloading: false,
    downloadProgress: 0,
  });

  // Monitor online/offline status
  useEffect(() => {
    // Set initial online status after mount
    setState(prev => ({ ...prev, isOnline: navigator.onLine }));

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

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

  const loadCacheInfo = async () => {
    try {
      // In production, this would check IndexedDB or other storage for cached tiles
      const mockCacheInfo = {
        tilesDownloaded: Math.floor(Math.random() * 1000) + 100,
        totalTiles: 1500,
        cacheSize: Math.floor(Math.random() * 50) + 10, // 10-60 MB
        lastSync: new Date(Date.now() - Math.random() * 86400000 * 7), // Within last week
      };
      
      setState(prev => ({
        ...prev,
        ...mockCacheInfo,
      }));
    } catch (error) {
      console.error('Failed to load cache info:', error);
    }
  };

  const downloadTiles = async (bounds: any, maxZoom: number = 15) => {
    setState(prev => ({ ...prev, isDownloading: true, downloadProgress: 0 }));
    
    try {
      // Mock tile download progress
      const totalTiles = Math.pow(4, maxZoom - 10) * 100; // Estimate based on zoom and area
      setState(prev => ({ ...prev, totalTiles }));
      
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate download time
        
        setState(prev => ({
          ...prev,
          downloadProgress: progress,
          tilesDownloaded: Math.floor((progress / 100) * totalTiles),
        }));
      }
      
      setState(prev => ({
        ...prev,
        isDownloading: false,
        downloadProgress: 100,
        lastSync: new Date(),
        cacheSize: prev.cacheSize + Math.floor(totalTiles / 50), // Estimate cache size increase
      }));
      
    } catch (error) {
      console.error('Failed to download tiles:', error);
      setState(prev => ({ ...prev, isDownloading: false, downloadProgress: 0 }));
    }
  };

  const clearCache = async () => {
    try {
      // In production, this would clear IndexedDB cache
      setState(prev => ({
        ...prev,
        tilesDownloaded: 0,
        cacheSize: 0,
        lastSync: null,
      }));
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const syncTiles = async () => {
    if (!state.isOnline) return;
    
    try {
      // Mock sync operation
      setState(prev => ({ ...prev, isDownloading: true, downloadProgress: 0 }));
      
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setState(prev => ({ ...prev, downloadProgress: progress }));
      }
      
      setState(prev => ({
        ...prev,
        isDownloading: false,
        downloadProgress: 100,
        lastSync: new Date(),
      }));
      
    } catch (error) {
      console.error('Failed to sync tiles:', error);
      setState(prev => ({ ...prev, isDownloading: false }));
    }
  };

  const contextValue: OfflineMapContextType = {
    state,
    downloadTiles,
    clearCache,
    syncTiles,
  };

  return (
    <OfflineMapContext.Provider value={contextValue}>
      {children}
    </OfflineMapContext.Provider>
  );
}

export function useOfflineMap() {
  const context = useContext(OfflineMapContext);
  if (!context) {
    throw new Error('useOfflineMap must be used within OfflineMapProvider');
  }
  return context;
}

// Offline Map Status Component
export function OfflineMapStatus() {
  const { state, syncTiles, clearCache } = useOfflineMap();

  const getCacheStatusBadge = () => {
    if (!state.isOnline) return { variant: 'destructive' as const, text: 'OFFLINE' };
    if (state.isDownloading) return { variant: 'secondary' as const, text: 'SYNCING' };
    if (state.tilesDownloaded > 0) return { variant: 'default' as const, text: 'CACHED' };
    return { variant: 'outline' as const, text: 'ONLINE' };
  };

  const cacheStatus = getCacheStatusBadge();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {state.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          Offline Map Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Connection Status:</span>
          <Badge variant={cacheStatus.variant} className="flex items-center gap-1">
            {state.isOnline ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
            {cacheStatus.text}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Cached Tiles:</span>
          <span className="text-sm font-medium">
            {state.tilesDownloaded.toLocaleString()} / {state.totalTiles.toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Cache Size:</span>
          <span className="text-sm font-medium">{state.cacheSize.toFixed(1)} MB</span>
        </div>
        
        {state.lastSync && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Last Sync:</span>
            <span className="text-sm">{state.lastSync.toLocaleDateString()}</span>
          </div>
        )}
        
        {state.isDownloading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Download Progress:</span>
              <span className="text-sm font-medium">{state.downloadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${state.downloadProgress}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={syncTiles}
            disabled={!state.isOnline || state.isDownloading}
            className="flex-1"
          >
            <Download className="h-3 w-3 mr-1" />
            Sync
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearCache}
            disabled={state.isDownloading}
            className="flex-1"
          >
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}