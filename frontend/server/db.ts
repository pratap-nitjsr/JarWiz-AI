// Compatibility shim for JarWiz
// This satisfies imports from @/server/db

/**
 * Mock DB object for server-side code
 * JarWiz uses a Python backend for data storage.
 * This shim allows Prisma-style calls to build, 
 * but for actual functionality, actions should be refactored to call the backend API.
 */

const mockProxy: any = new Proxy({}, {
    get: (target, prop) => {
        if (prop === 'then') return undefined;
        return mockProxy; // Chainable
    },
    apply: () => {
        console.warn("DB call attempted on server-side shim. This action should be refactored to use apiClient.");
        return Promise.resolve(null);
    }
});

export const db = mockProxy;

export default db;
