import { ipcMain, dialog } from "electron";
import fs from "fs";
import { z } from "zod";
import { getEncryptionKey } from "../config";
import { createSafeStore } from "../store";

// 统一 Settings 类型定义（供 ai.ts / crawler.ts 等模块后续 import 复用，避免各自 new Store 用不同类型访问同一文件）
export interface AiProviderRecord {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault?: boolean;
  supportsVision?: boolean;
}

export interface SearchSource {
  id: string;
  name: string;
  type: "bing" | "serpapi" | "custom";
  config: {
    apiKey?: string;
    endpoint?: string;
    params?: Record<string, string>;
  };
  createdAt: string;
}

export interface AppSettings {
  aiProviders: AiProviderRecord[];
  activeProviderId: string;
  visionProviderId?: string;
  prompts: Record<string, string>;
  searchSources: SearchSource[];
}

// 统一 settingsStore 实例：其他模块应 import 此实例，而非各自 new Store({ name: 'settings' })
export const settingsStore = createSafeStore<AppSettings>({
  name: "settings",
  encryptionKey: getEncryptionKey(),
  defaults: {
    aiProviders: [],
    activeProviderId: "",
    visionProviderId: "",
    prompts: {},
    searchSources: [],
  },
});

// zod 校验 schema：字段全部 optional，允许部分更新；passthrough 保留未知字段以向前兼容旧数据
const SettingsSchema = z
  .object({
    aiProviders: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          baseUrl: z.string(),
          apiKey: z.string(),
          model: z.string(),
          isDefault: z.boolean().optional(),
          supportsVision: z.boolean().optional(),
        }),
      )
      .optional(),
    activeProviderId: z.string().optional(),
    visionProviderId: z.string().optional(),
    prompts: z.record(z.string()).optional(),
    searchSources: z.array(z.any()).optional(),
  })
  .passthrough();

export function registerSettingsHandlers() {
  ipcMain.handle("settings:get", async () => {
    return settingsStore.store;
  });

  ipcMain.handle("settings:save", async (_event, settings: unknown) => {
    try {
      const parsed = SettingsSchema.parse(settings);
      settingsStore.set(parsed);
      return { success: true };
    } catch (err) {
      console.error("settings:save error:", err);
      throw new Error("设置格式无效: " + (err as Error).message);
    }
  });

  ipcMain.handle("settings:export", async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "导出设置",
      defaultPath: "jobradar-settings.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { success: false };
    fs.writeFileSync(filePath, JSON.stringify(settingsStore.store, null, 2));
    return { success: true, path: filePath };
  });

  ipcMain.handle("settings:import", async () => {
    try {
      const result = await dialog.showOpenDialog({
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"],
      });
      if (result.canceled || !result.filePaths.length)
        return { success: false };
      const data = JSON.parse(fs.readFileSync(result.filePaths[0], "utf-8"));
      const parsed = SettingsSchema.parse(data);
      settingsStore.set(parsed);
      return { success: true };
    } catch (err) {
      console.error("settings:import error:", err);
      throw err;
    }
  });
}
