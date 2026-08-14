import { ipcMain } from "electron";
import { v4 as uuidv4 } from "uuid";
import { getDb, queryAll, queryOne, executeRun, persist } from "../db";

// 简历相关IPC处理
export function registerResumeHandlers() {
  // 保存简历模板
  ipcMain.handle("resume:saveTemplate", async (_event, data: any) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO resume_templates (id, name, description, html_template, css_styles, is_default, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.name,
          data.description || null,
          data.html_template,
          data.css_styles || null,
          data.is_default ? 1 : 0,
          now,
        ],
      );

      persist();
      return { id };
    } catch (error) {
      console.error("resume:saveTemplate error:", error);
      throw error;
    }
  });

  // 获取所有简历模板
  ipcMain.handle("resume:getTemplates", async (_event) => {
    try {
      const results = queryAll(
        "SELECT * FROM resume_templates ORDER BY is_default DESC, created_at DESC",
      );
      return results.map((row: any) => ({
        ...row,
        is_default: Boolean(row.is_default),
      }));
    } catch (error) {
      console.error("resume:getTemplates error:", error);
      throw error;
    }
  });

  // 获取单个简历模板
  ipcMain.handle("resume:getTemplate", async (_event, id: string) => {
    try {
      const result = queryOne("SELECT * FROM resume_templates WHERE id = ?", [
        id,
      ]);
      if (result) {
        return {
          ...result,
          is_default: Boolean((result as any).is_default),
        };
      }
      return null;
    } catch (error) {
      console.error("resume:getTemplate error:", error);
      throw error;
    }
  });

  // 更新简历模板
  ipcMain.handle(
    "resume:updateTemplate",
    async (_event, id: string, updates: any) => {
      try {
        const fields: string[] = [];
        const params: any[] = [];

        if (updates.name !== undefined) {
          fields.push("name = ?");
          params.push(updates.name);
        }

        if (updates.description !== undefined) {
          fields.push("description = ?");
          params.push(updates.description);
        }

        if (updates.html_template !== undefined) {
          fields.push("html_template = ?");
          params.push(updates.html_template);
        }

        if (updates.css_styles !== undefined) {
          fields.push("css_styles = ?");
          params.push(updates.css_styles);
        }

        if (updates.is_default !== undefined) {
          fields.push("is_default = ?");
          params.push(updates.is_default ? 1 : 0);
        }

        if (fields.length === 0) {
          return { success: true };
        }

        params.push(id);

        executeRun(
          `UPDATE resume_templates SET ${fields.join(", ")} WHERE id = ?`,
          params,
        );

        persist();
        return { success: true };
      } catch (error) {
        console.error("resume:updateTemplate error:", error);
        throw error;
      }
    },
  );

  // 删除简历模板
  ipcMain.handle("resume:deleteTemplate", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM resume_templates WHERE id = ?", [id]);
      persist();
    } catch (error) {
      console.error("resume:deleteTemplate error:", error);
      throw error;
    }
  });

  // 保存生成的简历
  ipcMain.handle("resume:saveGenerated", async (_event, data: any) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO generated_resumes (id, user_id, job_listing_id, template_id, resume_content, pdf_path, keywords_injected, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.user_id,
          data.job_listing_id || null,
          data.template_id,
          data.resume_content,
          data.pdf_path || null,
          JSON.stringify(data.keywords_injected || []),
          now,
        ],
      );

      persist();
      return { id };
    } catch (error) {
      console.error("resume:saveGenerated error:", error);
      throw error;
    }
  });

  // 获取所有生成的简历
  ipcMain.handle("resume:getGenerated", async (_event, filters?: any) => {
    try {
      let sql = `
        SELECT gr.*, rt.name as template_name, jl.title as job_title, jl.company
        FROM generated_resumes gr
        LEFT JOIN resume_templates rt ON gr.template_id = rt.id
        LEFT JOIN job_listings jl ON gr.job_listing_id = jl.id
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters?.user_id) {
        conditions.push("gr.user_id = ?");
        params.push(filters.user_id);
      }

      if (filters?.job_listing_id) {
        conditions.push("gr.job_listing_id = ?");
        params.push(filters.job_listing_id);
      }

      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      sql += " ORDER BY gr.created_at DESC";

      const results = queryAll(sql, params);
      return results.map((row: any) => ({
        ...row,
        keywords_injected: JSON.parse(row.keywords_injected || "[]"),
      }));
    } catch (error) {
      console.error("resume:getGenerated error:", error);
      throw error;
    }
  });

  // 获取单个生成的简历
  ipcMain.handle("resume:getGeneratedById", async (_event, id: string) => {
    try {
      const result = queryOne(
        `SELECT gr.*, rt.name as template_name, jl.title as job_title, jl.company
         FROM generated_resumes gr
         LEFT JOIN resume_templates rt ON gr.template_id = rt.id
         LEFT JOIN job_listings jl ON gr.job_listing_id = jl.id
         WHERE gr.id = ?`,
        [id],
      );
      if (result) {
        return {
          ...result,
          keywords_injected: JSON.parse(
            (result as any).keywords_injected || "[]",
          ),
        };
      }
      return null;
    } catch (error) {
      console.error("resume:getGeneratedById error:", error);
      throw error;
    }
  });

  // 更新生成的简历
  ipcMain.handle(
    "resume:updateGenerated",
    async (_event, id: string, updates: any) => {
      try {
        const fields: string[] = [];
        const params: any[] = [];

        if (updates.resume_content !== undefined) {
          fields.push("resume_content = ?");
          params.push(updates.resume_content);
        }

        if (updates.pdf_path !== undefined) {
          fields.push("pdf_path = ?");
          params.push(updates.pdf_path);
        }

        if (updates.keywords_injected !== undefined) {
          fields.push("keywords_injected = ?");
          params.push(JSON.stringify(updates.keywords_injected));
        }

        if (fields.length === 0) {
          return { success: true };
        }

        params.push(id);

        executeRun(
          `UPDATE generated_resumes SET ${fields.join(", ")} WHERE id = ?`,
          params,
        );

        persist();
        return { success: true };
      } catch (error) {
        console.error("resume:updateGenerated error:", error);
        throw error;
      }
    },
  );

  // 删除生成的简历
  ipcMain.handle("resume:deleteGenerated", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM generated_resumes WHERE id = ?", [id]);
      persist();
    } catch (error) {
      console.error("resume:deleteGenerated error:", error);
      throw error;
    }
  });

  // 获取默认模板
  ipcMain.handle("resume:getDefaultTemplate", async (_event) => {
    try {
      const result = queryOne(
        "SELECT * FROM resume_templates WHERE is_default = 1 LIMIT 1",
      );
      if (result) {
        return {
          ...result,
          is_default: Boolean((result as any).is_default),
        };
      }
      // 如果没有默认模板，返回第一个
      const first = queryOne(
        "SELECT * FROM resume_templates ORDER BY created_at ASC LIMIT 1",
      );
      if (first) {
        return {
          ...first,
          is_default: Boolean((first as any).is_default),
        };
      }
      return null;
    } catch (error) {
      console.error("resume:getDefaultTemplate error:", error);
      throw error;
    }
  });

  // 获取模板列表（简化版）
  ipcMain.handle("resume:getTemplateList", async (_event) => {
    try {
      const results = queryAll(
        "SELECT id, name, description FROM resume_templates ORDER BY is_default DESC, name ASC",
      );
      return results;
    } catch (error) {
      console.error("resume:getTemplateList error:", error);
      throw error;
    }
  });
}
