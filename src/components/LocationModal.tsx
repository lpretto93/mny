import { useState, useEffect } from 'react';
import LocationPicker from './LocationPicker';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
}

export default function LocationModal({ isOpen, onClose, location, onLocationSelect }: LocationModalProps) {
  const [currentLocation, setCurrentLocation] = useState(location);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentLocation(location);
  }, [location]);

  const handleLocationChange = async (newLocation: { lat: number; lng: number }) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLocation.lat}&lon=${newLocation.lng}`
      );
      const data = await response.json();
      setCurrentLocation({
        lat: newLocation.lat,
        lng: newLocation.lng,
        address: data.display_name || `${newLocation.lat}, ${newLocation.lng}`,
      });
    } catch (error) {
      console.error('Error getting address:', error);
      setCurrentLocation({
        lat: newLocation.lat,
        lng: newLocation.lng,
        address: `${newLocation.lat}, ${newLocation.lng}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    onLocationSelect(currentLocation);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="location-modal">
      <div className="location-modal-content">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Select Location</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4">
          <LocationPicker
            location={{ lat: currentLocation.lat, lng: currentLocation.lng }}
            onLocationChange={handleLocationChange}
          />

          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Selected location:</p>
            {isLoading ? (
              <p className="text-sm text-gray-500">Getting address...</p>
            ) : (
              <p className="text-sm text-gray-900">{currentLocation.address}</p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={isLoading}
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}