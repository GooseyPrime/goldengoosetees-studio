import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_lib/supabase-server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { designId, sessionId, productId, selectedPlacements, activePlacement, canvasJson } = req.body;

    if (!productId || !activePlacement || !canvasJson) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const admin = getSupabaseAdmin();
    let currentDesignId = designId;

    if (currentDesignId) {
      const { data: design, error: fetchError } = await admin
        .from('designs')
        .select('canvas_data')
        .eq('id', currentDesignId)
        .single();

      if (fetchError) throw fetchError;

      const updatedCanvasData = {
        ...(design.canvas_data || {}),
        [activePlacement]: canvasJson,
      };

      const { error: updateError } = await admin
        .from('designs')
        .update({
          canvas_data: updatedCanvasData,
          selected_placements: selectedPlacements,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentDesignId);

      if (updateError) throw updateError;
    } else {
      const { data, error: insertError } = await admin
        .from('designs')
        .insert({
          session_id: sessionId,
          selected_product_id: productId,
          selected_placements: selectedPlacements,
          canvas_data: { [activePlacement]: canvasJson },
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      currentDesignId = data.id;
    }

    return res.status(200).json({ success: true, data: { designId: currentDesignId } });
  } catch (error: any) {
    console.error('Error saving design:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
