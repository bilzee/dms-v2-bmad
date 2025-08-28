/**
 * ConnectivityDetector Service
 * 
 * Provides unified connectivity monitoring using multiple browser APIs:
 * - Navigator.connection for network information
 * - Online/offline events
 * - Battery API for power management
 * - Custom connectivity quality assessment
 */

export interface ConnectivityStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastConnected: Date;
  networkSpeed?: number; // Mbps estimate
  batteryLevel?: number; // 0-100
  isCharging?: boolean;
}

export interface ConnectivityChangeCallback {
  (status: ConnectivityStatus): void;
}

export class ConnectivityDetector {
  private callbacks: Set<ConnectivityChangeCallback> = new Set();
  private currentStatus: ConnectivityStatus;
  private networkInfoSupported: boolean;
  private batterySupported: boolean;
  private battery: any; // Battery API type
  private lastConnectedTime: Date = new Date();

  constructor() {
    // Check for Network Information API support
    this.networkInfoSupported = 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator;
    this.batterySupported = 'getBattery' in navigator;

    // Initialize status
    this.currentStatus = {
      isOnline: navigator.onLine,
      connectionType: 'unknown',
      connectionQuality: navigator.onLine ? 'good' : 'offline',
      lastConnected: navigator.onLine ? new Date() : this.lastConnectedTime,
    };

    this.initializeDetection();
  }

  /**
   * Initialize all connectivity detection mechanisms
   */
  private async initializeDetection(): Promise<void> {
    // Setup online/offline event listeners
    this.setupOnlineOfflineListeners();

    // Setup Network Information API if supported
    if (this.networkInfoSupported) {
      this.setupNetworkInfoListener();
    }

    // Setup Battery API if supported
    if (this.batterySupported) {
      await this.setupBatteryListener();
    }

    // Initial status update
    await this.updateConnectivityStatus();
  }

  /**
   * Setup basic online/offline event listeners
   */
  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      this.lastConnectedTime = new Date();
      this.updateConnectivityStatus();
    });

    window.addEventListener('offline', () => {
      this.updateConnectivityStatus();
    });
  }

  /**
   * Setup Network Information API listener
   */
  private setupNetworkInfoListener(): void {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      // Listen for connection changes
      connection.addEventListener('change', () => {
        this.updateConnectivityStatus();
      });
    }
  }

  /**
   * Setup Battery API listener
   */
  private async setupBatteryListener(): Promise<void> {
    try {
      this.battery = await (navigator as any).getBattery();
      
      if (this.battery) {
        // Listen for battery changes
        this.battery.addEventListener('chargingchange', () => {
          this.updateConnectivityStatus();
        });

        this.battery.addEventListener('levelchange', () => {
          this.updateConnectivityStatus();
        });
      }
    } catch (error) {
      console.warn('Battery API not available:', error);
      this.batterySupported = false;
    }
  }

  /**
   * Update connectivity status based on all available APIs
   */
  private async updateConnectivityStatus(): Promise<void> {
    const isOnline = navigator.onLine;
    
    // Update last connected time if we're online
    if (isOnline) {
      this.lastConnectedTime = new Date();
    }

    const newStatus: ConnectivityStatus = {
      isOnline,
      connectionType: this.getConnectionType(),
      connectionQuality: isOnline ? this.getConnectionQuality() : 'offline',
      lastConnected: this.lastConnectedTime,
      networkSpeed: this.getNetworkSpeed(),
      batteryLevel: this.getBatteryLevel(),
      isCharging: this.getBatteryCharging(),
    };

    // Only notify if status actually changed
    if (this.hasStatusChanged(this.currentStatus, newStatus)) {
      this.currentStatus = newStatus;
      this.notifyCallbacks(newStatus);
    }
  }

  /**
   * Determine connection type from Network Information API
   */
  private getConnectionType(): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    if (!this.networkInfoSupported) return 'unknown';

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (!connection || !connection.type) return 'unknown';

    switch (connection.type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
      case '2g':
      case '3g':
      case '4g':
      case '5g':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'unknown';
    }
  }

  /**
   * Assess connection quality based on effective type and downlink
   */
  private getConnectionQuality(): 'excellent' | 'good' | 'poor' {
    if (!this.networkInfoSupported) return 'good'; // Default assumption

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (!connection) return 'good';

    // Use effective type if available
    if (connection.effectiveType) {
      switch (connection.effectiveType) {
        case '4g':
          return 'excellent';
        case '3g':
          return 'good';
        case '2g':
        case 'slow-2g':
          return 'poor';
        default:
          return 'good';
      }
    }

    // Fallback to downlink speed if available
    if (connection.downlink !== undefined) {
      if (connection.downlink >= 10) return 'excellent'; // 10+ Mbps
      if (connection.downlink >= 1.5) return 'good';     // 1.5+ Mbps
      return 'poor'; // < 1.5 Mbps
    }

    return 'good';
  }

  /**
   * Get estimated network speed in Mbps
   */
  private getNetworkSpeed(): number | undefined {
    if (!this.networkInfoSupported) return undefined;

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    return connection?.downlink;
  }

  /**
   * Get battery level (0-100)
   */
  private getBatteryLevel(): number | undefined {
    if (!this.batterySupported || !this.battery) return undefined;
    return Math.round(this.battery.level * 100);
  }

  /**
   * Get battery charging status
   */
  private getBatteryCharging(): boolean | undefined {
    if (!this.batterySupported || !this.battery) return undefined;
    return this.battery.charging;
  }

  /**
   * Check if connectivity status has meaningfully changed
   */
  private hasStatusChanged(oldStatus: ConnectivityStatus, newStatus: ConnectivityStatus): boolean {
    return (
      oldStatus.isOnline !== newStatus.isOnline ||
      oldStatus.connectionType !== newStatus.connectionType ||
      oldStatus.connectionQuality !== newStatus.connectionQuality ||
      oldStatus.batteryLevel !== newStatus.batteryLevel ||
      oldStatus.isCharging !== newStatus.isCharging ||
      Math.abs((oldStatus.networkSpeed || 0) - (newStatus.networkSpeed || 0)) > 1
    );
  }

  /**
   * Notify all registered callbacks of status change
   */
  private notifyCallbacks(status: ConnectivityStatus): void {
    this.callbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Connectivity callback error:', error);
      }
    });
  }

  /**
   * Subscribe to connectivity changes
   */
  public onConnectivityChange(callback: ConnectivityChangeCallback): () => void {
    this.callbacks.add(callback);

    // Provide current status immediately
    callback(this.currentStatus);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Get current connectivity status
   */
  public getStatus(): ConnectivityStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if device has good connectivity for sync operations
   */
  public isGoodForSync(): boolean {
    const status = this.getStatus();
    
    // Must be online
    if (!status.isOnline) return false;

    // Check connection quality
    if (status.connectionQuality === 'poor') return false;

    // Check battery level if available (don't sync if battery is very low and not charging)
    if (status.batteryLevel !== undefined && !status.isCharging && status.batteryLevel < 15) {
      return false;
    }

    return true;
  }

  /**
   * Get sync suitability score (0-100)
   * Higher scores indicate better conditions for sync
   */
  public getSyncSuitabilityScore(): number {
    const status = this.getStatus();
    let score = 0;

    // Base score for being online
    if (!status.isOnline) return 0;
    score += 30;

    // Connection quality score
    switch (status.connectionQuality) {
      case 'excellent':
        score += 40;
        break;
      case 'good':
        score += 25;
        break;
      case 'poor':
        score += 5;
        break;
    }

    // Connection type bonus
    switch (status.connectionType) {
      case 'wifi':
      case 'ethernet':
        score += 20;
        break;
      case 'cellular':
        score += 10;
        break;
      case 'unknown':
        score += 5;
        break;
    }

    // Battery considerations
    if (status.batteryLevel !== undefined) {
      if (status.isCharging) {
        score += 10; // Bonus for charging
      } else if (status.batteryLevel < 20) {
        score -= 15; // Penalty for low battery
      } else if (status.batteryLevel < 50) {
        score -= 5; // Small penalty for medium battery
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estimate time since last connectivity
   */
  public getTimeSinceLastConnected(): number {
    if (this.currentStatus.isOnline) return 0;
    return Date.now() - this.currentStatus.lastConnected.getTime();
  }

  /**
   * Perform a network quality test by measuring response time to a reliable endpoint
   */
  public async performConnectivityTest(): Promise<{
    success: boolean;
    responseTime: number;
    estimatedSpeed?: number;
  }> {
    const testUrl = '/api/v1/sync/connectivity-test'; // Lightweight endpoint
    const startTime = Date.now();

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        cache: 'no-cache',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        // Estimate speed based on response time (rough heuristic)
        let estimatedSpeed;
        if (responseTime < 100) estimatedSpeed = 20; // Excellent
        else if (responseTime < 300) estimatedSpeed = 10; // Good
        else if (responseTime < 1000) estimatedSpeed = 2; // Fair
        else estimatedSpeed = 0.5; // Poor

        return {
          success: true,
          responseTime,
          estimatedSpeed,
        };
      }

      return {
        success: false,
        responseTime,
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        responseTime: endTime - startTime,
      };
    }
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    this.callbacks.clear();
    // Note: We don't remove window event listeners as they're global and lightweight
  }
}

// Singleton instance for app-wide usage
export const connectivityDetector = new ConnectivityDetector();