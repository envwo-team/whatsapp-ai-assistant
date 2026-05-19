/**
 * Tests for WhatsApp DOM utility functions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    detectTheme,
    observeThemeChanges,
    waitForElement,
    extractChatId,
    extractSenderName,
    extractFullTimestamp,
    isGroupChat,
    isVoiceMessage,
    getVoiceDuration,
    isImageMessage,
    getImageData,
    isReply,
    isForwarded,
    isDeleted,
    extractMessageData,
    getAllMessages,
    getActiveChatId,
} from "@/utils/whatsapp-dom";

describe("WhatsApp DOM - Theme Detection", () => {
    beforeEach(() => {
        document.body.className = "";
        document.documentElement.className = "";
        document.body.removeAttribute("data-theme");
    });

    it("should detect dark theme from body class", () => {
        document.body.classList.add("dark");
        expect(detectTheme()).toBe("dark");
    });

    it("should detect dark theme from data-theme attribute", () => {
        document.body.setAttribute("data-theme", "dark");
        expect(detectTheme()).toBe("dark");
    });

    it("should detect light theme by default", () => {
        // Mock getComputedStyle to return light background
        vi.spyOn(window, "getComputedStyle").mockReturnValue({
            backgroundColor: "rgb(240, 242, 245)",
        } as CSSStyleDeclaration);

        expect(detectTheme()).toBe("light");
    });

    it("should detect dark from dark background color", () => {
        document.body.className = "";
        vi.spyOn(window, "getComputedStyle").mockReturnValue({
            backgroundColor: "rgb(17, 27, 33)",
        } as CSSStyleDeclaration);

        expect(detectTheme()).toBe("dark");
    });

    it("should observe theme changes", () => {
        const callback = vi.fn();
        const observer = observeThemeChanges(callback);

        expect(observer).toBeInstanceOf(MutationObserver);
        observer.disconnect();
    });
});

describe("WhatsApp DOM - waitForElement", () => {
    it("should resolve immediately if element exists", async () => {
        const div = document.createElement("div");
        div.id = "test-element";
        document.body.appendChild(div);

        const element = await waitForElement("#test-element");
        expect(element).toBe(div);

        document.body.removeChild(div);
    });

    it("should reject after timeout if element not found", async () => {
        await expect(
            waitForElement("#nonexistent", 100)
        ).rejects.toThrow("Element #nonexistent not found within 100ms");
    });

    it("should resolve when element is added dynamically", async () => {
        const promise = waitForElement("#dynamic-element", 2000);

        // Simulate dynamic element addition
        setTimeout(() => {
            const div = document.createElement("div");
            div.id = "dynamic-element";
            document.body.appendChild(div);
        }, 50);

        const element = await promise;
        expect(element.id).toBe("dynamic-element");

        document.body.removeChild(element);
    });
});

describe("WhatsApp DOM - Message Extraction Helpers", () => {
    describe("extractChatId", () => {
        it("should extract chat ID from data-id", () => {
            const chatId = extractChatId("true_923061400333@c.us_3EB0ABC123");
            expect(chatId).toBe("923061400333@c.us");
        });

        it("should extract chat ID from incoming message", () => {
            const chatId = extractChatId("false_923061400333@c.us_3EB0DEF456");
            expect(chatId).toBe("923061400333@c.us");
        });

        it("should return null for invalid format", () => {
            const chatId = extractChatId("invalid");
            expect(chatId).toBeNull();
        });
    });

    describe("extractSenderName", () => {
        it("should extract sender name from pre-plain-text", () => {
            const sender = extractSenderName(
                "[1:02 AM, 12/10/2025] John Doe: "
            );
            expect(sender).toBe("John Doe");
        });

        it("should handle complex names with hyphens", () => {
            const sender = extractSenderName(
                "[1:02 AM, 12/10/2025] Esha Tanveer - Upvave - QA: "
            );
            expect(sender).toBe("Esha Tanveer - Upvave - QA");
        });

        it("should return Unknown for invalid format", () => {
            const sender = extractSenderName("invalid format");
            expect(sender).toBe("Unknown");
        });
    });

    describe("extractFullTimestamp", () => {
        it("should extract timestamp", () => {
            const timestamp = extractFullTimestamp(
                "[10:54 PM, 12/9/2025] John: "
            );
            expect(timestamp).toBe("10:54 PM, 12/9/2025");
        });

        it("should return null for invalid format", () => {
            const timestamp = extractFullTimestamp("no brackets here");
            expect(timestamp).toBeNull();
        });
    });
});

describe("WhatsApp DOM - Message Type Detection", () => {
    let messageElement: HTMLDivElement;

    beforeEach(() => {
        messageElement = document.createElement("div");
        messageElement.className = "_amjv";
    });

    describe("isGroupChat", () => {
        it("should detect group chat", () => {
            const indicator = document.createElement("div");
            indicator.className = "_amkz";
            document.body.appendChild(indicator);

            expect(isGroupChat()).toBe(true);

            document.body.removeChild(indicator);
        });

        it("should return false for private chat", () => {
            expect(isGroupChat()).toBe(false);
        });
    });

    describe("isVoiceMessage", () => {
        it("should detect voice message", () => {
            const voiceLabel = document.createElement("div");
            voiceLabel.setAttribute("aria-label", "voice message at 0:24");
            messageElement.appendChild(voiceLabel);

            expect(isVoiceMessage(messageElement)).toBe(true);
        });

        it("should return false for non-voice message", () => {
            expect(isVoiceMessage(messageElement)).toBe(false);
        });
    });

    describe("getVoiceDuration", () => {
        it("should get voice message duration", () => {
            const durationEl = document.createElement("span");
            durationEl.className = "x10l6tqk x1fesggd";
            durationEl.textContent = "0:24";
            messageElement.appendChild(durationEl);

            expect(getVoiceDuration(messageElement)).toBe("0:24");
        });

        it("should return null when no duration found", () => {
            expect(getVoiceDuration(messageElement)).toBeNull();
        });
    });

    describe("isImageMessage", () => {
        it("should detect image message", () => {
            const img = document.createElement("img");
            img.src = "blob:https://web.whatsapp.com/abc123";
            messageElement.appendChild(img);

            expect(isImageMessage(messageElement)).toBe(true);
        });

        it("should return false for non-image message", () => {
            expect(isImageMessage(messageElement)).toBe(false);
        });
    });

    describe("getImageData", () => {
        it("should extract image data", () => {
            const img = document.createElement("img");
            img.src = "blob:https://web.whatsapp.com/abc123";
            img.style.width = "330px";
            img.style.height = "248px";
            messageElement.appendChild(img);

            const data = getImageData(messageElement);
            expect(data).toEqual({
                src: "blob:https://web.whatsapp.com/abc123",
                width: "330px",
                height: "248px",
            });
        });

        it("should return null when no image", () => {
            expect(getImageData(messageElement)).toBeNull();
        });
    });

    describe("isReply", () => {
        it("should detect reply message", () => {
            const quoted = document.createElement("div");
            quoted.setAttribute("aria-label", "Quoted message");
            messageElement.appendChild(quoted);

            expect(isReply(messageElement)).toBe(true);
        });

        it("should return false for non-reply", () => {
            expect(isReply(messageElement)).toBe(false);
        });
    });

    describe("isForwarded", () => {
        it("should detect forwarded message", () => {
            const icon = document.createElement("span");
            icon.setAttribute("data-icon", "forward-refreshed");
            messageElement.appendChild(icon);

            expect(isForwarded(messageElement)).toBe(true);
        });

        it("should return false for non-forwarded", () => {
            expect(isForwarded(messageElement)).toBe(false);
        });
    });

    describe("isDeleted", () => {
        it("should detect deleted message", () => {
            const deleted = document.createElement("span");
            deleted.setAttribute("title", "This message was deleted");
            messageElement.appendChild(deleted);

            expect(isDeleted(messageElement)).toBe(true);
        });

        it("should return false for non-deleted", () => {
            expect(isDeleted(messageElement)).toBe(false);
        });
    });
});

describe("WhatsApp DOM - extractMessageData", () => {
    it("should extract complete message data from outgoing message", () => {
        const messageEl = document.createElement("div");
        messageEl.className = "_amjv";
        messageEl.setAttribute("data-id", "true_923061400333@c.us_3EB0ABC");
        messageEl.setAttribute("data-virtualized", "false");

        const copyableText = document.createElement("div");
        copyableText.className = "copyable-text";
        copyableText.setAttribute(
            "data-pre-plain-text",
            "[10:54 PM, 12/9/2025] You: "
        );
        messageEl.appendChild(copyableText);

        const content = document.createElement("span");
        content.className = "selectable-text copyable-text";
        content.textContent = "Hello, how are you?";
        messageEl.appendChild(content);

        const data = extractMessageData(messageEl);

        expect(data.id).toBe("true_923061400333@c.us_3EB0ABC");
        expect(data.chatId).toBe("923061400333@c.us");
        expect(data.isOutgoing).toBe(true);
        expect(data.sender).toBe("You");
        expect(data.content).toBe("Hello, how are you?");
        expect(data.mediaType).toBe("text");
    });

    it("should extract incoming message data", () => {
        const messageEl = document.createElement("div");
        messageEl.className = "_amjv";
        messageEl.setAttribute("data-id", "false_923061400333@c.us_3EB0DEF");
        messageEl.setAttribute("data-virtualized", "false");

        const copyableText = document.createElement("div");
        copyableText.className = "copyable-text";
        copyableText.setAttribute(
            "data-pre-plain-text",
            "[11:00 AM, 12/10/2025] Jane Smith: "
        );
        messageEl.appendChild(copyableText);

        const content = document.createElement("span");
        content.className = "selectable-text copyable-text";
        content.textContent = "I'm good, thanks!";
        messageEl.appendChild(content);

        const data = extractMessageData(messageEl);

        expect(data.isOutgoing).toBe(false);
        expect(data.sender).toBe("Jane Smith");
        expect(data.content).toBe("I'm good, thanks!");
    });
});

describe("WhatsApp DOM - getAllMessages", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("should return empty array when no messages", () => {
        const messages = getAllMessages();
        expect(messages).toEqual([]);
    });

    it("should return only non-virtualized messages", () => {
        // Create virtualized message (should be filtered out)
        const virtual = document.createElement("div");
        virtual.className = "_amjv";
        virtual.setAttribute("data-id", "true_chat@c.us_1");
        virtual.setAttribute("data-virtualized", "true");
        document.body.appendChild(virtual);

        // Create visible message
        const visible = document.createElement("div");
        visible.className = "_amjv";
        visible.setAttribute("data-id", "true_chat@c.us_2");
        visible.setAttribute("data-virtualized", "false");
        document.body.appendChild(visible);

        const messages = getAllMessages();
        expect(messages).toHaveLength(1);
    });

    it("should respect message limit", () => {
        for (let i = 0; i < 10; i++) {
            const el = document.createElement("div");
            el.className = "_amjv";
            el.setAttribute("data-id", `true_chat@c.us_${i}`);
            el.setAttribute("data-virtualized", "false");
            document.body.appendChild(el);
        }

        const messages = getAllMessages(5);
        expect(messages).toHaveLength(5);
    });
});

describe("WhatsApp DOM - getActiveChatId", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("should return chat ID from first message", () => {
        const el = document.createElement("div");
        el.className = "_amjv";
        el.setAttribute("data-id", "true_923061400333@c.us_3EB0ABC");
        document.body.appendChild(el);

        expect(getActiveChatId()).toBe("923061400333@c.us");
    });

    it("should return null when no messages present", () => {
        expect(getActiveChatId()).toBeNull();
    });
});
