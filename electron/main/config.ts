import { app } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";

/**
 * 应用配置管理
 * 敏感配置从环境变量或安全存储读取
 */

// 默认加密密钥（仅用于开发环境）
const DEFAULT_ENCRYPTION_KEY = "career-assistant-dev-key";

// 从环境变量或安全存储获取加密密钥
export function getEncryptionKey(): string {
  // 优先从环境变量读取
  if (process.env.CAREER_ASSISTANT_ENCRYPTION_KEY) {
    return process.env.CAREER_ASSISTANT_ENCRYPTION_KEY;
  }

  // 尝试从安全配置文件读取
  const configPath = path.join(app.getPath("userData"), ".secure-config.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.encryptionKey) {
        return config.encryptionKey;
      }
    } catch {
      // 配置文件读取失败，使用默认值
    }
  }

  // 开发环境使用默认密钥
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "使用开发环境默认加密密钥，生产环境请配置 CAREER_ASSISTANT_ENCRYPTION_KEY",
    );
    return DEFAULT_ENCRYPTION_KEY;
  }

  // 生产环境自动生成密钥并保存
  const key = generateEncryptionKey();
  saveEncryptionKey(key);
  console.warn("已自动生成加密密钥并保存到安全配置文件");
  return key;
}

// 生成随机加密密钥（首次运行时使用）
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

// 保存加密密钥到安全配置文件
export function saveEncryptionKey(key: string): void {
  const configPath = path.join(app.getPath("userData"), ".secure-config.json");
  const config = { encryptionKey: key };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}
