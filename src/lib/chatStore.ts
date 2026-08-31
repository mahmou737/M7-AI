export interface ChatMessageItem {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  isWebSearch?: boolean;
  isImageGeneration?: boolean;
  searchSources?: Array<{ title: string; uri: string; domain?: string }>;
  suggestions?: string[];
}

export interface StoredChat {
  id: string;
  title: string;
  messages: ChatMessageItem[];
  updatedAt: string;
}

const CHATS_STORAGE_KEY = "m7_chats";

/**
 * جلب مصفوفة الشاتات المستقلة بالكامل: chats = [{ id, title, messages }]
 */
export function getStoredChats(): StoredChat[] {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * جلب شات مستقل محدد بالمعرف الخاص به
 */
export function getStoredChatById(chatId: string): StoredChat | undefined {
  if (!chatId) return undefined;
  const chats = getStoredChats();
  return chats.find((c) => c.id === chatId);
}

/**
 * حفظ وتحديث شات مستقل داخل مصفوفة الشاتات دون التأثير على أي شات آخر
 */
export function saveStoredChat(
  chatId: string,
  messages: ChatMessageItem[],
  title?: string
): StoredChat[] {
  if (!chatId) return getStoredChats();
  try {
    const chats = getStoredChats();
    const existingIndex = chats.findIndex((c) => c.id === chatId);
    const existingChat = existingIndex !== -1 ? chats[existingIndex] : null;

    const updatedChat: StoredChat = {
      id: chatId,
      title: title?.trim() || existingChat?.title || "محادثة جديدة",
      messages: Array.isArray(messages) ? messages : [],
      updatedAt: new Date().toISOString(),
    };

    let updatedChats: StoredChat[];
    if (existingIndex !== -1) {
      updatedChats = [...chats];
      updatedChats[existingIndex] = updatedChat;
    } else {
      updatedChats = [updatedChat, ...chats];
    }

    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updatedChats));
    return updatedChats;
  } catch (err) {
    console.warn("Failed to save chat to store:", err);
    return getStoredChats();
  }
}

/**
 * حذف شات محدد حصراً بنظام الفلترة المباشرة: chats.filter(c => c.id !== targetId)
 * يُمنع نهائياً مسح باقي المحادثات أو عمل Reset للمصفوفة بالكامل
 */
export function deleteStoredChatById(chatId: string): StoredChat[] {
  if (!chatId) return getStoredChats();
  try {
    const chats = getStoredChats();
    const filteredChats = chats.filter((c) => c.id !== chatId);
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(filteredChats));
    return filteredChats;
  } catch (err) {
    console.warn("Failed to delete chat from store:", err);
    return getStoredChats();
  }
}

/**
 * تحديث عنوان شات محدد
 */
export function updateStoredChatTitle(chatId: string, newTitle: string): StoredChat[] {
  if (!chatId || !newTitle.trim()) return getStoredChats();
  try {
    const chats = getStoredChats();
    const updatedChats = chats.map((c) =>
      c.id === chatId ? { ...c, title: newTitle.trim(), updatedAt: new Date().toISOString() } : c
    );
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updatedChats));
    return updatedChats;
  } catch {
    return getStoredChats();
  }
}

/**
 * مسح كافة الشاتات عند طلب المستخدم الصريح فقط
 */
export function clearAllStoredChats(): void {
  try {
    localStorage.removeItem(CHATS_STORAGE_KEY);
    localStorage.removeItem("m7_cached_conversations");
  } catch {}
}
