'use client';

import { useState } from 'react';
import { ClockIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { buttonStyles, inputStyles } from '@/utils/styles';
import { TimeSlot, CollectionHours } from '@/types';

export type { CollectionHours };

interface CollectionHoursEditorProps {
  initialHours?: CollectionHours;
  isEditing: boolean;
  onSave?: (hours: CollectionHours) => void;
  // New optional controlled mode props
  hours?: CollectionHours; // when provided, component becomes controlled
  onChange?: (hours: CollectionHours) => void; // called whenever hours change
}

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const defaultHours: CollectionHours = {
  monday: [{ open: '09:00', close: '18:00' }],
  tuesday: [{ open: '09:00', close: '18:00' }],
  wednesday: [{ open: '09:00', close: '18:00' }],
  thursday: [{ open: '09:00', close: '18:00' }],
  friday: [{ open: '09:00', close: '18:00' }],
  saturday: [{ open: '10:00', close: '16:00' }],
  sunday: [], // Closed
};

export default function CollectionHoursEditor({ 
  initialHours = defaultHours, 
  isEditing, 
  onSave,
  hours: controlledHours,
  onChange,
}: CollectionHoursEditorProps) {
  const [internalHours, setInternalHours] = useState<CollectionHours>(initialHours);

  const hours = controlledHours || internalHours;

  const updateHours = (updater: (prev: CollectionHours) => CollectionHours) => {
    if (controlledHours) {
      const newVal = updater(controlledHours);
      onChange?.(newVal);
    } else {
      setInternalHours(prev => {
        const newVal = updater(prev);
        onChange?.(newVal);
        return newVal;
      });
    }
  };

  const handleTimeChange = (day: string, slotIndex: number, field: 'open' | 'close', value: string) => {
    updateHours(prev => {
      const current = prev[day] || [];
      return {
        ...prev,
        [day]: current.map((slot, index) => 
          index === slotIndex ? { ...slot, [field]: value } : slot
        )
      }; 
    });
  };

  const addTimeSlot = (day: string) => {
    updateHours(prev => {
      const current = prev[day] || [];
      return {
        ...prev,
        [day]: [...current, { open: '09:00', close: '17:00' }]
      };
    });
  };

  const removeTimeSlot = (day: string, slotIndex: number) => {
    updateHours(prev => {
      const current = prev[day] || [];
      return {
        ...prev,
        [day]: current.filter((_, index) => index !== slotIndex)
      };
    });
  };

  const toggleDayClosed = (day: string) => {
    updateHours(prev => {
      const current = prev[day] || [];
      return {
        ...prev,
        [day]: current.length === 0 ? [{ open: '09:00', close: '17:00' }] : []
      };
    });
  };

  const formatDisplayTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatTimeRange = (slots: TimeSlot[]) => {
    if (slots.length === 0) return 'Closed';
    return slots.map(slot => `${formatDisplayTime(slot.open)} - ${formatDisplayTime(slot.close)}`).join(', ');
  };

  if (!isEditing) {
    return (
      <div className="space-y-3">
        {daysOfWeek.map(({ key, label }) => (
          <div key={key} className="flex justify-between items-center py-2">
            <span className="font-medium text-gray-700">{label}:</span>
            <span className="text-gray-600">{formatTimeRange(hours[key] || [])}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {daysOfWeek.map(({ key, label }) => {
        const daySlots = hours[key] || [];
        const isClosed = daySlots.length === 0;

        return (
          <div key={key} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-900">{label}</h4>
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isClosed}
                    onChange={() => toggleDayClosed(key)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Closed</span>
                </label>
                {!isClosed && (
                  <button
                    type="button"
                    onClick={() => addTimeSlot(key)}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200"
                    title="Add time slot"
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    Add Slot
                  </button>
                )}
              </div>
            </div>

            {!isClosed && (
              <div className="space-y-2">
                {daySlots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 flex-1">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={slot.open}
                        onChange={(e) => handleTimeChange(key, slotIndex, 'open', e.target.value)}
                        className={`${inputStyles} text-sm`}
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={slot.close}
                        onChange={(e) => handleTimeChange(key, slotIndex, 'close', e.target.value)}
                        className={`${inputStyles} text-sm`}
                      />
                    </div>
                    {daySlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(key, slotIndex)}
                        className="inline-flex items-center p-1 text-red-600 hover:text-red-800"
                        title="Remove time slot"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {onSave && (
        <div className="flex justify-end pt-4 border-t">
          <button
            type="button"
            onClick={() => onSave(hours)}
            className={buttonStyles.primary}
          >
            Save Collection Hours
          </button>
        </div>
      )}
    </div>
  );
}