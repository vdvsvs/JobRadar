import { ipcMain } from "electron";
import { v4 as uuidv4 } from "uuid";
import { getDb, queryAll, queryOne, executeRun, persist } from "../db";

// 面试准备相关IPC处理
export function registerInterviewHandlers() {
  // 保存面试故事
  ipcMain.handle("interview:saveStory", async (_event, data: any) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO interview_stories (id, title, competency, situation, task, action, result, reflection, tags, use_count, last_used_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.title,
          data.competency,
          data.situation,
          data.task,
          data.action,
          data.result,
          data.reflection || null,
          JSON.stringify(data.tags || []),
          data.use_count || 0,
          data.last_used_at || null,
          now,
        ],
      );

      persist();
      return { id };
    } catch (error) {
      console.error("interview:saveStory error:", error);
      throw error;
    }
  });

  // 获取所有面试故事
  ipcMain.handle("interview:getStories", async (_event, filters?: any) => {
    try {
      let sql = "SELECT * FROM interview_stories";
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters?.competency) {
        conditions.push("competency = ?");
        params.push(filters.competency);
      }

      if (filters?.tags && filters.tags.length > 0) {
        const tagConditions = filters.tags.map(
          (_: string, i: number) => `tags LIKE ?`,
        );
        conditions.push(`(${tagConditions.join(" OR ")})`);
        filters.tags.forEach((tag: string) => params.push(`%${tag}%`));
      }

      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      sql += " ORDER BY use_count DESC, created_at DESC";

      const results = queryAll(sql, params);
      return results.map((row: any) => ({
        ...row,
        tags: JSON.parse(row.tags || "[]"),
      }));
    } catch (error) {
      console.error("interview:getStories error:", error);
      throw error;
    }
  });

  // 获取单个面试故事
  ipcMain.handle("interview:getStory", async (_event, id: string) => {
    try {
      const result = queryOne("SELECT * FROM interview_stories WHERE id = ?", [
        id,
      ]);
      if (result) {
        return {
          ...result,
          tags: JSON.parse((result as any).tags || "[]"),
        };
      }
      return null;
    } catch (error) {
      console.error("interview:getStory error:", error);
      throw error;
    }
  });

  // 更新面试故事
  ipcMain.handle(
    "interview:updateStory",
    async (_event, id: string, updates: any) => {
      try {
        const fields: string[] = [];
        const params: any[] = [];

        if (updates.title !== undefined) {
          fields.push("title = ?");
          params.push(updates.title);
        }

        if (updates.competency !== undefined) {
          fields.push("competency = ?");
          params.push(updates.competency);
        }

        if (updates.situation !== undefined) {
          fields.push("situation = ?");
          params.push(updates.situation);
        }

        if (updates.task !== undefined) {
          fields.push("task = ?");
          params.push(updates.task);
        }

        if (updates.action !== undefined) {
          fields.push("action = ?");
          params.push(updates.action);
        }

        if (updates.result !== undefined) {
          fields.push("result = ?");
          params.push(updates.result);
        }

        if (updates.reflection !== undefined) {
          fields.push("reflection = ?");
          params.push(updates.reflection);
        }

        if (updates.tags !== undefined) {
          fields.push("tags = ?");
          params.push(JSON.stringify(updates.tags));
        }

        if (fields.length === 0) {
          return { success: true };
        }

        params.push(id);

        executeRun(
          `UPDATE interview_stories SET ${fields.join(", ")} WHERE id = ?`,
          params,
        );

        persist();
        return { success: true };
      } catch (error) {
        console.error("interview:updateStory error:", error);
        throw error;
      }
    },
  );

  // 删除面试故事
  ipcMain.handle("interview:deleteStory", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM interview_stories WHERE id = ?", [id]);
      persist();
    } catch (error) {
      console.error("interview:deleteStory error:", error);
      throw error;
    }
  });

  // 增加故事使用次数
  ipcMain.handle(
    "interview:incrementStoryUsage",
    async (_event, id: string) => {
      try {
        const now = new Date().toISOString();
        executeRun(
          `UPDATE interview_stories SET use_count = use_count + 1, last_used_at = ? WHERE id = ?`,
          [now, id],
        );
        persist();
        return { success: true };
      } catch (error) {
        console.error("interview:incrementStoryUsage error:", error);
        throw error;
      }
    },
  );

  // 保存面试问题
  ipcMain.handle("interview:saveQuestion", async (_event, data: any) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO interview_questions (id, job_listing_id, question_text, question_type, suggested_story_id, user_answer, ai_feedback, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.job_listing_id || null,
          data.question_text,
          data.question_type || "behavioral",
          data.suggested_story_id || null,
          data.user_answer || null,
          data.ai_feedback || null,
          now,
        ],
      );

      persist();
      return { id };
    } catch (error) {
      console.error("interview:saveQuestion error:", error);
      throw error;
    }
  });

  // 获取所有面试问题
  ipcMain.handle("interview:getQuestions", async (_event, filters?: any) => {
    try {
      let sql = "SELECT * FROM interview_questions";
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters?.job_listing_id) {
        conditions.push("job_listing_id = ?");
        params.push(filters.job_listing_id);
      }

      if (filters?.question_type) {
        conditions.push("question_type = ?");
        params.push(filters.question_type);
      }

      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      sql += " ORDER BY created_at DESC";

      return queryAll(sql, params);
    } catch (error) {
      console.error("interview:getQuestions error:", error);
      throw error;
    }
  });

  // 获取单个面试问题
  ipcMain.handle("interview:getQuestion", async (_event, id: string) => {
    try {
      return queryOne("SELECT * FROM interview_questions WHERE id = ?", [id]);
    } catch (error) {
      console.error("interview:getQuestion error:", error);
      throw error;
    }
  });

  // 更新面试问题
  ipcMain.handle(
    "interview:updateQuestion",
    async (_event, id: string, updates: any) => {
      try {
        const fields: string[] = [];
        const params: any[] = [];

        if (updates.question_text !== undefined) {
          fields.push("question_text = ?");
          params.push(updates.question_text);
        }

        if (updates.question_type !== undefined) {
          fields.push("question_type = ?");
          params.push(updates.question_type);
        }

        if (updates.suggested_story_id !== undefined) {
          fields.push("suggested_story_id = ?");
          params.push(updates.suggested_story_id);
        }

        if (updates.user_answer !== undefined) {
          fields.push("user_answer = ?");
          params.push(updates.user_answer);
        }

        if (updates.ai_feedback !== undefined) {
          fields.push("ai_feedback = ?");
          params.push(updates.ai_feedback);
        }

        if (fields.length === 0) {
          return { success: true };
        }

        params.push(id);

        executeRun(
          `UPDATE interview_questions SET ${fields.join(", ")} WHERE id = ?`,
          params,
        );

        persist();
        return { success: true };
      } catch (error) {
        console.error("interview:updateQuestion error:", error);
        throw error;
      }
    },
  );

  // 删除面试问题
  ipcMain.handle("interview:deleteQuestion", async (_event, id: string) => {
    try {
      executeRun("DELETE FROM interview_questions WHERE id = ?", [id]);
      persist();
    } catch (error) {
      console.error("interview:deleteQuestion error:", error);
      throw error;
    }
  });

  // 关联故事和问题
  ipcMain.handle(
    "interview:linkStoryToQuestion",
    async (_event, storyId: string, questionId: string) => {
      try {
        executeRun(
          `UPDATE interview_questions SET suggested_story_id = ? WHERE id = ?`,
          [storyId, questionId],
        );
        persist();
        return { success: true };
      } catch (error) {
        console.error("interview:linkStoryToQuestion error:", error);
        throw error;
      }
    },
  );

  // 取消关联
  ipcMain.handle(
    "interview:unlinkStoryFromQuestion",
    async (_event, questionId: string) => {
      try {
        executeRun(
          `UPDATE interview_questions SET suggested_story_id = NULL WHERE id = ?`,
          [questionId],
        );
        persist();
        return { success: true };
      } catch (error) {
        console.error("interview:unlinkStoryFromQuestion error:", error);
        throw error;
      }
    },
  );

  // 获取所有能力维度
  ipcMain.handle("interview:getCompetencies", async (_event) => {
    try {
      const results = queryAll(
        "SELECT DISTINCT competency FROM interview_stories ORDER BY competency",
      );
      return results.map((row: any) => row.competency);
    } catch (error) {
      console.error("interview:getCompetencies error:", error);
      throw error;
    }
  });

  // 获取所有标签
  ipcMain.handle("interview:getAllTags", async (_event) => {
    try {
      const results = queryAll("SELECT tags FROM interview_stories");
      const tags = new Set<string>();
      results.forEach((row: any) => {
        const storyTags = JSON.parse(row.tags || "[]");
        storyTags.forEach((tag: string) => tags.add(tag));
      });
      return Array.from(tags);
    } catch (error) {
      console.error("interview:getAllTags error:", error);
      throw error;
    }
  });

  // 获取最常用的故事
  ipcMain.handle(
    "interview:getMostUsedStories",
    async (_event, limit: number = 5) => {
      try {
        const results = queryAll(
          "SELECT * FROM interview_stories ORDER BY use_count DESC LIMIT ?",
          [limit],
        );
        return results.map((row: any) => ({
          ...row,
          tags: JSON.parse(row.tags || "[]"),
        }));
      } catch (error) {
        console.error("interview:getMostUsedStories error:", error);
        throw error;
      }
    },
  );
}
