import { ipcMain } from "electron";
import { v4 as uuidv4 } from "uuid";
import { getDb, queryAll, queryOne, executeRun, persist } from "../db";

// 扫描配置相关IPC处理
export function registerScanHandlers() {
  // 保存扫描配置
  ipcMain.handle("scan:saveConfig", async (_event, data: any) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO scan_configs (id, portal_name, portal_type, url_pattern, keywords, is_active, last_scanned_at, scan_interval_hours, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.portal_name,
          data.portal_type,
          data.url_pattern,
          JSON.stringify(data.keywords || []),
          data.is_active ? 1 : 0,
          data.last_scanned_at || null,
          data.scan_interval_hours || 24,
          now,
        ],
      );

      persist();
      return { id };
    } catch (error) {
      console.error("scan:saveConfig error:", error);
      throw error;
    }
  });

  // 获取所有扫描配置
  ipcMain.handle("scan:getConfigs", async (_event) => {
    try {
      const results = queryAll(
        "SELECT * FROM scan_configs ORDER BY created_at DESC",
      );
      return results.map((row: any) => ({
        ...row,
        keywords: JSON.parse(row.keywords || "[]"),
        is_active: Boolean(row.is_active),
      }));
    } catch (error) {
      console.error("scan:getConfigs error:", error);
      throw error;
    }
  });

  // 获取单个扫描配置
  ipcMain.handle("scan:getConfig", async (_event, id: string) => {
    try {
      const result = queryOne("SELECT * FROM scan_configs WHERE id = ?", [id]);
      if (result) {
        return {
          ...result,
          keywords: JSON.parse((result as any).keywords || "[]"),
          is_active: Boolean((result as any).is_active),
        };
      }
      return null;
    } catch (error) {
      console.error("scan:getConfig error:", error);
      throw error;
    }
  });

  // 更新扫描配置
  ipcMain.handle(
    "scan:updateConfig",
    async (_event, id: string, updates: any) => {
      try {
        const fields: string[] = [];
        const params: any[] = [];

        if (updates.portal_name !== undefined) {
          fields.push("portal_name = ?");
          params.push(updates.portal_name);
        }

        if (updates.portal_type !== undefined) {
          fields.push("portal_type = ?");
          params.push(updates.portal_type);
        }

        if (updates.url_pattern !== undefined) {
          fields.push("url_pattern = ?");
          params.push(updates.url_pattern);
        }

        if (updates.keywords !== undefined) {
          fields.push("keywords = ?");
          params.push(JSON.stringify(updates.keywords));
        }

        if (updates.is_active !== undefined) {
          fields.push("is_active = ?");
          params.push(updates.is_active ? 1 : 0);
        }

        if (updates.last_scanned_at !== undefined) {
          fields.push("last_scanned_at = ?");
          params.push(updates.last_scanned_at);
        }

        if (updates.scan_interval_hours !== undefined) {
          fields.push("scan_interval_hours = ?");
          params.push(updates.scan_interval_hours);
        }

        if (fields.length === 0) {
          return { success: true };
        }

        params.push(id);

        executeRun(
          `UPDATE scan_configs SET ${fields.join(", ")} WHERE id = ?`,
          params,
        );

        persist();
        return { success: true };
      } catch (error) {
        console.error("scan:updateConfig error:", error);
        throw error;
      }
    },
  );

  // 删除扫描配置
  ipcMain.handle("scan:deleteConfig", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM scan_configs WHERE id = ?", [id]);
      persist();
    } catch (error) {
      console.error("scan:deleteConfig error:", error);
      throw error;
    }
  });

  // 保存扫描到的职位
  ipcMain.handle("scan:saveJobs", async (_event, jobs: any[]) => {
    try {
      let savedCount = 0;

      for (const job of jobs) {
        const existing = queryOne(
          "SELECT id FROM job_listings WHERE source_url = ?",
          [job.source_url],
        );

        if (!existing) {
          const id = uuidv4();
          const now = new Date().toISOString();

          executeRun(
            `INSERT INTO job_listings (id, title, company, company_id, location_city, location_district, salary, tags, source, source_url, description, requirements, collected_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              job.title,
              job.company,
              job.company_id || null,
              job.location_city || null,
              job.location_district || null,
              job.salary || null,
              JSON.stringify(job.tags || []),
              job.source,
              job.source_url || null,
              job.description || null,
              job.requirements || null,
              now,
            ],
          );

          savedCount++;
        }
      }

      persist();
      return { success: true, count: savedCount };
    } catch (error) {
      console.error("scan:saveJobs error:", error);
      throw error;
    }
  });

  // 获取所有职位
  ipcMain.handle("scan:getJobs", async (_event, filters?: any) => {
    try {
      let sql = `
        SELECT jl.*, c.name as company_name, c.industry, c.scale
        FROM job_listings jl
        LEFT JOIN companies c ON jl.company_id = c.id
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters?.source) {
        conditions.push("jl.source = ?");
        params.push(filters.source);
      }

      if (filters?.company) {
        conditions.push("jl.company LIKE ?");
        params.push(`%${filters.company}%`);
      }

      if (filters?.location) {
        conditions.push("jl.location_city LIKE ?");
        params.push(`%${filters.location}%`);
      }

      if (filters?.keyword) {
        conditions.push(
          "(jl.title LIKE ? OR jl.description LIKE ? OR jl.tags LIKE ?)",
        );
        const keyword = `%${filters.keyword}%`;
        params.push(keyword, keyword, keyword);
      }

      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      sql += " ORDER BY jl.collected_at DESC";

      const results = queryAll(sql, params);
      return results.map((row: any) => ({
        ...row,
        tags: JSON.parse(row.tags || "[]"),
      }));
    } catch (error) {
      console.error("scan:getJobs error:", error);
      throw error;
    }
  });

  // 获取单个职位
  ipcMain.handle("scan:getJob", async (_event, id: string) => {
    try {
      const result = queryOne(
        `SELECT jl.*, c.name as company_name, c.industry, c.scale
         FROM job_listings jl
         LEFT JOIN companies c ON jl.company_id = c.id
         WHERE jl.id = ?`,
        [id],
      );
      if (result) {
        return {
          ...result,
          tags: JSON.parse((result as any).tags || "[]"),
        };
      }
      return null;
    } catch (error) {
      console.error("scan:getJob error:", error);
      throw error;
    }
  });

  // 更新职位
  ipcMain.handle("scan:updateJob", async (_event, id: string, updates: any) => {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updates.title !== undefined) {
        fields.push("title = ?");
        params.push(updates.title);
      }

      if (updates.company !== undefined) {
        fields.push("company = ?");
        params.push(updates.company);
      }

      if (updates.location_city !== undefined) {
        fields.push("location_city = ?");
        params.push(updates.location_city);
      }

      if (updates.salary !== undefined) {
        fields.push("salary = ?");
        params.push(updates.salary);
      }

      if (updates.tags !== undefined) {
        fields.push("tags = ?");
        params.push(JSON.stringify(updates.tags));
      }

      if (updates.description !== undefined) {
        fields.push("description = ?");
        params.push(updates.description);
      }

      if (updates.requirements !== undefined) {
        fields.push("requirements = ?");
        params.push(updates.requirements);
      }

      if (fields.length === 0) {
        return { success: true };
      }

      params.push(id);

      executeRun(
        `UPDATE job_listings SET ${fields.join(", ")} WHERE id = ?`,
        params,
      );

      persist();
      return { success: true };
    } catch (error) {
      console.error("scan:updateJob error:", error);
      throw error;
    }
  });

  // 删除职位
  ipcMain.handle("scan:deleteJob", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM job_listings WHERE id = ?", [id]);
      persist();
    } catch (error) {
      console.error("scan:deleteJob error:", error);
      throw error;
    }
  });

  // 获取职位统计
  ipcMain.handle("scan:getJobStats", async (_event) => {
    try {
      const total = queryOne("SELECT COUNT(*) as count FROM job_listings");
      const bySource = queryAll(
        "SELECT source, COUNT(*) as count FROM job_listings GROUP BY source",
      );
      const byStatus = queryAll(
        "SELECT status, COUNT(*) as count FROM job_listings GROUP BY status",
      );

      return {
        total: (total as any)?.count || 0,
        bySource: bySource.reduce((acc: any, row: any) => {
          acc[row.source] = row.count;
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc: any, row: any) => {
          acc[row.status] = row.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error("scan:getJobStats error:", error);
      throw error;
    }
  });
}
