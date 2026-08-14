import { ipcMain } from "electron";
import { v4 as uuidv4 } from "uuid";
import { getDb, queryAll, queryOne, executeRun, persist } from "../db";

// 评估相关IPC处理
export function registerEvaluationHandlers() {
  // 保存评估结果
  ipcMain.handle("evaluation:save", async (_event, data: any) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO evaluation_results (id, user_id, type, data, ai_insights, iteration, conversation_snapshot, final_report, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.user_id,
          data.type || "job_evaluation",
          JSON.stringify(data.data || {}),
          data.ai_insights || null,
          data.iteration || 1,
          data.conversation_snapshot || null,
          data.final_report || null,
          now,
        ],
      );

      persist();
      return { id };
    } catch (error) {
      console.error("evaluation:save error:", error);
      throw error;
    }
  });

  // 获取所有评估结果
  ipcMain.handle("evaluation:getAll", async (_event, filters?: any) => {
    try {
      let sql = "SELECT * FROM evaluation_results";
      const params: any[] = [];

      if (filters?.user_id) {
        sql += " WHERE user_id = ?";
        params.push(filters.user_id);
      }

      if (filters?.type) {
        sql += params.length ? " AND" : " WHERE";
        sql += " type = ?";
        params.push(filters.type);
      }

      sql += " ORDER BY created_at DESC";

      const results = queryAll(sql, params);
      return results.map((row: any) => ({
        ...row,
        data: JSON.parse(row.data || "{}"),
      }));
    } catch (error) {
      console.error("evaluation:getAll error:", error);
      throw error;
    }
  });

  // 获取单个评估结果
  ipcMain.handle("evaluation:get", async (_event, id: string) => {
    try {
      const result = queryOne("SELECT * FROM evaluation_results WHERE id = ?", [
        id,
      ]);
      if (result) {
        return {
          ...result,
          data: JSON.parse((result as any).data || "{}"),
        };
      }
      return null;
    } catch (error) {
      console.error("evaluation:get error:", error);
      throw error;
    }
  });

  // 删除评估结果
  ipcMain.handle("evaluation:delete", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM evaluation_results WHERE id = ?", [id]);
      persist();
    } catch (error) {
      console.error("evaluation:delete error:", error);
      throw error;
    }
  });

  // 保存评估权重配置
  ipcMain.handle(
    "evaluation:saveWeights",
    async (_event, userId: string, weights: any) => {
      try {
        const existing = queryOne(
          "SELECT id FROM evaluation_weights WHERE user_id = ?",
          [userId],
        );
        const now = new Date().toISOString();

        if (existing) {
          executeRun(
            `UPDATE evaluation_weights SET
           skill_match = ?, level_fit = ?, salary_competitiveness = ?,
           company_quality = ?, location = ?, industry_match = ?,
           culture_fit = ?, growth_potential = ?, work_life_balance = ?,
           personal_preference = ?, updated_at = ?
           WHERE user_id = ?`,
            [
              weights.skill_match || 0.2,
              weights.level_fit || 0.1,
              weights.salary_competitiveness || 0.15,
              weights.company_quality || 0.1,
              weights.location || 0.1,
              weights.industry_match || 0.1,
              weights.culture_fit || 0.05,
              weights.growth_potential || 0.1,
              weights.work_life_balance || 0.05,
              weights.personal_preference || 0.05,
              now,
              userId,
            ],
          );
        } else {
          executeRun(
            `INSERT INTO evaluation_weights (id, user_id, skill_match, level_fit, salary_competitiveness,
           company_quality, location, industry_match, culture_fit, growth_potential,
           work_life_balance, personal_preference, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              userId,
              weights.skill_match || 0.2,
              weights.level_fit || 0.1,
              weights.salary_competitiveness || 0.15,
              weights.company_quality || 0.1,
              weights.location || 0.1,
              weights.industry_match || 0.1,
              weights.culture_fit || 0.05,
              weights.growth_potential || 0.1,
              weights.work_life_balance || 0.05,
              weights.personal_preference || 0.05,
              now,
              now,
            ],
          );
        }

        persist();
        return { success: true };
      } catch (error) {
        console.error("evaluation:saveWeights error:", error);
        throw error;
      }
    },
  );

  // 获取评估权重配置
  ipcMain.handle("evaluation:getWeights", async (_event, userId: string) => {
    try {
      const weights = queryOne(
        "SELECT * FROM evaluation_weights WHERE user_id = ?",
        [userId],
      );
      if (weights) {
        return {
          skill_match: (weights as any).skill_match || 0.2,
          level_fit: (weights as any).level_fit || 0.1,
          salary_competitiveness:
            (weights as any).salary_competitiveness || 0.15,
          company_quality: (weights as any).company_quality || 0.1,
          location: (weights as any).location || 0.1,
          industry_match: (weights as any).industry_match || 0.1,
          culture_fit: (weights as any).culture_fit || 0.05,
          growth_potential: (weights as any).growth_potential || 0.1,
          work_life_balance: (weights as any).work_life_balance || 0.05,
          personal_preference: (weights as any).personal_preference || 0.05,
        };
      }
      return null;
    } catch (error) {
      console.error("evaluation:getWeights error:", error);
      throw error;
    }
  });
}
