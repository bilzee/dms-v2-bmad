'use client'

/**
 * Example demonstrating how to use the Role-Specific Interface system from Story 7.3
 * This shows integration patterns for the new interface customization features
 */

import { useState } from 'react';
import { DashboardLayout, RoleQuickActions, MetricWidget } from '@/components/layouts/DashboardLayout';
import { 
  RoleSpecificForm, 
  RoleSpecificInput, 
  RoleSpecificSelect, 
  RoleSpecificTextarea,
  OrderedFields 
} from '@/components/shared/RoleSpecificForm';
import { PermissionGuard, WidgetGuard } from '@/components/shared/PermissionGuard';
import { useRoleInterface } from '@/hooks/useRoleInterface';

export function RoleInterfaceExample() {
  const { currentInterface, updatePreferences } = useRoleInterface();
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handlePreferenceChange = async (key: string, value: any) => {
    await updatePreferences({ [key]: value });
  };

  if (!currentInterface) {
    return <div>Loading role interface...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Role Interface Example - {currentInterface.roleName}</h1>
      
      {/* Example 1: Role-specific dashboard with customizable layout */}
      <section>
        <h2 className="text-xl font-semibold mb-4">1. Customizable Dashboard</h2>
        <DashboardLayout>
          {/* Custom content that integrates with role-specific widgets */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p>This content appears alongside role-specific dashboard widgets.</p>
            <p>Current layout: <strong>{currentInterface.dashboard.layout}</strong></p>
          </div>
        </DashboardLayout>
      </section>

      {/* Example 2: Quick actions based on role permissions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">2. Role-Specific Quick Actions</h2>
        <RoleQuickActions className="mb-4" />
        <p className="text-sm text-gray-600">
          Quick actions automatically filter based on your role and permissions.
        </p>
      </section>

      {/* Example 3: Role-specific form with conditional fields */}
      <section>
        <h2 className="text-xl font-semibold mb-4">3. Role-Specific Form Fields</h2>
        <div className="bg-white p-6 rounded-lg border">
          <RoleSpecificForm formType="assessment" className="space-y-4">
            <OrderedFields formType="assessment">
              {{
                type: (
                  <RoleSpecificSelect
                    formType="assessment"
                    fieldName="type"
                    label="Assessment Type"
                    options={[
                      { value: 'HEALTH', label: 'Health Assessment' },
                      { value: 'WASH', label: 'WASH Assessment' },
                      { value: 'SHELTER', label: 'Shelter Assessment' },
                      { value: 'FOOD', label: 'Food Assessment' },
                    ]}
                    value={formData.type}
                    onChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    requiredPermissions={['assessments:create']}
                  />
                ),
                location: (
                  <RoleSpecificInput
                    formType="assessment"
                    fieldName="location"
                    label="Location"
                    placeholder="Enter assessment location"
                    value={formData.location}
                    onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                    requiredPermissions={['assessments:create']}
                  />
                ),
                severity: (
                  <RoleSpecificSelect
                    formType="assessment"
                    fieldName="severity"
                    label="Severity Level"
                    options={[
                      { value: '1', label: 'Low (1)' },
                      { value: '2', label: 'Minor (2)' },
                      { value: '3', label: 'Moderate (3)' },
                      { value: '4', label: 'Severe (4)' },
                      { value: '5', label: 'Critical (5)' },
                    ]}
                    value={formData.severity}
                    onChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
                    requiredPermissions={['assessments:create']}
                  />
                ),
                description: (
                  <RoleSpecificTextarea
                    formType="assessment"
                    fieldName="description"
                    label="Description"
                    placeholder="Describe the assessment findings"
                    rows={4}
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                    requiredPermissions={['assessments:create']}
                  />
                ),
                'internal-notes': (
                  <RoleSpecificTextarea
                    formType="assessment"
                    fieldName="internal-notes"
                    label="Internal Notes"
                    description="This field is only visible to roles with appropriate permissions"
                    placeholder="Internal notes (hidden for most roles)"
                    rows={3}
                    value={formData.internalNotes}
                    onChange={(value) => setFormData(prev => ({ ...prev, internalNotes: value }))}
                    requiredPermissions={['assessments:write-internal']}
                  />
                ),
              }}
            </OrderedFields>
          </RoleSpecificForm>
        </div>
      </section>

      {/* Example 4: Permission-based content visibility */}
      <section>
        <h2 className="text-xl font-semibold mb-4">4. Permission-Based Content</h2>
        <div className="space-y-4">
          <PermissionGuard 
            requiredPermissions={['assessments:read']}
            showFallbackMessage={true}
          >
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p>This content is visible because you have assessment read permissions.</p>
            </div>
          </PermissionGuard>

          <PermissionGuard 
            allowedRoles={['COORDINATOR', 'ADMIN']}
            showFallbackMessage={true}
          >
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p>This content is only visible to Coordinators and Admins.</p>
            </div>
          </PermissionGuard>

          <PermissionGuard 
            requiredPermissions={['admin:super-secret']}
            showFallbackMessage={true}
          >
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p>This content requires special permissions you likely don&apos;t have.</p>
            </div>
          </PermissionGuard>
        </div>
      </section>

      {/* Example 5: Custom widgets with permission guards */}
      <section>
        <h2 className="text-xl font-semibold mb-4">5. Custom Protected Widgets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WidgetGuard widgetId="custom-widget-1">
            <MetricWidget
              title="Custom Metric"
              value="123"
              subtitle="Role-specific data"
              variant="success"
              refreshable={true}
              onRefresh={() => console.log('Refreshing custom metric')}
            />
          </WidgetGuard>

          <PermissionGuard requiredPermissions={['monitoring:read']}>
            <MetricWidget
              title="Advanced Analytics"
              value="98.5%"
              subtitle="Only visible with monitoring permissions"
              variant="default"
            />
          </PermissionGuard>
        </div>
      </section>

      {/* Example 6: Interface customization controls */}
      <section>
        <h2 className="text-xl font-semibold mb-4">6. Interface Customization</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3">Dashboard Layout Options</h3>
          <div className="space-x-2">
            {['single-column', 'two-column', 'three-column', 'grid'].map((layout) => (
              <button
                key={layout}
                onClick={() => handlePreferenceChange('dashboardLayout', layout)}
                className={`px-3 py-1 rounded text-sm ${
                  currentInterface.dashboard.layout === layout
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border'
                }`}
              >
                {layout.replace('-', ' ')}
              </button>
            ))}
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium mb-3">Refresh Interval</h3>
            <select
              value={currentInterface.dashboard.refreshInterval}
              onChange={(e) => handlePreferenceChange('refreshInterval', parseInt(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={5000}>5 seconds</option>
              <option value={15000}>15 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
            </select>
          </div>
        </div>
      </section>

      {/* Example 7: Debug information */}
      <section>
        <h2 className="text-xl font-semibold mb-4">7. Debug Information</h2>
        <PermissionGuard allowedRoles={['ADMIN']} fallback={<p>Debug info only available to admins</p>}>
          <div className="bg-gray-100 p-4 rounded-lg text-sm font-mono">
            <pre>{JSON.stringify(currentInterface, null, 2)}</pre>
          </div>
        </PermissionGuard>
      </section>
    </div>
  );
}