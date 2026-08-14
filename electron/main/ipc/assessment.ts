import { ipcMain } from "electron";
import { v4 as uuidv4 } from "uuid";
import { persist, queryAll, queryOne, executeRun } from "../db/index";
import { validateAssessmentFlow } from "../lib/assessmentFlow";

const safeJsonParse = <T>(s: string | null | undefined, fb: T): T => {
  if (!s) return fb;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fb;
  }
};

const VALID_ASSESSMENT_TYPES = ["mbti", "bigfive", "interest", "career_match"];

export function registerAssessmentHandlers() {
  ipcMain.handle(
    "assessment:save",
    async (_event, data: Record<string, unknown>) => {
      try {
        if (
          !data?.type ||
          !VALID_ASSESSMENT_TYPES.includes(String(data.type))
        ) {
          throw new Error(
            "测评类型必填，且必须为 mbti | bigfive | interest | career_match 之一",
          );
        }
        const id = uuidv4();
        executeRun(
          `INSERT INTO assessment_results (id, user_id, type, data, ai_insights)
         VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            data.userId || "default",
            data.type,
            JSON.stringify(data.data || {}),
            data.aiInsights || null,
          ],
        );
        persist();
        return { id };
      } catch (err) {
        console.error("assessment:save error:", err);
        throw err;
      }
    },
  );

  ipcMain.handle("assessment:getAll", async () => {
    try {
      const rows = queryAll(
        "SELECT * FROM assessment_results ORDER BY created_at DESC",
      );
      return rows.map((row) => ({
        ...row,
        data: safeJsonParse((row.data as string) || "{}", {}),
      }));
    } catch (err) {
      console.error("assessment:getAll error:", err);
      throw err;
    }
  });

  ipcMain.handle("assessment:validateFlow", async () => {
    try {
      const rows = queryAll(
        "SELECT type, data FROM assessment_results ORDER BY created_at DESC",
      );
      return { success: true, data: validateAssessmentFlow(rows) };
    } catch (err) {
      console.error("assessment:validateFlow error:", err);
      throw err;
    }
  });

  ipcMain.handle("assessment:get", async (_event, id: string) => {
    try {
      const row = queryOne("SELECT * FROM assessment_results WHERE id = ?", [
        id,
      ]);
      if (!row) return null;
      return {
        ...row,
        data: safeJsonParse((row.data as string) || "{}", {}),
      };
    } catch (err) {
      console.error("assessment:get error:", err);
      throw err;
    }
  });

  ipcMain.handle("assessment:delete", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM assessment_results WHERE id = ?", [id]);
      persist();
      return { success: true };
    } catch (err) {
      console.error("assessment:delete error:", err);
      throw err;
    }
  });
}
