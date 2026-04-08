export async function printfulGet<T>(path: string): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`https://api.printful.com/v2${path}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        ...(process.env.PRINTFUL_STORE_ID ? { 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID } : {})
      }
    });

    if (res.status === 429) {
      const reset = res.headers.get('X-Ratelimit-Reset');
      if (reset) {
        const resetSeconds = parseInt(reset, 10);
        console.log(`Printful Rate Limit Hit. Waiting ${resetSeconds} seconds...`);
        await new Promise(resolve => setTimeout(resolve, resetSeconds * 1000));
        return printfulGet(path); // recursive retry
      }
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Printful API Error');

    return { success: true, data: data.data || data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function printfulPost<T>(path: string, body: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`https://api.printful.com/v2${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json',
        ...(process.env.PRINTFUL_STORE_ID ? { 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID } : {})
      },
      body: JSON.stringify(body)
    });

    if (res.status === 429) {
      const reset = res.headers.get('X-Ratelimit-Reset');
      if (reset) {
        const resetSeconds = parseInt(reset, 10);
        console.log(`Printful Rate Limit Hit. Waiting ${resetSeconds} seconds...`);
        await new Promise(resolve => setTimeout(resolve, resetSeconds * 1000));
        return printfulPost(path, body); // recursive retry
      }
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Printful API Error');

    return { success: true, data: data.data || data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}