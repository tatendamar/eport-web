/**
 * Warranty API Client
 * Connects to the Warranty Register API at server10.eport.ws
 */

const WARRANTY_API_URL = process.env.WARRANTY_API_URL || 'http://server10.eport.ws';
const WARRANTY_API_KEY = process.env.WARRANTY_API_KEY || '';

interface WarrantyRegistration {
  asset_id: string;
  asset_name: string;
  category?: string;
  department?: string;
  cost?: number;
  date_purchased?: string;  // ISO date string, will be parsed by API
  warranty_notes?: string;
  registered_by_email?: string;
}

interface WarrantyResponse {
  success: boolean;
  data?: {
    id: string;
    asset_id: string;
    asset_name: string;
    warranty_status: string;
    warranty_start_date: string;
    warranty_end_date: string;
    created_at: string;
  };
  error?: string;
}

interface WarrantyCheckResponse {
  has_warranty: boolean;
  warranty?: {
    id: string;
    warranty_status: string;
    warranty_start_date: string;
    warranty_end_date: string;
  };
}

/**
 * Register a warranty for an asset
 */
export async function registerWarranty(data: WarrantyRegistration): Promise<WarrantyResponse> {
  try {
    const response = await fetch(`${WARRANTY_API_URL}/api/v1/warranties/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WARRANTY_API_KEY,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle Pydantic validation errors (detail is an array of error objects)
      let errorMessage = 'Failed to register warranty';
      if (Array.isArray(result.detail)) {
        errorMessage = result.detail.map((e: any) => e.msg || e.message).join(', ');
      } else if (typeof result.detail === 'string') {
        errorMessage = result.detail;
      } else if (result.message) {
        errorMessage = result.message;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Warranty API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check if an asset has a registered warranty
 */
export async function checkWarranty(assetId: string): Promise<WarrantyCheckResponse> {
  try {
    const response = await fetch(`${WARRANTY_API_URL}/api/v1/warranties/check/${assetId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': WARRANTY_API_KEY,
      },
    });

    if (!response.ok) {
      return { has_warranty: false };
    }

    const data = await response.json();
    
    // The API returns the warranty object if it exists, or null if not
    // If we got data back, the asset has a warranty
    if (!data) {
      return { has_warranty: false };
    }

    // Convert API response to expected format
    return {
      has_warranty: true,
      warranty: {
        id: data.id,
        warranty_status: data.warranty_status,
        warranty_start_date: data.warranty_start_date,
        warranty_end_date: data.warranty_end_date,
      },
    };
  } catch (error) {
    console.error('Warranty check error:', error);
    return { has_warranty: false };
  }
}

/**
 * Get warranty details by asset ID
 */
export async function getWarrantyByAssetId(assetId: string): Promise<WarrantyResponse> {
  try {
    const response = await fetch(`${WARRANTY_API_URL}/api/v1/warranties/asset/${assetId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': WARRANTY_API_KEY,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.detail || 'Warranty not found',
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Get warranty error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
