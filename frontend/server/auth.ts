// Compatibility shim for JarWiz
// This satisfies imports from @/server/auth

/**
 * Mock auth function for server-side code
 * In JarWiz, auth is primarily client-side via localStorage, 
 * but some presentation-ai components expect a server-side auth().
 */
export async function auth() {
    // Return a mock session that passes basic "if (!session?.user)" checks
    // Note: For real data, we expect the backend API to handle auth via tokens.
    return {
        user: {
            id: "anonymous", // Default user ID
            name: "Anonymous User",
            email: "anonymous@example.com",
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
    };
}
