/**
 * Tests for storage utility functions
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  seedMockStorage,
  resetMockStorage,
  browser,
} from "./mocks/wxt-browser";
import {
  getSettings,
  saveSettings,
  updateSettings,
  getCacheStats,
  updateCacheStats,
  recordCacheHit,
  recordCacheMiss,
  getChatCache,
  saveChatCache,
  clearChatCache,
  getAllChatCaches,
  clearAllCache,
  saveStory,
  getStories,
  deleteStory,
  generateId,
  formatBytes,
  getChatSettings,
  saveChatSettings,
} from "@/utils/storage";
import { DEFAULT_SETTINGS } from "@/types";
import type { ChatCache, StoryThread, UserSettings } from "@/types";

describe("Storage - Settings", () => {
  it("should return default settings when nothing stored", async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("should return stored settings merged with defaults", async () => {
    const partialSettings = {
      ai: { apiKey: "sk-test-key", model: "gpt-5" },
    };
    seedMockStorage({ wa_ai_settings: partialSettings });

    const settings = await getSettings();
    expect(settings.ai.apiKey).toBe("sk-test-key");
    expect(settings.ai.model).toBe("gpt-5");
    // Should still have defaults for non-stored fields
    expect(settings.general.messageLimit).toBe(
      DEFAULT_SETTINGS.general.messageLimit
    );
  });

  it("should migrate old outputLanguage to new structure", async () => {
    const oldSettings = {
      general: {
        outputLanguage: "ur-roman",
        messageLimit: 20,
      },
    };
    seedMockStorage({ wa_ai_settings: oldSettings });

    const settings = await getSettings();
    expect(settings.general.replyLanguage).toBe("ur-roman");
    expect(settings.general.analysisLanguage).toBe("ur-roman");
    expect(settings.general.translationLanguage).toBe("ur-roman");
  });

  it("should migrate old defaultTone to defaultTones array", async () => {
    const oldSettings = {
      ai: { defaultTone: "friendly" },
    };
    seedMockStorage({ wa_ai_settings: oldSettings });

    const settings = await getSettings();
    expect(settings.ai.defaultTones).toContain("friendly");
  });

  it("should save settings to storage", async () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ai: { ...DEFAULT_SETTINGS.ai, apiKey: "sk-new-key" },
    };

    await saveSettings(settings);

    expect(browser.storage.local.set).toHaveBeenCalledWith({
      wa_ai_settings: settings,
    });
  });

  it("should update partial settings", async () => {
    seedMockStorage({ wa_ai_settings: DEFAULT_SETTINGS });

    const updated = await updateSettings({
      ai: { ...DEFAULT_SETTINGS.ai, model: "gpt-5.2" },
    });

    expect(updated.ai.model).toBe("gpt-5.2");
    // Other settings should remain unchanged
    expect(updated.general.messageLimit).toBe(
      DEFAULT_SETTINGS.general.messageLimit
    );
  });

  it("should handle storage errors gracefully", async () => {
    browser.storage.local.get.mockRejectedValueOnce(new Error("Storage error"));

    const settings = await getSettings();
    // Should fall back to defaults on error
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe("Storage - Cache Statistics", () => {
  it("should return default cache stats when nothing stored", async () => {
    const stats = await getCacheStats();
    expect(stats.totalSize).toBe(0);
    expect(stats.chatCount).toBe(0);
    expect(stats.storyCount).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it("should update cache stats", async () => {
    await updateCacheStats({ hits: 5, misses: 2 });

    expect(browser.storage.local.set).toHaveBeenCalled();
  });

  it("should increment cache hit counter", async () => {
    seedMockStorage({
      wa_ai_cache_stats: { hits: 3, misses: 1, totalSize: 0, chatCount: 0, storyCount: 0, lastCleanup: Date.now() },
    });

    await recordCacheHit();

    const setCall = browser.storage.local.set.mock.calls;
    const lastCall = setCall[setCall.length - 1][0];
    expect(lastCall.wa_ai_cache_stats.hits).toBe(4);
  });

  it("should increment cache miss counter", async () => {
    seedMockStorage({
      wa_ai_cache_stats: { hits: 3, misses: 1, totalSize: 0, chatCount: 0, storyCount: 0, lastCleanup: Date.now() },
    });

    await recordCacheMiss();

    const setCall = browser.storage.local.set.mock.calls;
    const lastCall = setCall[setCall.length - 1][0];
    expect(lastCall.wa_ai_cache_stats.misses).toBe(2);
  });
});

describe("Storage - Chat Cache", () => {
  const mockCache: ChatCache = {
    chatId: "923061400333@c.us",
    chatName: "Test Chat",
    isGroup: false,
    stories: [],
    lastAnalyzed: Date.now(),
    messageHashes: ["hash1", "hash2"],
  };

  it("should return null for non-existent chat cache", async () => {
    const cache = await getChatCache("nonexistent@c.us");
    expect(cache).toBeNull();
  });

  it("should save and retrieve chat cache", async () => {
    await saveChatCache(mockCache);

    expect(browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "wa_ai_chat_923061400333@c.us": mockCache,
      })
    );
  });

  it("should clear chat cache", async () => {
    seedMockStorage({ "wa_ai_chat_923061400333@c.us": mockCache });

    await clearChatCache("923061400333@c.us");

    expect(browser.storage.local.remove).toHaveBeenCalledWith(
      "wa_ai_chat_923061400333@c.us"
    );
  });

  it("should get all chat caches", async () => {
    seedMockStorage({
      "wa_ai_chat_chat1@c.us": { ...mockCache, chatId: "chat1@c.us" },
      "wa_ai_chat_chat2@c.us": { ...mockCache, chatId: "chat2@c.us" },
      wa_ai_settings: DEFAULT_SETTINGS, // Non-cache key should be ignored
    });

    const caches = await getAllChatCaches();
    expect(caches).toHaveLength(2);
  });

  it("should clear all cache data", async () => {
    seedMockStorage({
      "wa_ai_chat_chat1@c.us": mockCache,
      "wa_ai_chat_chat2@c.us": mockCache,
      wa_ai_settings: DEFAULT_SETTINGS,
    });

    await clearAllCache();

    expect(browser.storage.local.remove).toHaveBeenCalledWith([
      "wa_ai_chat_chat1@c.us",
      "wa_ai_chat_chat2@c.us",
    ]);
  });
});

describe("Storage - Stories", () => {
  const mockStory: StoryThread = {
    id: "story-1",
    chatId: "923061400333@c.us",
    title: "Test Story",
    summary: "A test story thread",
    keyPoints: ["point 1", "point 2"],
    participants: ["User A", "User B"],
    messageCount: 10,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isActive: true,
    topics: ["general"],
  };

  it("should save a story to new chat cache", async () => {
    await saveStory("923061400333@c.us", mockStory);

    expect(browser.storage.local.set).toHaveBeenCalled();
  });

  it("should update existing story in cache", async () => {
    seedMockStorage({
      "wa_ai_chat_923061400333@c.us": {
        chatId: "923061400333@c.us",
        chatName: "",
        isGroup: false,
        stories: [mockStory],
        lastAnalyzed: Date.now(),
        messageHashes: [],
      },
    });

    const updatedStory = { ...mockStory, title: "Updated Title" };
    await saveStory("923061400333@c.us", updatedStory);

    // Find the set call that saved the chat cache (not cache stats)
    const setCall = browser.storage.local.set.mock.calls;
    const cacheCall = setCall.find(
      (call: any[]) => call[0]["wa_ai_chat_923061400333@c.us"] !== undefined
    );
    expect(cacheCall).toBeDefined();
    const savedCache = cacheCall![0]["wa_ai_chat_923061400333@c.us"];
    expect(savedCache.stories[0].title).toBe("Updated Title");
  });

  it("should get stories for a chat", async () => {
    seedMockStorage({
      "wa_ai_chat_923061400333@c.us": {
        chatId: "923061400333@c.us",
        chatName: "",
        isGroup: false,
        stories: [mockStory],
        lastAnalyzed: Date.now(),
        messageHashes: [],
      },
    });

    const stories = await getStories("923061400333@c.us");
    expect(stories).toHaveLength(1);
    expect(stories[0].id).toBe("story-1");
  });

  it("should return empty array for chat with no stories", async () => {
    const stories = await getStories("nonexistent@c.us");
    expect(stories).toEqual([]);
  });

  it("should delete a story", async () => {
    seedMockStorage({
      "wa_ai_chat_923061400333@c.us": {
        chatId: "923061400333@c.us",
        chatName: "",
        isGroup: false,
        stories: [mockStory, { ...mockStory, id: "story-2" }],
        lastAnalyzed: Date.now(),
        messageHashes: [],
      },
    });

    await deleteStory("923061400333@c.us", "story-1");

    // Find the set call that saved the chat cache
    const setCall = browser.storage.local.set.mock.calls;
    const cacheCall = setCall.find(
      (call: any[]) => call[0]["wa_ai_chat_923061400333@c.us"] !== undefined
    );
    expect(cacheCall).toBeDefined();
    const savedCache = cacheCall![0]["wa_ai_chat_923061400333@c.us"];
    expect(savedCache.stories).toHaveLength(1);
    expect(savedCache.stories[0].id).toBe("story-2");
  });
});

describe("Storage - Chat Settings", () => {
  it("should return default chat settings for new chat", async () => {
    const settings = await getChatSettings("923061400333@c.us");
    expect(settings.chatId).toBe("923061400333@c.us");
    expect(settings.customPrompt).toBeUndefined();
  });

  it("should save and retrieve per-chat settings", async () => {
    await saveChatSettings({
      chatId: "923061400333@c.us",
      customPrompt: "Reply in Roman Urdu",
      preferredTones: ["casual", "humorous"],
      replyLanguage: "ur-roman",
    });

    expect(browser.storage.local.set).toHaveBeenCalled();
  });

  it("should migrate old preferredTone to preferredTones array", async () => {
    seedMockStorage({
      "wa_ai_chat_settings_923061400333@c.us": {
        chatId: "923061400333@c.us",
        preferredTone: "friendly",
      },
    });

    const settings = await getChatSettings("923061400333@c.us");
    expect(settings.preferredTones).toContain("friendly");
  });
});

describe("Storage - Utility Functions", () => {
  it("generateId should return unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
  });

  it("formatBytes should format correctly", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});
