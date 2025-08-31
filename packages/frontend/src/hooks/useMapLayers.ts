'use client';

import { useState, useCallback } from 'react';

interface LayerVisibility {
  entities: boolean;
  assessments: boolean;
  responses: boolean;
  tiles: boolean;
}

interface LayerConfig {
  id: keyof LayerVisibility;
  name: string;
  description: string;
  icon: string;
  defaultVisible: boolean;
  zIndex: number;
}

interface UseMapLayersOptions {
  defaultVisibility?: Partial<LayerVisibility>;
}

export function useMapLayers(options: UseMapLayersOptions = {}) {
  const { defaultVisibility = {} } = options;

  const layerConfigs: LayerConfig[] = [
    {
      id: 'tiles',
      name: 'Base Map',
      description: 'OpenStreetMap base layer with roads and geography',
      icon: 'Map',
      defaultVisible: true,
      zIndex: 0,
    },
    {
      id: 'entities',
      name: 'Entities',
      description: 'Affected camps and communities with GPS coordinates',
      icon: 'MapPin',
      defaultVisible: true,
      zIndex: 1,
    },
    {
      id: 'assessments',
      name: 'Assessments',
      description: 'Assessment locations with verification status indicators',
      icon: 'BarChart3',
      defaultVisible: true,
      zIndex: 2,
    },
    {
      id: 'responses',
      name: 'Responses',
      description: 'Response activity locations with delivery status',
      icon: 'Truck',
      defaultVisible: true,
      zIndex: 3,
    },
  ];

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    entities: defaultVisibility.entities ?? true,
    assessments: defaultVisibility.assessments ?? true,
    responses: defaultVisibility.responses ?? true,
    tiles: defaultVisibility.tiles ?? true,
  });

  const [layerOpacity, setLayerOpacity] = useState<Record<keyof LayerVisibility, number>>({
    entities: 1.0,
    assessments: 1.0,
    responses: 1.0,
    tiles: 1.0,
  });

  const toggleLayer = useCallback((layerId: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  }, []);

  const setLayerVisible = useCallback((layerId: keyof LayerVisibility, visible: boolean) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: visible,
    }));
  }, []);

  const setLayerOpacityValue = useCallback((layerId: keyof LayerVisibility, opacity: number) => {
    setLayerOpacity(prev => ({
      ...prev,
      [layerId]: Math.max(0, Math.min(1, opacity)),
    }));
  }, []);

  const showAllLayers = useCallback(() => {
    setLayerVisibility({
      entities: true,
      assessments: true,
      responses: true,
      tiles: true,
    });
  }, []);

  const hideAllLayers = useCallback(() => {
    setLayerVisibility({
      entities: false,
      assessments: false,
      responses: false,
      tiles: true, // Keep base tiles visible
    });
  }, []);

  const resetLayerOpacity = useCallback(() => {
    setLayerOpacity({
      entities: 1.0,
      assessments: 1.0,
      responses: 1.0,
      tiles: 1.0,
    });
  }, []);

  // Get visible layers sorted by z-index
  const getVisibleLayers = useCallback(() => {
    return layerConfigs
      .filter(config => layerVisibility[config.id])
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [layerVisibility]);

  // Get layer statistics
  const getLayerStats = useCallback(() => {
    const visibleCount = Object.values(layerVisibility).filter(Boolean).length;
    const totalCount = Object.keys(layerVisibility).length;
    
    return {
      visibleCount,
      totalCount,
      allVisible: visibleCount === totalCount,
      noneVisible: visibleCount === 0,
      percentageVisible: Math.round((visibleCount / totalCount) * 100),
    };
  }, [layerVisibility]);

  // Get layer config by ID
  const getLayerConfig = useCallback((layerId: keyof LayerVisibility) => {
    return layerConfigs.find(config => config.id === layerId);
  }, []);

  return {
    layerVisibility,
    layerOpacity,
    layerConfigs,
    toggleLayer,
    setLayerVisible,
    setLayerOpacityValue,
    showAllLayers,
    hideAllLayers,
    resetLayerOpacity,
    getVisibleLayers,
    getLayerStats,
    getLayerConfig,
  };
}