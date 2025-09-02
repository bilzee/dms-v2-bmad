'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Donor } from '@dms/shared';
import { useDonorStore } from '@/stores/donor.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building, 
  Mail, 
  Phone, 
  Edit3, 
  Save, 
  X,
  Star,
  Calendar,
  Award,
  Package
} from 'lucide-react';

const DonorProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  organization: z.string().min(1, 'Organization is required').max(100, 'Organization cannot exceed 100 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 characters').max(20, 'Phone cannot exceed 20 characters').optional().or(z.literal('')),
});

type DonorProfileFormData = z.infer<typeof DonorProfileSchema>;

interface DonorProfileProps {
  donor: Donor | null;
  className?: string;
}

export function DonorProfile({ donor, className }: DonorProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { updateProfile, isUpdating, error } = useDonorStore();

  const form = useForm<DonorProfileFormData>({
    resolver: zodResolver(DonorProfileSchema),
    defaultValues: {
      name: donor?.name || '',
      organization: donor?.organization || '',
      phone: donor?.phone || '',
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = form;

  // Reset form when donor changes
  React.useEffect(() => {
    if (donor) {
      reset({
        name: donor.name,
        organization: donor.organization,
        phone: donor.phone || '',
      });
    }
  }, [donor, reset]);

  // Handle edit start
  const handleEditStart = () => {
    setIsEditing(true);
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setIsEditing(false);
    if (donor) {
      reset({
        name: donor.name,
        organization: donor.organization,
        phone: donor.phone || '',
      });
    }
  };

  // Handle form submission
  const onSubmit = async (data: DonorProfileFormData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (!donor) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No profile found</h3>
          <p className="text-gray-600">Unable to load donor profile information.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate profile completion
  const completionFields = [
    donor.name,
    donor.organization,
    donor.email,
    donor.phone,
  ];
  const filledFields = completionFields.filter(field => field && field.trim()).length;
  const completionPercentage = Math.round((filledFields / completionFields.length) * 100);

  // Get performance level
  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 80) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (score >= 70) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const performanceLevel = getPerformanceLevel(donor.performanceScore);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Donor Profile
            </CardTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditStart}
                className="flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel htmlFor="name">Name *</FormLabel>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Your name or contact person"
                  />
                  {errors.name && <FormMessage>{errors.name.message}</FormMessage>}
                </div>
                
                <div>
                  <FormLabel htmlFor="organization">Organization *</FormLabel>
                  <Input
                    id="organization"
                    {...register('organization')}
                    placeholder="Organization name"
                  />
                  {errors.organization && <FormMessage>{errors.organization.message}</FormMessage>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={donor.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>
                
                <div>
                  <FormLabel htmlFor="phone">Phone</FormLabel>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+234-xxx-xxx-xxxx"
                  />
                  {errors.phone && <FormMessage>{errors.phone.message}</FormMessage>}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isUpdating || !isDirty}
                  className="flex items-center gap-1"
                >
                  {isUpdating ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditCancel}
                  disabled={isUpdating}
                  className="flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{donor.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Building className="w-4 h-4 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Organization</p>
                      <p className="font-medium">{donor.organization}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{donor.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{donor.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Performance Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold">{donor.performanceScore}</span>
                  <span className="text-gray-500">/100</span>
                  <Badge className={performanceLevel.color}>
                    {performanceLevel.label}
                  </Badge>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600">Profile Completion</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{completionPercentage}%</span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <Calendar className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                <div className="text-lg font-bold">{donor.commitments.length}</div>
                <div className="text-xs text-gray-600">Total Commitments</div>
              </div>
              
              <div className="text-center">
                <Package className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                <div className="text-lg font-bold">
                  {donor.commitments.filter(c => c.status === 'DELIVERED').length}
                </div>
                <div className="text-xs text-gray-600">Delivered</div>
              </div>
              
              <div className="text-center">
                <Award className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                <div className="text-lg font-bold">{donor.achievements.length}</div>
                <div className="text-xs text-gray-600">Achievements</div>
              </div>
              
              <div className="text-center">
                <Star className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                <div className="text-lg font-bold">
                  {Math.round(donor.achievements.reduce((sum, a) => sum + a.performanceScore, 0) / Math.max(donor.achievements.length, 1))}
                </div>
                <div className="text-xs text-gray-600">Avg. Score</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Member Since</p>
              <p className="font-medium">
                {new Date(donor.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            
            <div>
              <p className="text-gray-600">Last Updated</p>
              <p className="font-medium">
                {new Date(donor.updatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion Tips */}
      {completionPercentage < 100 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 text-sm mb-3">
              Complete your profile to improve coordination efficiency:
            </p>
            <ul className="text-sm text-yellow-700 space-y-1">
              {!donor.phone && <li>• Add phone number for direct communication</li>}
              {completionPercentage < 100 && <li>• Verify all information is accurate</li>}
            </ul>
            {!isEditing && (
              <Button
                size="sm"
                onClick={handleEditStart}
                className="mt-3 bg-yellow-600 hover:bg-yellow-700"
              >
                Update Profile
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}