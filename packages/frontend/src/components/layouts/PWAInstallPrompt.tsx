'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else if (/windows|mac|linux/.test(userAgent) && !/mobile/.test(userAgent)) {
      setPlatform('desktop');
    }

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      
      // Show prompt after user has been active for a while
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000); // Show after 30 seconds
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      // Track installation for analytics
      console.log('PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA install');
      } else {
        console.log('User dismissed PWA install');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      setShowPrompt(false);
    }
  }, []);

  const getInstallInstructions = () => {
    switch (platform) {
      case 'ios':
        return {
          icon: <Smartphone className="h-5 w-5" />,
          title: 'Install DMS Field App',
          instructions: [
            'Tap the Share button in Safari',
            'Select "Add to Home Screen"',
            'Tap "Add" to install the app'
          ]
        };
      case 'android':
        return {
          icon: <Smartphone className="h-5 w-5" />,
          title: 'Install DMS Field App',
          instructions: [
            'Tap "Install" below',
            'Or use browser menu → "Add to Home Screen"'
          ]
        };
      case 'desktop':
        return {
          icon: <Monitor className="h-5 w-5" />,
          title: 'Install DMS Desktop App',
          instructions: [
            'Click "Install" below',
            'Or use browser address bar install icon'
          ]
        };
      default:
        return {
          icon: <Download className="h-5 w-5" />,
          title: 'Install DMS App',
          instructions: ['Add this app to your home screen for offline access']
        };
    }
  };

  // Don't show if not installable or already dismissed
  if (!showPrompt || !isInstallable) return null;

  const { icon, title, instructions } = getInstallInstructions();

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 text-red-600">
          {icon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="p-1 h-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Install for fast offline access during field operations:
        </p>
        <ul className="text-xs text-gray-500 space-y-1">
          {instructions.map((instruction, index) => (
            <li key={index}>• {instruction}</li>
          ))}
        </ul>
      </div>

      <div className="flex space-x-2">
        {deferredPrompt && platform !== 'ios' && (
          <Button 
            onClick={handleInstall}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Install
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={handleDismiss}
          size="sm"
          className="flex-1"
        >
          Not Now
        </Button>
      </div>
    </div>
  );
}