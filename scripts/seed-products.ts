import { getEnabledProducts } from '../src/lib/config/products.config';
import { printfulGet } from '../api/_lib/printful-client';
import { getSupabaseAdmin } from '../api/_lib/supabase-server';

async function seedProducts() {
    const products = getEnabledProducts();
    const admin = getSupabaseAdmin();

    console.log(`Seeding ${products.length} products...`);

    for (const config of products) {
        console.log(`Fetching ${config.displayName} (${config.printfulProductId}) from Printful...`);

        try {
            // 1. Basic info
            const { data: productInfo, error: productError } = await printfulGet(`/catalog-products/${config.printfulProductId}`);
            if (productError) throw new Error(productError);

            // 2. Variants
            // This is just a placeholder, as fetching full variant details requires iterating if paginated,
            // or filtering based on our config.defaultColors
            // Since we need to get size/color data we often need `/v2/catalog-products/{id}` which contains variants or `/v2/catalog-variants/{id}`
            // We'll store a simplified variant array to match the schema
            const variantsData = (productInfo as any)?.variants || [];
            
            const cachedData = {
                printful_product_id: config.printfulProductId,
                title: config.displayName,
                description: config.description,
                type: config.type,
                variants: variantsData,
                placements: config.placements,
                is_active: config.isActive,
                updated_at: new Date().toISOString()
            };

            const { error: upsertError } = await admin
                .from('products_catalog')
                .upsert(cachedData, { onConflict: 'printful_product_id' });

            if (upsertError) {
                 console.error(`Failed to upsert ${config.displayName}:`, upsertError.message);
            } else {
                 console.log(`Successfully seeded ${config.displayName}`);
            }
        } catch (error: any) {
            console.error(`Failed to process ${config.displayName}:`, error.message);
        }
    }
}

seedProducts().then(() => console.log('Done.')).catch(console.error);