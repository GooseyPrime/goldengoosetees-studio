import { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnabledProducts } from '../../src/lib/config/products.config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // According to the instructions, we can return the active products defined in the config.
    const enabledProducts = getEnabledProducts();
    
    // In a real app, this might merge DB cache with the config definitions,
    // but the config is the source of truth for placements and pricing for now.
    
    return res.status(200).json({ success: true, data: enabledProducts });

  } catch (error: any) {
    console.error('Error fetching catalog:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
