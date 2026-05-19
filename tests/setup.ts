/**
 * Global test setup
 */
import { vi } from "vitest";
import { resetMockStorage } from "./mocks/wxt-browser";

// Reset storage before each test
beforeEach(() => {
    resetMockStorage();
});

// Mock console to reduce noise in tests
vi.spyOn(console, "log").mockImplementation(() => { });
vi.spyOn(console, "warn").mockImplementation(() => { });
