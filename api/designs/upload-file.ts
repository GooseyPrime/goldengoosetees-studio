import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_lib/supabase-server';
import { printfulServer } from '../../_lib/printful';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { designId, placement, imageDataUrl } = req.body;

    if (!designId || !placement || !imageDataUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const admin = getSupabaseAdmin();

    // 1. Get user_id if authenticated
    const { data: design, error: designError } = await admin
      .from('designs')
      .select('user_id, placement_file_urls, placement_file_ids')
      .eq('id', designId)
      .single();

    if (designError) throw designError;

    const userId = design.user_id || 'anon';
    const filePath = `${userId}/${designId}/${placement}/design_final.png`;

    // 2. Decode base64 and upload to Supabase Storage
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await admin.storage
      .from('designs')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = admin.storage.from('designs').getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    // 3. Upload to Printful
    // Assuming `printfulServer.uploadFile` exists and takes a URL for v2
    // If it only takes a Blob, we'll need to fetch the blob or adapt the client.
    // For V2 POST /v2/files we need to provide {"url": "..."}
    const printfulFileResult = await fetch('https://api.printful.com/v2/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: publicUrl,
        type: 'default',
        filename: `${placement}_${designId}.png`
      })
    }).then(r => r.json());

    if (!printfulFileResult.data || !printfulFileResult.data.id) {
       throw new Error('Failed to upload file to Printful');
    }

    const printfulFileId = printfulFileResult.data.id;

    // 4. Update Database
    const updatedUrls = { ...(design.placement_file_urls || {}), [placement]: publicUrl };
    const updatedIds = { ...(design.placement_file_ids || {}), [placement]: printfulFileId };

    const { error: updateError } = await admin
      .from('designs')
      .update({
        placement_file_urls: updatedUrls,
        placement_file_ids: updatedIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', designId);

    if (updateError) throw updateError;

    return res.status(200).json({ 
      success: true, 
      data: { fileId: printfulFileId, fileUrl: publicUrl } 
    });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
