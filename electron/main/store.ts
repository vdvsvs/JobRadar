import { app } from "electron";
import path from "path";
import fs from "fs";
import Store from "electron-store";

export function createSafeStore<T extends Record<string, any>>(
  options: Store.Options<T>,
): Store<T> {
  try {
    return new Store<T>(options);
  } catch (error) {
    const name = options.name || "config";
    const filePath = path.join(app.getPath("userData"), `${name}.json`);
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.corrupt-${Date.now()}`;
      fs.renameSync(filePath, backupPath);
      console.warn(`Backed up corrupt store file: ${backupPath}`);
      return new Store<T>(options);
    }
    throw error;
  }
}
