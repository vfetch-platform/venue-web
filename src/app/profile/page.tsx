'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import CollectionHoursEditor, { CollectionHours } from '@/components/CollectionHoursEditor';
import { useAuthStore } from '@/store/auth';
import { UpdateVenueForm } from '@/types';
import { api, ApiError } from '@/services/api';
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ClockIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { buttonStyles, cardStyles, inputStyles } from '@/utils/styles';

export default function ProfilePage() {
  const { venue, setVenue } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const DEFAULT_HOURS: CollectionHours = {
    monday: [{ open: '09:00', close: '18:00' }],
    tuesday: [{ open: '09:00', close: '18:00' }],
    wednesday: [{ open: '09:00', close: '18:00' }],
    thursday: [{ open: '09:00', close: '18:00' }],
    friday: [{ open: '09:00', close: '18:00' }],
    saturday: [{ open: '10:00', close: '16:00' }],
    sunday: [],
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateVenueForm>({
    email: venue?.email || '',
    phone: venue?.phone || '',
  });
  // Manage schedule data for collection hours
  const [scheduleData, setScheduleData] = useState<CollectionHours>(
    (venue?.schedule as CollectionHours) || DEFAULT_HOURS
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing || !venue) return;
    setIsLoading(true);
    setError(null);

    try {
      const updateData = {
        ...formData,
        schedule: scheduleData,
      };

      const response = await api.venues.update(venue.id, updateData);
      
      if (response.success && response.data) {
        setVenue(response.data);
        setIsEditing(false);
      } else {
        throw new Error(response.error || 'Failed to update venue');
      }
    } catch (error) {
      console.error('Error updating venue:', error);
      
      let errorMessage = 'Failed to update venue';
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      email: venue?.email || '',
      phone: venue?.phone || '',
    });
    setScheduleData((venue?.schedule as CollectionHours) || DEFAULT_HOURS);
    setIsEditing(false);
    setError(null);
  };

  useEffect(() => {
    if (!isEditing) {
      setFormData({
        email: venue?.email || '',
        phone: venue?.phone || '',
      });
      setScheduleData((venue?.schedule as CollectionHours) || DEFAULT_HOURS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, isEditing]);

  if (!hydrated) {
    return null; // or a skeleton placeholder
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Venue Profile</h1>
          <p className="text-slate-600 mt-1">
            View your venue information and edit contact details
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <div className={`${cardStyles} p-6`}>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <BuildingStorefrontIcon className="w-10 h-10 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{venue?.name || 'Venue Name'}</h3>
                  <p className="text-sm text-gray-500 capitalize">{venue?.type || 'type'}</p>
                  <div className="mt-2 text-xs">
                    <span className={`inline-flex px-2 py-1 rounded-full font-semibold ${
                      venue?.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {venue?.status || 'pending'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2 text-sm text-gray-600">
                  <div className="flex items-start justify-center">
                    <MapPinIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{venue?.address ? `${venue.address}${venue.city ? ', ' + venue.city : ''}` : 'Address not set'}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <PhoneIcon className="w-4 h-4 mr-2" />
                    <span>{venue?.phone || 'Phone not set'}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <EnvelopeIcon className="w-4 h-4 mr-2" />
                    <span>{venue?.email || 'Email not set'}</span>
                  </div>
                  {venue?.website && (
                    <div className="flex items-center justify-center">
                      <GlobeAltIcon className="w-4 h-4 mr-2" />
                      <a 
                        href={venue.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {venue.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Editable Contact Information */}
          <div className="lg:col-span-1">
            <div className={`${cardStyles} p-6`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Contact Information
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`${buttonStyles.primary} text-sm px-3 py-1`}
                  >
                    <CogIcon className="h-4 w-4 mr-1 inline" />
                    Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {/* Contact Information */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    disabled={!isEditing}
                    className={`${inputStyles} ${!isEditing ? 'bg-gray-50 text-gray-500' : ''}`}
                    placeholder={!isEditing ? "No phone number set" : "Enter phone number"}
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    disabled={!isEditing}
                    className={`${inputStyles} ${!isEditing ? 'bg-gray-50 text-gray-500' : ''}`}
                    placeholder={!isEditing ? "No email set" : "Enter email"}
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Collection Schedule */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      Collection Schedule
                    </label>
                  </div>
                  <div className={`border border-gray-300 rounded-md p-3 ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}>
                    <CollectionHoursEditor
                      initialHours={venue?.schedule as CollectionHours}
                      isEditing={isEditing}
                      hours={scheduleData}
                      onChange={setScheduleData}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className={buttonStyles.secondary}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={buttonStyles.primary}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {!isEditing && !error && (
          <div className="text-center text-sm text-gray-600">
            Profile information is connected to the backend API
          </div>
        )}
      </div>
    </Layout>
  );
}