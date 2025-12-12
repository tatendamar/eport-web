'use server';

import { registerWarranty, checkWarranty, getWarrantyByAssetId } from '@/lib/warrantyApi';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export interface RegisterWarrantyInput {
  assetId: string;
  assetName: string;
  category: string;
  department: string;
  cost: number;
  datePurchased: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  warrantyNotes?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Server action to register a warranty for an asset
 */
export async function registerAssetWarranty(input: RegisterWarrantyInput): Promise<ActionResult> {
  try {
    // Get current user
    const supabase = getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        message: 'You must be logged in to register a warranty',
      };
    }

    // Check if warranty already exists (with safe handling)
    try {
      const existingWarranty = await checkWarranty(input.assetId);
      if (existingWarranty && existingWarranty.has_warranty === true) {
        return {
          success: false,
          message: 'This asset already has a registered warranty',
        };
      }
    } catch (checkError) {
      // If check fails, proceed with registration anyway
      console.warn('Warranty check failed, proceeding with registration:', checkError);
    }

    // Register the warranty (only send fields the API expects)
    const result = await registerWarranty({
      asset_id: input.assetId,
      asset_name: input.assetName,
      category: input.category,
      department: input.department,
      cost: input.cost,
      date_purchased: input.datePurchased,
      warranty_notes: input.warrantyNotes,
      registered_by_email: user.email || '',
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to register warranty',
      };
    }

    // Revalidate the dashboard to show updated data
    revalidatePath('/dashboard/user');

    return {
      success: true,
      message: 'Warranty registered successfully!',
      data: result.data,
    };
  } catch (error) {
    console.error('Register warranty action error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Server action to check warranty status for an asset
 */
export async function checkAssetWarranty(assetId: string): Promise<ActionResult> {
  try {
    const result = await checkWarranty(assetId);
    
    return {
      success: true,
      message: result.has_warranty ? 'Warranty found' : 'No warranty registered',
      data: result,
    };
  } catch (error) {
    console.error('Check warranty action error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check warranty status',
    };
  }
}

/**
 * Server action to get warranty details
 */
export async function getAssetWarranty(assetId: string): Promise<ActionResult> {
  try {
    const result = await getWarrantyByAssetId(assetId);
    
    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Warranty not found',
      };
    }

    return {
      success: true,
      message: 'Warranty retrieved successfully',
      data: result.data,
    };
  } catch (error) {
    console.error('Get warranty action error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get warranty details',
    };
  }
}
