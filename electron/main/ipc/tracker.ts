import { ipcMain } from "electron";
import { v4 as uuidv4 } from "uuid";
import { getDb, queryAll, queryOne, executeRun, persist } from "../db";

// 申请跟踪相关IPC处理
export function registerTrackerHandlers() {
  // 保存申请记录
  ipcMain.handle("tracker:save", async (_event, data: any) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO application_tracker (id, job_listing_id, status, status_history, notes, follow_up_date, contact_person, contact_email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.job_listing_id,
          data.status || "discovered",
          JSON.stringify(data.status_history || []),
          data.notes || null,
          data.follow_up_date || null,
          data.contact_person || null,
          data.contact_email || null,
          now,
          now,
        ],
      );

      persist();
      return { id };
    } catch (error) {
      console.error("tracker:save error:", error);
      throw error;
    }
  });

  // 获取所有申请记录
  ipcMain.handle("tracker:getAll", async (_event, filters?: any) => {
    try {
      let sql = `
        SELECT at.*, jl.title as job_title, jl.company, jl.salary, jl.location_city
        FROM application_tracker at
        LEFT JOIN job_listings jl ON at.job_listing_id = jl.id
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters?.status) {
        conditions.push("at.status = ?");
        params.push(filters.status);
      }

      if (filters?.company) {
        conditions.push("jl.company LIKE ?");
        params.push(`%${filters.company}%`);
      }

      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      sql += " ORDER BY at.updated_at DESC";

      const results = queryAll(sql, params);
      return results.map((row: any) => ({
        ...row,
        status_history: JSON.parse(row.status_history || "[]"),
      }));
    } catch (error) {
      console.error("tracker:getAll error:", error);
      throw error;
    }
  });

  // 获取单个申请记录
  ipcMain.handle("tracker:get", async (_event, id: string) => {
    try {
      const result = queryOne(
        `SELECT at.*, jl.title as job_title, jl.company, jl.salary, jl.location_city
         FROM application_tracker at
         LEFT JOIN job_listings jl ON at.job_listing_id = jl.id
         WHERE at.id = ?`,
        [id],
      );
      if (result) {
        return {
          ...result,
          status_history: JSON.parse((result as any).status_history || "[]"),
        };
      }
      return null;
    } catch (error) {
      console.error("tracker:get error:", error);
      throw error;
    }
  });

  // 更新申请状态
  ipcMain.handle(
    "tracker:updateStatus",
    async (_event, id: string, newStatus: string, notes?: string) => {
      try {
        const existing = queryOne(
          "SELECT status_history FROM application_tracker WHERE id = ?",
          [id],
        );
        if (!existing) {
          throw new Error("申请记录不存在");
        }

        const statusHistory = JSON.parse(
          (existing as any).status_history || "[]",
        );
        statusHistory.push({
          status: newStatus,
          timestamp: new Date().toISOString(),
          notes,
        });

        const now = new Date().toISOString();
        executeRun(
          `UPDATE application_tracker SET status = ?, status_history = ?, updated_at = ?, notes = COALESCE(?, notes) WHERE id = ?`,
          [newStatus, JSON.stringify(statusHistory), now, notes || null, id],
        );

        persist();
        return { success: true };
      } catch (error) {
        console.error("tracker:updateStatus error:", error);
        throw error;
      }
    },
  );

  // 更新申请记录
  ipcMain.handle("tracker:update", async (_event, id: string, updates: any) => {
    try {
      const now = new Date().toISOString();
      const fields: string[] = [];
      const params: any[] = [];

      if (updates.notes !== undefined) {
        fields.push("notes = ?");
        params.push(updates.notes);
      }

      if (updates.follow_up_date !== undefined) {
        fields.push("follow_up_date = ?");
        params.push(updates.follow_up_date);
      }

      if (updates.contact_person !== undefined) {
        fields.push("contact_person = ?");
        params.push(updates.contact_person);
      }

      if (updates.contact_email !== undefined) {
        fields.push("contact_email = ?");
        params.push(updates.contact_email);
      }

      fields.push("updated_at = ?");
      params.push(now);
      params.push(id);

      executeRun(
        `UPDATE application_tracker SET ${fields.join(", ")} WHERE id = ?`,
        params,
      );

      persist();
      return { success: true };
    } catch (error) {
      console.error("tracker:update error:", error);
      throw error;
    }
  });

  // 删除申请记录
  ipcMain.handle("tracker:delete", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM application_tracker WHERE id = ?", [id]);
      persist();
    } catch (error) {
      console.error("tracker:delete error:", error);
      throw error;
    }
  });

  // 获取统计信息
  ipcMain.handle("tracker:getStats", async (_event) => {
    try {
      const total = queryOne(
        "SELECT COUNT(*) as count FROM application_tracker",
      );
      const byStatus = queryAll(
        "SELECT status, COUNT(*) as count FROM application_tracker GROUP BY status",
      );

      return {
        total: (total as any)?.count || 0,
        byStatus: byStatus.reduce((acc: any, row: any) => {
          acc[row.status] = row.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error("tracker:getStats error:", error);
      throw error;
    }
  });

  // 导出为CSV
  ipcMain.handle("tracker:exportCSV", async (_event) => {
    try {
      const records = queryAll(`
        SELECT at.*, jl.title as job_title, jl.company, jl.salary, jl.location_city
        FROM application_tracker at
        LEFT JOIN job_listings jl ON at.job_listing_id = jl.id
        ORDER BY at.updated_at DESC
      `);

      const headers = [
        "职位",
        "公司",
        "状态",
        "投递时间",
        "最后更新",
        "备注",
        "联系人",
        "联系邮箱",
      ];
      const rows = records.map((row: any) => [
        row.job_title || "",
        row.company || "",
        row.status || "",
        row.created_at || "",
        row.updated_at || "",
        row.notes || "",
        row.contact_person || "",
        row.contact_email || "",
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell: string) => `"${cell}"`).join(","))
        .join("\n");

      return csvContent;
    } catch (error) {
      console.error("tracker:exportCSV error:", error);
      throw error;
    }
  });
}
