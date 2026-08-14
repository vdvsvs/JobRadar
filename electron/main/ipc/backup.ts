import { ipcMain, dialog } from "electron";
import { getDb, persist, queryAll, executeRun } from "../db/index";
import fs from "fs";

const ALL_TABLES = [
  "user_profiles",
  "resumes",
  "companies",
  "assessment_results",
  "recommendations",
  "job_listings",
  "data_sources",
  "ai_providers",
  "search_sources",
  "peer_reviews",
];

export function registerBackupHandlers() {
  ipcMain.handle("data:export", async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "导出数据",
        defaultPath: "jobradar-backup.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (canceled || !filePath) {
        return { success: false };
      }

      // 导出所有表的数据
      const backup: Record<string, unknown[]> = {};
      for (const t of ALL_TABLES) {
        try {
          backup[t] = queryAll(`SELECT * FROM ${t}`);
        } catch {
          backup[t] = [];
        }
      }

      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: backup,
      };

      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      return { success: true, path: filePath };
    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "data:import",
    async (_event, backupData: Record<string, unknown>) => {
      try {
        let count = 0;

        if (backupData.data && typeof backupData.data === "object") {
          const data = backupData.data as Record<string, unknown[]>;
          const db = getDb();
          db.run("BEGIN");
          try {
            // 导入公司数据
            if (data.companies && Array.isArray(data.companies)) {
              for (const company of data.companies) {
                executeRun(
                  `INSERT OR REPLACE INTO companies (id, name, industry, scale, funding_stage, location_city, location_district, stability_score, promotion_clarity, tags, description, source, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    company.id,
                    company.name,
                    company.industry,
                    company.scale,
                    company.funding_stage,
                    company.location_city,
                    company.location_district,
                    company.stability_score,
                    company.promotion_clarity,
                    company.tags,
                    company.description,
                    company.source,
                    company.created_at,
                  ],
                );
                count++;
              }
            }

            // 导入评估结果（兼容新旧两种 key）
            const assessments = data.assessments || data.assessment_results;
            if (assessments && Array.isArray(assessments)) {
              for (const assessment of assessments) {
                executeRun(
                  `INSERT OR REPLACE INTO assessment_results (id, user_id, type, data, ai_insights, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    assessment.id,
                    assessment.user_id,
                    assessment.type,
                    assessment.data,
                    assessment.ai_insights,
                    assessment.created_at,
                  ],
                );
                count++;
              }
            }

            // 导入推荐记录
            if (data.recommendations && Array.isArray(data.recommendations)) {
              for (const recommendation of data.recommendations) {
                executeRun(
                  `INSERT OR REPLACE INTO recommendations (id, user_id, company_id, match_score, match_reasons, risk_analysis, action_suggestions, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    recommendation.id,
                    recommendation.user_id,
                    recommendation.company_id,
                    recommendation.match_score,
                    recommendation.match_reasons,
                    recommendation.risk_analysis,
                    recommendation.action_suggestions,
                    recommendation.created_at,
                  ],
                );
                count++;
              }
            }

            // 导入数据源配置（兼容新旧两种 key）
            const dataSources = data.dataSources || data.data_sources;
            if (dataSources && Array.isArray(dataSources)) {
              for (const dataSource of dataSources) {
                executeRun(
                  `INSERT OR REPLACE INTO data_sources (id, name, type, config, created_at)
                 VALUES (?, ?, ?, ?, ?)`,
                  [
                    dataSource.id,
                    dataSource.name,
                    dataSource.type,
                    dataSource.config,
                    dataSource.created_at,
                  ],
                );
                count++;
              }
            }

            db.run("COMMIT");
          } catch (txErr) {
            try {
              db.run("ROLLBACK");
            } catch {
              /* ignore rollback errors */
            }
            throw txErr;
          }
        }

        persist();
        return { success: true, count };
      } catch (error) {
        console.error("Import failed:", error);
        throw error;
      }
    },
  );
}
