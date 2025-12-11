'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { registerAssetWarranty, RegisterWarrantyInput } from '@/app/actions/warrantyActions';

interface Asset {
  id: string;
  name: string;
  cost: number;
  created_at: string;
  categories?: { name: string } | { name: string }[];
  departments?: { name: string } | { name: string }[];
}

interface RegisterWarrantyButtonProps {
  asset: Asset;
}

export function RegisterWarrantyButton({ asset }: RegisterWarrantyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Form state
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [warrantyNotes, setWarrantyNotes] = useState('');

  // Helper to get category/department name
  const getCategoryName = () => {
    if (Array.isArray(asset.categories)) {
      return asset.categories[0]?.name ?? 'Unknown';
    }
    return asset.categories?.name ?? 'Unknown';
  };

  const getDepartmentName = () => {
    if (Array.isArray(asset.departments)) {
      return asset.departments[0]?.name ?? 'Unknown';
    }
    return asset.departments?.name ?? 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const today = new Date().toISOString();
    // Ensure date_purchased is in full ISO datetime format
    const purchaseDate = new Date(asset.created_at).toISOString();

    const input: RegisterWarrantyInput = {
      assetId: asset.id,
      assetName: asset.name,
      category: getCategoryName(),
      department: getDepartmentName(),
      cost: typeof asset.cost === 'number' ? asset.cost : parseFloat(asset.cost) || 0,
      datePurchased: purchaseDate,
      warrantyStartDate: today,
      warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate).toISOString() : '',
      warrantyNotes: warrantyNotes || undefined,
    };

    const result = await registerAssetWarranty(input);

    setIsLoading(false);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });

    if (result.success) {
      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
        setWarrantyEndDate('');
        setWarrantyNotes('');
      }, 2000);
    }
  };

  // Calculate min date (today) for warranty end date
  const minEndDate = new Date().toISOString().split('T')[0];
  
  // Default to 1 year from today
  const defaultEndDate = new Date();
  defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1);

  return (
    <>
      <Button
        variant="secondary"
        className="text-xs px-2 py-1"
        onClick={() => setIsOpen(true)}
      >
        Register Warranty
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Register Warranty</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Asset Info (read-only) */}
              <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
                <p><span className="font-medium">Asset:</span> {asset.name}</p>
                <p><span className="font-medium">Category:</span> {getCategoryName()}</p>
                <p><span className="font-medium">Department:</span> {getDepartmentName()}</p>
                <p><span className="font-medium">Cost:</span> ${typeof asset.cost === 'number' ? asset.cost.toFixed(2) : asset.cost}</p>
              </div>

              {/* Warranty End Date */}
              <div>
                <label htmlFor="warrantyEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty End Date *
                </label>
                <input
                  type="date"
                  id="warrantyEndDate"
                  required
                  min={minEndDate}
                  value={warrantyEndDate}
                  onChange={(e) => setWarrantyEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Warranty Notes */}
              <div>
                <label htmlFor="warrantyNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="warrantyNotes"
                  rows={3}
                  value={warrantyNotes}
                  onChange={(e) => setWarrantyNotes(e.target.value)}
                  placeholder="Warranty terms, coverage details, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading || !warrantyEndDate}
                  className="flex-1"
                >
                  {isLoading ? 'Registering...' : 'Register Warranty'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
