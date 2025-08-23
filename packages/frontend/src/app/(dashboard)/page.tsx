'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QueueSummary } from '@/components/features/sync';

export default function DashboardPage() {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Assessments',
      description: 'Create and manage disaster assessment reports',
      icon: '📋',
      href: '/assessments',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    },
    {
      title: 'Affected Entities',
      description: 'Manage camps and communities for assessment tracking',
      icon: '🏘️',
      href: '/entities',
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
    },
    {
      title: 'Responses',
      description: 'Coordinate and track disaster response activities',
      icon: '🚛',
      href: '/responses',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    },
    {
      title: 'Verification',
      description: 'Review and verify submitted assessments',
      icon: '✅',
      href: '/verification',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    },
    {
      title: 'Monitoring',
      description: 'Real-time monitoring and dashboard analytics',
      icon: '📊',
      href: '/monitoring',
      color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    },
    {
      title: 'Sync Queue',
      description: 'Monitor and manage offline assessment queue',
      icon: '🔄',
      href: '/queue',
      color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Disaster Management System
        </h1>
        <p className="text-gray-600">
          Coordinate disaster response through assessment, tracking, and management tools.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Assessments</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <span className="text-2xl">🏘️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Entities</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg mr-3">
              <span className="text-2xl">🚛</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Responses</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg mr-3">
              <span className="text-2xl">⏱️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Summary */}
      <div className="mb-8">
        <QueueSummary 
          className="max-w-md"
          onViewQueue={() => router.push('/queue')}
        />
      </div>

      {/* Main Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <div
            key={item.title}
            className={`p-6 rounded-lg border-2 cursor-pointer transition-colors ${item.color}`}
            onClick={() => router.push(item.href)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <span className="text-3xl mr-3">{item.icon}</span>
                  <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
                </div>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(item.href);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Open
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 text-center text-gray-500">
            <p>No recent activity to display.</p>
            <p className="text-sm mt-2">
              Activity from assessments, entity management, and responses will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}