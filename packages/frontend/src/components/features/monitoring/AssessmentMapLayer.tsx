'use client';

import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { BarChart3, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
}

interface MapAssessmentData {
  id: string;
  type: 'HEALTH' | 'WASH' | 'SHELTER' | 'FOOD' | 'SECURITY' | 'POPULATION';
  date: Date;
  assessorName: string;
  coordinates: GPSCoordinates;
  entityName: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'AUTO_VERIFIED' | 'REJECTED';
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface AssessmentMapLayerProps {
  visible: boolean;
  onAssessmentSelect?: (assessment: MapAssessmentData) => void;
  refreshInterval?: number;
}

export function AssessmentMapLayer({
  visible = true,
  onAssessmentSelect,
  refreshInterval = 25000
}: AssessmentMapLayerProps) {
  const [assessments, setAssessments] = useState<MapAssessmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<MapAssessmentData | null>(null);

  const fetchAssessments = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/map/assessments');
      const data = await response.json();
      
      if (data.success) {
        setAssessments(data.data.map((assessment: any) => ({
          ...assessment,
          date: new Date(assessment.date),
          coordinates: {
            ...assessment.coordinates,
            timestamp: new Date(assessment.coordinates.timestamp),
          },
        })));
      }
    } catch (error) {
      console.error('Failed to fetch assessment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAssessments();
      
      const interval = setInterval(fetchAssessments, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [visible, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'AUTO_VERIFIED':
        return CheckCircle;
      case 'REJECTED':
        return XCircle;
      case 'PENDING':
        return Clock;
      default:
        return BarChart3;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'AUTO_VERIFIED':
        return '#22c55e'; // Green
      case 'REJECTED':
        return '#ef4444'; // Red
      case 'PENDING':
        return '#eab308'; // Yellow
      default:
        return '#9ca3af'; // Gray
    }
  };

  const [leafletIcons, setLeafletIcons] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const loadIcons = async () => {
      if (typeof window !== 'undefined') {
        const L = await import('leaflet');
        const iconMap = new Map();
        
        assessments.forEach(assessment => {
          const statusColor = getStatusColor(assessment.verificationStatus);
          const isCritical = assessment.priorityLevel === 'CRITICAL';
          
          const getTypeSymbol = () => {
            switch (assessment.type) {
              case 'HEALTH': return 'H';
              case 'WASH': return 'W';
              case 'SHELTER': return 'S';
              case 'FOOD': return 'F';
              case 'SECURITY': return 'X';
              case 'POPULATION': return 'P';
              default: return 'A';
            }
          };

          const iconHtml = `
            <div style="
              background-color: ${statusColor}; 
              width: 20px; 
              height: 20px; 
              border-radius: 3px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-weight: bold; 
              font-size: 10px;
              border: 2px solid ${isCritical ? '#dc2626' : 'white'}; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              ${isCritical ? 'animation: pulse 2s infinite;' : ''}
            ">
              ${getTypeSymbol()}
            </div>
            ${isCritical ? '<div style="position: absolute; top: -2px; right: -2px; background: #dc2626; color: white; border-radius: 50%; width: 8px; height: 8px; font-size: 6px; display: flex; align-items: center; justify-content: center;">!</div>' : ''}
          `;

          const icon = L.divIcon({
            html: iconHtml,
            className: 'assessment-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          
          iconMap.set(assessment.id, icon);
        });
        
        setLeafletIcons(iconMap);
      }
    };
    
    if (assessments.length > 0) {
      loadIcons();
    }
  }, [assessments]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'border-red-600';
      case 'HIGH':
        return 'border-orange-500';
      case 'MEDIUM':
        return 'border-yellow-500';
      case 'LOW':
        return 'border-green-500';
      default:
        return 'border-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'HEALTH':
        return 'bg-red-100 text-red-800';
      case 'WASH':
        return 'bg-blue-100 text-blue-800';
      case 'SHELTER':
        return 'bg-purple-100 text-purple-800';
      case 'FOOD':
        return 'bg-orange-100 text-orange-800';
      case 'SECURITY':
        return 'bg-gray-100 text-gray-800';
      case 'POPULATION':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAssessmentClick = (assessment: MapAssessmentData) => {
    setSelectedAssessment(assessment);
    onAssessmentSelect?.(assessment);
  };

  if (!visible) return null;

  return (
    <>
      {/* Assessment Markers */}
      {assessments.map((assessment) => (
        <Marker
          key={assessment.id}
          position={[assessment.coordinates.latitude, assessment.coordinates.longitude]}
          icon={leafletIcons.get(assessment.id)}
          eventHandlers={{
            click: () => handleAssessmentClick(assessment),
          }}
        >
          <Popup>
            <div className="p-3 min-w-[250px]">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-sm">Assessment Details</h3>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span className={`px-2 py-1 rounded ${getTypeColor(assessment.type)}`}>
                    {assessment.type}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Status:</span>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const StatusIcon = getStatusIcon(assessment.verificationStatus);
                      return <StatusIcon className="h-3 w-3" />;
                    })()}
                    <span className="capitalize">{assessment.verificationStatus.toLowerCase()}</span>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Priority:</span>
                  <span className={`px-1 py-0.5 rounded ${
                    assessment.priorityLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    assessment.priorityLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    assessment.priorityLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {assessment.priorityLevel}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span className="text-right max-w-[120px] truncate">{assessment.entityName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Assessor:</span>
                  <span className="text-right max-w-[120px] truncate">{assessment.assessorName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{assessment.date.toLocaleDateString()}</span>
                </div>
                
                <div className="border-t pt-2 mt-2 text-gray-600">
                  <div>GPS: ±{assessment.coordinates.accuracy}m</div>
                  <div>Method: {assessment.coordinates.captureMethod}</div>
                  <div>Coords: {assessment.coordinates.latitude.toFixed(4)}, {assessment.coordinates.longitude.toFixed(4)}</div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center pointer-events-auto z-[1000]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading assessments...</span>
          </div>
        </div>
      )}
    </>
  );
}