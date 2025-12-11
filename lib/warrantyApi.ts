/**
 * Warranty API Client
 * Connects to the Warranty Register API at server10.eport.ws
 */

const WARRANTY_API_URL = process.env.WARRANTY_API_URL || 'https://server10.eport.ws';
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


export async function registerWarranty(data: WarrantyRegistration, authToken?: string): Promise<WarrantyResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (WARRANTY_API_KEY) headers['X-API-Key'] = WARRANTY_API_KEY;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    // Debug (non-sensitive): show presence/length of secrets and whether auth token is provided
    console.log('warranty-api debug', {
      url: WARRANTY_API_URL,
      hasApiKey: !!WARRANTY_API_KEY,
      apiKeyLength: WARRANTY_API_KEY ? WARRANTY_API_KEY.length : 0,
      authProvided: !!authToken,
    });

    const response = await fetch(`${WARRANTY_API_URL}/api/v1/warranties/register`, {
      method: 'POST',
      headers,
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
export async function checkWarranty(assetId: string, authToken?: string): Promise<WarrantyCheckResponse> {
  try {
    const headers: Record<string, string> = {};
    if (WARRANTY_API_KEY) headers['X-API-Key'] = WARRANTY_API_KEY;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    console.log('warranty-api debug (check)', {
      url: WARRANTY_API_URL,
      hasApiKey: !!WARRANTY_API_KEY,
      apiKeyLength: WARRANTY_API_KEY ? WARRANTY_API_KEY.length : 0,
      authProvided: !!authToken,
      assetId,
    });

    const response = await fetch(`${WARRANTY_API_URL}/api/v1/warranties/check/${assetId}`, {
      method: 'GET',
      headers,
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
export async function getWarrantyByAssetId(assetId: string, authToken?: string): Promise<WarrantyResponse> {
  try {
    const headers: Record<string, string> = {};
    if (WARRANTY_API_KEY) headers['X-API-Key'] = WARRANTY_API_KEY;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    console.log('warranty-api debug (getByAsset)', {
      url: WARRANTY_API_URL,
      hasApiKey: !!WARRANTY_API_KEY,
      apiKeyLength: WARRANTY_API_KEY ? WARRANTY_API_KEY.length : 0,
      authProvided: !!authToken,
      assetId,
    });

    const response = await fetch(`${WARRANTY_API_URL}/api/v1/warranties/asset/${assetId}`, {
      method: 'GET',
      headers,
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
