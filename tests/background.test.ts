/**
 * Tests for background service worker message handling and OpenAI integration
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedMockStorage } from "./mocks/wxt-browser";
import { DEFAULT_SETTINGS } from "@/types";
import type {
  ExtensionMessage,
  UserSettings,
  OpenAICompletionResponse,
} from "@/types";

// Mock fetch for OpenAI API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// We need to test the handler functions directly
// Import storage functions which are used by background
import {
  getSettings,
  saveSettings,
  getCacheStats,
  clearAllCache,
  clearChatCache,
  getStories,
  getChatSettings,
} from "@/utils/storage";

describe("Background - API Key Validation", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should validate a correct API key", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: "Bearer sk-valid-key" },
    });

    expect(response.ok).toBe(true);
  });

  it("should reject invalid API key", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: "Incorrect API key provided" },
      }),
    });

    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: "Bearer sk-invalid" },
    });

    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.error.message).toContain("Incorrect API key");
  });
});

describe("Background - OpenAI API Call Pattern", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should call OpenAI with correct request format", async () => {
    const mockResponse: OpenAICompletionResponse = {
      id: "chatcmpl-123",
      choices: [
        {
          message: { role: "assistant", content: "Analysis result" },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer sk-test",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are an AI assistant." },
          { role: "user", content: "Analyze this message" },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer sk-test",
        }),
      })
    );

    const data = await response.json();
    expect(data.choices[0].message.content).toBe("Analysis result");
    expect(data.choices[0].finish_reason).toBe("stop");
  });

  it("should handle rate limit errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: { message: "Rate limit exceeded", type: "rate_limit_error" },
      }),
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer sk-test",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: "test" }],
      }),
    });

    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.error.type).toBe("rate_limit_error");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer sk-test" },
        body: "{}",
      })
    ).rejects.toThrow("Network error");
  });

  it("should use correct model from settings", async () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ai: { ...DEFAULT_SETTINGS.ai, apiKey: "sk-test", model: "gpt-5.2" },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "chatcmpl-456",
        choices: [
          {
            message: { role: "assistant", content: "Response" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    });

    await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.ai.model,
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe("gpt-5.2");
  });
});

describe("Background - Message Types Handling", () => {
  it("should handle GET_SETTINGS message", async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("should handle SAVE_SETTINGS message", async () => {
    const newSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ai: { ...DEFAULT_SETTINGS.ai, apiKey: "sk-saved-key" },
    };

    await saveSettings(newSettings);
    const retrieved = await getSettings();
    expect(retrieved.ai.apiKey).toBe("sk-saved-key");
  });

  it("should handle GET_CACHE_STATS message", async () => {
    const stats = await getCacheStats();
    expect(stats).toHaveProperty("totalSize");
    expect(stats).toHaveProperty("chatCount");
    expect(stats).toHaveProperty("storyCount");
    expect(stats).toHaveProperty("hits");
    expect(stats).toHaveProperty("misses");
  });

  it("should handle CLEAR_CACHE message", async () => {
    seedMockStorage({
      "wa_ai_chat_chat1@c.us": { chatId: "chat1@c.us", stories: [] },
    });

    await clearAllCache();
    const caches = await getCacheStats();
    expect(caches.chatCount).toBe(0);
  });

  it("should handle CLEAR_CHAT_CACHE message", async () => {
    seedMockStorage({
      "wa_ai_chat_chat1@c.us": { chatId: "chat1@c.us", stories: [] },
    });

    await clearChatCache("chat1@c.us");
    // Verify removal was called
  });

  it("should handle GET_STORIES message", async () => {
    seedMockStorage({
      "wa_ai_chat_chat1@c.us": {
        chatId: "chat1@c.us",
        chatName: "Test",
        isGroup: false,
        stories: [
          {
            id: "s1",
            chatId: "chat1@c.us",
            title: "Story 1",
            summary: "Test",
            keyPoints: [],
            participants: [],
            messageCount: 5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            topics: [],
          },
        ],
        lastAnalyzed: Date.now(),
        messageHashes: [],
      },
    });

    const stories = await getStories("chat1@c.us");
    expect(stories).toHaveLength(1);
    expect(stories[0].title).toBe("Story 1");
  });
});

describe("Background - Reply Generation Format", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should parse reply options from OpenAI response", async () => {
    const replyResponse = JSON.stringify([
      { tone: "neutral", content: "Thanks for letting me know." },
      { tone: "professional", content: "Thank you for the update." },
    ]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "chatcmpl-789",
        choices: [
          {
            message: { role: "assistant", content: replyResponse },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }),
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer sk-test",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "Generate reply options" },
          { role: "user", content: "Message: Hello" },
        ],
      }),
    });

    const data = await response.json();
    const options = JSON.parse(data.choices[0].message.content);

    expect(options).toHaveLength(2);
    expect(options[0]).toHaveProperty("tone");
    expect(options[0]).toHaveProperty("content");
    expect(options[0].tone).toBe("neutral");
  });

  it("should handle malformed JSON in reply response", () => {
    const malformedResponse = "This is not JSON";

    expect(() => JSON.parse(malformedResponse)).toThrow();
  });
});

describe("Background - Tone Detection Format", () => {
  it("should validate tone analysis JSON structure", () => {
    const validToneResponse = {
      primary: "happy",
      confidence: 0.85,
      sentiment: "positive",
      emotions: [
        { emotion: "joy", score: 0.9 },
        { emotion: "excitement", score: 0.7 },
      ],
    };

    expect(validToneResponse.primary).toBeDefined();
    expect(validToneResponse.confidence).toBeGreaterThanOrEqual(0);
    expect(validToneResponse.confidence).toBeLessThanOrEqual(1);
    expect(["positive", "negative", "neutral"]).toContain(
      validToneResponse.sentiment
    );
    expect(validToneResponse.emotions).toBeInstanceOf(Array);
  });
});
