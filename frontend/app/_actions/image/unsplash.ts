'use server';

// Unsplash image fetching for presentations
export async function getImageFromUnsplash(
    query: string
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        // Use Unsplash Source API for random images based on query
        // This is a free API that doesn't require authentication
        const encodedQuery = encodeURIComponent(query);
        const url = `https://source.unsplash.com/800x600/?${encodedQuery}`;

        return {
            success: true,
            url: url,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to fetch image from Unsplash',
        };
    }
}

export async function searchUnsplashImages(
    query: string,
    count: number = 5
): Promise<{ success: boolean; images?: string[]; error?: string }> {
    try {
        // Generate multiple image URLs for the query
        const images: string[] = [];
        const encodedQuery = encodeURIComponent(query);

        for (let i = 0; i < count; i++) {
            // Add random param to get different images
            images.push(`https://source.unsplash.com/800x600/?${encodedQuery}&sig=${Date.now() + i}`);
        }

        return {
            success: true,
            images,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to search Unsplash images',
        };
    }
}
