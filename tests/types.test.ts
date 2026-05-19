/**
 * Tests for type definitions and default values
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETTINGS,
  TONE_OPTIONS,
  LANGUAGE_OPTIONS,
  THEME_COLORS,
} from "@/types";
import type {
  AIModel,
  ResponseTone,
  UserSettings,
  ExtensionMessage,
  ExtensionResponse,
  StoryThread,
  ChatCache,
  MessageType,
} from "@/types";

describe("Types - DEFAULT_SETTINGS", () => {
  it("should have correct AI defaults", () => {
    expect(DEFAULT_SETTINGS.ai.apiKey).toBe("");
    expect(DEFAULT_SETTINGS.ai.model).toBe("gpt-5-mini");
    expect(DEFAULT_SETTINGS.ai.defaultTones).toContain("neutral");
    expect(DEFAULT_SETTINGS.ai.defaultTones).toContain("professional");
  });

  it("should have all AI feature flags enabled by default", () => {
    const features = DEFAULT_SETTINGS.ai.enabledFeatures;
    expect(features.analyze).toBe(true);
    expect(features.translate).toBe(true);
    expect(features.explainContext).toBe(true);
    expect(features.detectTone).toBe(true);
    expect(features.generateReply).toBe(true);
    expect(features.smartSuggestions).toBe(true);
  });

  it("should have correct general defaults", () => {
    expect(DEFAULT_SETTINGS.general.replyLanguage).toBe("en");
    expect(DEFAULT_SETTINGS.general.analysisLanguage).toBe("en");
    expect(DEFAULT_SETTINGS.general.translationLanguage).toBe("en");
    expect(DEFAULT_SETTINGS.general.messageLimit).toBe(20);
    expect(DEFAULT_SETTINGS.general.enableHoverButton).toBe(true);
  });

  it("should have keyboard shortcuts defined", () => {
    const shortcuts = DEFAULT_SETTINGS.general.keyboardShortcuts;
    expect(shortcuts.analyze).toBe("Alt+A");
    expect(shortcuts.translate).toBe("Alt+T");
    expect(shortcuts.generateReply).toBe("Alt+R");
    expect(shortcuts.openChat).toBe("Alt+S");
  });

  it("should have correct cache defaults", () => {
    expect(DEFAULT_SETTINGS.cache.retentionDays).toBe(7);
    expect(DEFAULT_SETTINGS.cache.maxCacheSize).toBe(50);
    expect(DEFAULT_SETTINGS.cache.maxStoriesPerChat).toBe(10);
    expect(DEFAULT_SETTINGS.cache.autoCleanupEnabled).toBe(true);
  });

  it("should have correct privacy defaults", () => {
    expect(DEFAULT_SETTINGS.privacy.dataCollectionEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.privacy.excludedChats).toEqual([]);
    expect(DEFAULT_SETTINGS.privacy.autoDeleteProcessedData).toBe(false);
  });

  it("should default to auto theme", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("auto");
  });
});

describe("Types - TONE_OPTIONS", () => {
  it("should have 10 tone options", () => {
    expect(TONE_OPTIONS).toHaveLength(10);
  });

  it("should have required properties for each tone", () => {
    for (const tone of TONE_OPTIONS) {
      expect(tone).toHaveProperty("value");
      expect(tone).toHaveProperty("label");
      expect(tone).toHaveProperty("description");
      expect(tone.value).toBeTruthy();
      expect(tone.label).toBeTruthy();
      expect(tone.description).toBeTruthy();
    }
  });

  it("should include all expected tones", () => {
    const toneValues = TONE_OPTIONS.map((t) => t.value);
    expect(toneValues).toContain("neutral");
    expect(toneValues).toContain("friendly");
    expect(toneValues).toContain("professional");
    expect(toneValues).toContain("casual");
    expect(toneValues).toContain("formal");
    expect(toneValues).toContain("humorous");
    expect(toneValues).toContain("empathetic");
    expect(toneValues).toContain("concise");
    expect(toneValues).toContain("detailed");
    expect(toneValues).toContain("encouraging");
  });
});

describe("Types - LANGUAGE_OPTIONS", () => {
  it("should have multiple language options", () => {
    expect(LANGUAGE_OPTIONS.length).toBeGreaterThan(10);
  });

  it("should include English as first option", () => {
    expect(LANGUAGE_OPTIONS[0]).toEqual({ code: "en", name: "English" });
  });

  it("should include Roman Urdu", () => {
    const romanUrdu = LANGUAGE_OPTIONS.find((l) => l.code === "ur-roman");
    expect(romanUrdu).toBeDefined();
    expect(romanUrdu!.name).toBe("Roman Urdu");
  });

  it("should have unique language codes", () => {
    const codes = LANGUAGE_OPTIONS.map((l) => l.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

describe("Types - THEME_COLORS", () => {
  it("should have light and dark themes", () => {
    expect(THEME_COLORS).toHaveProperty("light");
    expect(THEME_COLORS).toHaveProperty("dark");
  });

  it("should have all required color properties", () => {
    const requiredColors = [
      "background",
      "surface",
      "headerBg",
      "text",
      "textSecondary",
      "border",
      "primary",
      "primaryHover",
      "error",
      "success",
    ];

    for (const color of requiredColors) {
      expect(THEME_COLORS.light).toHaveProperty(color);
      expect(THEME_COLORS.dark).toHaveProperty(color);
    }
  });

  it("should have valid hex color values", () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;

    for (const color of Object.values(THEME_COLORS.light)) {
      expect(color).toMatch(hexRegex);
    }
    for (const color of Object.values(THEME_COLORS.dark)) {
      expect(color).toMatch(hexRegex);
    }
  });

  it("should have different backgrounds for light and dark", () => {
    expect(THEME_COLORS.light.background).not.toBe(
      THEME_COLORS.dark.background
    );
  });
});

describe("Types - Message Type Safety", () => {
  it("should validate ExtensionMessage structure", () => {
    const message: ExtensionMessage = {
      type: "ANALYZE_MESSAGE",
      payload: { messageData: {}, chatId: "test@c.us" },
    };

    expect(message.type).toBe("ANALYZE_MESSAGE");
    expect(message.payload).toBeDefined();
  });

  it("should validate ExtensionResponse success", () => {
    const response: ExtensionResponse<string> = {
      success: true,
      data: "Analysis result",
    };

    expect(response.success).toBe(true);
    expect(response.data).toBe("Analysis result");
    expect(response.error).toBeUndefined();
  });

  it("should validate ExtensionResponse error", () => {
    const response: ExtensionResponse = {
      success: false,
      error: "API key not configured",
    };

    expect(response.success).toBe(false);
    expect(response.error).toBe("API key not configured");
    expect(response.data).toBeUndefined();
  });

  it("should validate AIModel type values", () => {
    const validModels: AIModel[] = [
      "gpt-5.2",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
    ];

    expect(validModels).toHaveLength(4);
    expect(DEFAULT_SETTINGS.ai.model).toSatisfy((m: string) =>
      validModels.includes(m as AIModel)
    );
  });

  it("should validate StoryThread structure", () => {
    const story: StoryThread = {
      id: "story-1",
      chatId: "test@c.us",
      title: "Test Story",
      summary: "Summary",
      keyPoints: ["point 1"],
      participants: ["User A"],
      messageCount: 5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      topics: ["topic1"],
    };

    expect(story.id).toBeTruthy();
    expect(story.chatId).toBeTruthy();
    expect(story.keyPoints).toBeInstanceOf(Array);
    expect(story.participants).toBeInstanceOf(Array);
    expect(story.topics).toBeInstanceOf(Array);
    expect(story.messageCount).toBeGreaterThan(0);
  });

  it("should validate ChatCache structure", () => {
    const cache: ChatCache = {
      chatId: "test@c.us",
      chatName: "Test Chat",
      isGroup: false,
      stories: [],
      lastAnalyzed: Date.now(),
      messageHashes: [],
    };

    expect(cache.chatId).toBeTruthy();
    expect(cache.stories).toBeInstanceOf(Array);
    expect(cache.messageHashes).toBeInstanceOf(Array);
  });
});

describe("Types - Settings Validation", () => {
  it("should enforce messageLimit range (5-50)", () => {
    expect(DEFAULT_SETTINGS.general.messageLimit).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_SETTINGS.general.messageLimit).toBeLessThanOrEqual(50);
  });

  it("should have valid cache settings", () => {
    expect(DEFAULT_SETTINGS.cache.retentionDays).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.cache.maxCacheSize).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.cache.maxStoriesPerChat).toBeGreaterThan(0);
  });

  it("should have default tones as array", () => {
    expect(DEFAULT_SETTINGS.ai.defaultTones).toBeInstanceOf(Array);
    expect(DEFAULT_SETTINGS.ai.defaultTones.length).toBeGreaterThan(0);
  });
});
