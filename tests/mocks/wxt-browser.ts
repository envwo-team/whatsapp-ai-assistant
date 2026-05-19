/**
 * Mock for wxt/browser module
 * Simulates Chrome extension storage API
 */

const storage: Record<string, unknown> = {};

export const browser = {
    storage: {
        local: {
            get: vi.fn(async (keys?: string | string[] | null) => {
                if (keys === null || keys === undefined) {
                    return { ...storage };
                }
                if (typeof keys === "string") {
                    return { [keys]: storage[keys] };
                }
                const result: Record<string, unknown> = {};
                for (const key of keys) {
                    result[key] = storage[key];
                }
                return result;
            }),
            set: vi.fn(async (items: Record<string, unknown>) => {
                Object.assign(storage, items);
            }),
            remove: vi.fn(async (keys: string | string[]) => {
                const keyArray = Array.isArray(keys) ? keys : [keys];
                for (const key of keyArray) {
                    delete storage[key];
                }
            }),
            clear: vi.fn(async () => {
                for (const key of Object.keys(storage)) {
                    delete storage[key];
                }
            }),
        },
    },
    runtime: {
        onMessage: {
            addListener: vi.fn(),
        },
        sendMessage: vi.fn(),
    },
};

/**
 * Helper to reset storage state between tests
 */
export function resetMockStorage() {
    for (const key of Object.keys(storage)) {
        delete storage[key];
    }
    vi.clearAllMocks();
}

/**
 * Helper to seed storage with data
 */
export function seedMockStorage(data: Record<string, unknown>) {
    Object.assign(storage, data);
}
