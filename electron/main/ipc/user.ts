import { ipcMain } from "electron";
import { v4 as uuidv4 } from "uuid";
import { persist, queryOne, executeRun } from "../db/index";
import path from "path";
import { extractResumeBasics } from "../lib/resumeParser";

// 动态 import pdfjs-dist（避免构建时顶层 await 问题）
let pdfjsLib: any = null;
async function getPdfjsLib() {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    } catch {
      // fallback: 尝试主入口
      pdfjsLib = await import("pdfjs-dist");
    }
  }
  return pdfjsLib;
}

async function extractPdfFromBuffer(buf: Buffer | Uint8Array) {
  const lib = await getPdfjsLib();
  const data = new Uint8Array(buf);
  const doc = await lib.getDocument({
    data,
    isEvalSupported: false,
    disableJavaScript: true,
  }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str || "").join(" ") + "\n";
  }
  const result = text.trim();
  if (!result) {
    return {
      success: false,
      text: "PDF 内容为空或为扫描件（无文字层），请手动粘贴",
      pageCount: doc.numPages,
    };
  }
  return { success: true, text: result, pageCount: doc.numPages };
}

/**
 * 用户档案与简历 IPC 处理器
 *
 * 字段映射说明（任务描述字段 -> 实际 schema.sql 列）：
 *   school          -> education
 *   mbti_type/mbti  -> personality_mbti
 *   interests       -> interests（数组会被 JSON.stringify）
 *   skills/values/gender/identity -> 当前 schema 无独立列，统一存入 career_goals（JSON）
 */

export function registerUserHandlers() {
  // 读取用户档案（单行，id='default'）
  ipcMain.handle(
    "user:getProfile",
    async (_event, userId: string = "default") => {
      try {
        let row = queryOne("SELECT * FROM user_profiles WHERE id = ?", [
          userId,
        ]);
        if (!row) {
          row = backfillProfileFromResume(userId);
        }
        if (!row) return null;
        return normalizeProfile(row);
      } catch (error) {
        console.error("user:getProfile error:", error);
        throw error;
      }
    },
  );

  // 写入用户档案（INSERT OR REPLACE）
  ipcMain.handle(
    "user:saveProfile",
    async (_event, data: Record<string, unknown> = {}) => {
      try {
        const id = (data.id as string) || "default";

        // 收集 schema 中无独立列的扩展字段，序列化进 career_goals
        const extraFields: Record<string, unknown> = {};
        for (const key of ["gender", "identity", "skills", "values"]) {
          if (data[key] !== undefined) {
            extraFields[key] = data[key];
          }
        }
        const careerGoals = serializeCareerGoals(
          data.careerGoals ?? data.career_goals ?? null,
          extraFields,
        );

        const interests = normalizeJsonField(data.interests ?? data.interest);
        const resumeText = data.resumeText ?? data.resume_text ?? null;
        const personality = (data.personality || {}) as Record<string, unknown>;

        executeRun(
          `INSERT OR REPLACE INTO user_profiles (
          id, name, age, major, education, graduation_year, personality_mbti,
          personality_extroversion, personality_openness, personality_conscientiousness,
          personality_agreeableness, personality_neuroticism, interests, career_goals,
          risk_preference, self_intro, resume_path, resume_text, assessment_unlocked,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          COALESCE((SELECT created_at FROM user_profiles WHERE id = ?), CURRENT_TIMESTAMP),
          CURRENT_TIMESTAMP
        )`,
          [
            id,
            data.name ?? "",
            data.age ?? 0,
            data.major ?? "",
            data.education ?? data.school ?? null,
            data.graduationYear ?? data.graduation_year ?? null,
            data.mbtiType ??
              data.mbti ??
              data.personalityMbti ??
              data.personality_mbti ??
              personality.mbti ??
              null,
            data.personalityExtroversion ??
              data.personality_extroversion ??
              personality.extroversion ??
              50,
            data.personalityOpenness ??
              data.personality_openness ??
              personality.openness ??
              50,
            data.personalityConscientiousness ??
              data.personality_conscientiousness ??
              personality.conscientiousness ??
              50,
            data.personalityAgreeableness ??
              data.personality_agreeableness ??
              personality.agreeableness ??
              50,
            data.personalityNeuroticism ??
              data.personality_neuroticism ??
              personality.neuroticism ??
              50,
            interests,
            careerGoals,
            data.riskPreference ?? data.risk_preference ?? "balanced",
            data.selfIntro ?? data.self_intro ?? null,
            data.resumePath ?? data.resume_path ?? null,
            resumeText,
            data.assessmentUnlocked || data.assessment_unlocked ? 1 : 0,
            id,
          ],
        );
        persist();

        // 返回保存后的档案
        const row = queryOne("SELECT * FROM user_profiles WHERE id = ?", [id]);
        return normalizeProfile(row as Record<string, unknown>);
      } catch (error) {
        console.error("user:saveProfile error:", error);
        throw error;
      }
    },
  );

  // 读取最新简历
  ipcMain.handle(
    "user:getResume",
    async (_event, userId: string = "default") => {
      try {
        const row = queryOne(
          "SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
          [userId],
        );
        if (!row) return null;
        return normalizeResume(row);
      } catch (error) {
        console.error("user:getResume error:", error);
        throw error;
      }
    },
  );

  // 写入简历
  ipcMain.handle(
    "user:saveResume",
    async (_event, data: Record<string, unknown> = {}) => {
      try {
        const id = (data.id as string) || uuidv4();
        const userId =
          (data.userId as string) || (data.user_id as string) || "default";

        executeRun(
          `INSERT INTO resumes (id, user_id, file_name, file_path, extracted_text, structured_data)
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            userId,
            data.filename ?? data.fileName ?? data.file_name ?? null,
            data.filePath ?? data.file_path ?? null,
            data.parsedText ??
              data.parsed_text ??
              data.extractedText ??
              data.extracted_text ??
              null,
            normalizeJsonField(
              data.content ??
                data.structuredData ??
                data.structured_data ??
                "{}",
            ),
          ],
        );
        persist();

        const row = queryOne("SELECT * FROM resumes WHERE id = ?", [id]);
        return normalizeResume(row as Record<string, unknown>);
      } catch (error) {
        console.error("user:saveResume error:", error);
        throw error;
      }
    },
  );

  // 通过文件路径提取 PDF 文本
  ipcMain.handle("user:extractPdfText", async (_event, filePath: string) => {
    try {
      if (!filePath) throw new Error("未提供文件路径");
      const resolved = path.resolve(filePath);
      if (!/\.pdf$/i.test(resolved)) {
        return { success: false, text: "仅支持 PDF 文件", pageCount: 0 };
      }
      const fs = require("fs");
      if (!fs.existsSync(filePath)) throw new Error(`文件不存在: ${filePath}`);
      const stat = fs.statSync(filePath);
      if (stat.size > 20 * 1024 * 1024) {
        return {
          success: false,
          text: "PDF 文件过大（超过 20MB）",
          pageCount: 0,
        };
      }
      return await extractPdfFromBuffer(fs.readFileSync(filePath));
    } catch (error) {
      console.error("user:extractPdfText error:", error);
      const msg = (error as Error).message || "未知错误";
      return {
        success: false,
        text: `PDF 解析失败：${msg}，请手动粘贴简历内容`,
        pageCount: 0,
      };
    }
  });

  // 通过 ArrayBuffer 提取 PDF 文本（sandbox 模式下 file.path 为空时使用）
  ipcMain.handle(
    "user:extractPdfFromBuffer",
    async (_event, buffer: ArrayBuffer) => {
      try {
        if (!buffer || buffer.byteLength === 0) throw new Error("文件内容为空");
        if (buffer.byteLength > 20 * 1024 * 1024) {
          return {
            success: false,
            text: "PDF 文件过大（超过 20MB）",
            pageCount: 0,
          };
        }
        return await extractPdfFromBuffer(Buffer.from(buffer));
      } catch (error) {
        console.error("user:extractPdfFromBuffer error:", error);
        const msg = (error as Error).message || "未知错误";
        return {
          success: false,
          text: `PDF 解析失败：${msg}，请手动粘贴`,
          pageCount: 0,
        };
      }
    },
  );

  // 删除简历
  ipcMain.handle("user:deleteResume", async (_event, resumeId: string) => {
    try {
      executeRun("DELETE FROM resumes WHERE id = ?", [resumeId]);
      persist();
      return { success: true };
    } catch (error) {
      console.error("user:deleteResume error:", error);
      throw error;
    }
  });

  // 获取所有简历列表
  ipcMain.handle(
    "user:getAllResumes",
    async (_event, userId: string = "default") => {
      try {
        const { queryAll } = require("../db/index");
        const rows = queryAll(
          "SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC",
          [userId],
        );
        return rows.map((row: any) => normalizeResume(row));
      } catch (error) {
        console.error("user:getAllResumes error:", error);
        return [];
      }
    },
  );
}

function backfillProfileFromResume(
  userId: string,
): Record<string, unknown> | undefined {
  const resume = queryOne(
    'SELECT * FROM resumes WHERE user_id = ? AND extracted_text IS NOT NULL AND extracted_text != "" ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  const text = String(resume?.extracted_text || "");
  if (!text.trim()) return undefined;

  const parsed = extractResumeBasics(text);
  const now = new Date().toISOString();
  const careerGoals = serializeCareerGoals("Java 后端开发实习", {
    identity: parsed.identity,
    skills: parsed.skills,
  });
  const selfIntro = [
    parsed.name ? `我是${parsed.name}` : "我是求职者",
    parsed.major ? `${parsed.major}${parsed.education || ""}` : "",
    parsed.skills.length ? `熟悉${parsed.skills.slice(0, 8).join("、")}` : "",
  ]
    .filter(Boolean)
    .join("，");

  executeRun(
    `INSERT OR REPLACE INTO user_profiles (
      id, name, age, major, education, graduation_year, personality_mbti,
      personality_extroversion, personality_openness, personality_conscientiousness,
      personality_agreeableness, personality_neuroticism, interests, career_goals,
      risk_preference, self_intro, resume_path, resume_text, assessment_unlocked,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      parsed.name || "",
      0,
      parsed.major || "",
      parsed.education || null,
      null,
      null,
      50,
      50,
      50,
      50,
      50,
      JSON.stringify(
        parsed.skills.includes("Java") ? ["后端开发", "企业应用开发"] : [],
      ),
      careerGoals,
      "balanced",
      selfIntro,
      resume?.file_path || null,
      text,
      1,
      now,
      now,
    ],
  );
  persist();
  return queryOne("SELECT * FROM user_profiles WHERE id = ?", [userId]);
}

/** 将 interests 等字段统一序列化为 JSON 字符串 */
function normalizeJsonField(value: unknown): string {
  if (value === null || value === undefined) return "[]";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function serializeCareerGoals(
  value: unknown,
  extraFields: Record<string, unknown>,
): string | null {
  const existing =
    typeof value === "string"
      ? safeJsonParse<Record<string, unknown> | string>(value, value)
      : value;
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const obj = existing as Record<string, unknown>;
    const extra = {
      ...((obj.extra as Record<string, unknown> | undefined) || {}),
      ...extraFields,
    };
    return JSON.stringify({
      careerGoals: obj.careerGoals ?? obj,
      extra,
    });
  }
  if (
    Object.keys(extraFields).length > 0 ||
    (value !== null && value !== undefined)
  ) {
    return JSON.stringify({ careerGoals: value ?? "", extra: extraFields });
  }
  return null;
}

/** JSON 安全解析，失败返回 fallback */
function safeJsonParse<T>(s: string | null | undefined, fb: T): T {
  if (!s) return fb;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fb;
  }
}

/**
 * 将数据库行规范化为前端友好的档案对象（camelCase 嵌套结构）。
 * career_goals 中若内嵌 extra（identity/gender/skills/values），提取到顶层。
 */
function normalizeProfile(row: Record<string, unknown>) {
  if (!row) return null;
  const r = row as Record<string, unknown>;

  // 解析 career_goals：可能为 { careerGoals, extra } 结构
  let careerGoals: unknown = "";
  let extra: Record<string, unknown> | undefined;
  const rawGoals = r.career_goals as string | null | undefined;
  if (rawGoals) {
    const parsed = safeJsonParse<unknown>(rawGoals, rawGoals);
    if (
      parsed &&
      typeof parsed === "object" &&
      "extra" in (parsed as Record<string, unknown>)
    ) {
      const obj = parsed as Record<string, unknown>;
      extra = obj.extra as Record<string, unknown> | undefined;
      careerGoals = obj.careerGoals ?? "";
    } else {
      careerGoals = parsed ?? rawGoals;
    }
  }

  return {
    id: r.id,
    name: r.name,
    age: r.age,
    major: r.major,
    education: r.education,
    graduationYear: r.graduation_year,
    personality: {
      mbti: r.personality_mbti,
      extroversion: r.personality_extroversion,
      openness: r.personality_openness,
      conscientiousness: r.personality_conscientiousness,
      agreeableness: r.personality_agreeableness,
      neuroticism: r.personality_neuroticism,
    },
    interests: safeJsonParse<string[]>(r.interests as string, []),
    selfIntro: r.self_intro,
    resumeText: r.resume_text,
    resumePath: r.resume_path,
    assessmentUnlocked: Boolean(r.assessment_unlocked),
    riskPreference: r.risk_preference,
    careerGoals,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...(extra || {}),
  };
}

/** 将数据库行规范化为前端友好的简历对象 */
function normalizeResume(
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (!row) return row;
  let structuredData: unknown = row.structured_data;
  try {
    structuredData = JSON.parse((row.structured_data as string) || "{}");
  } catch {
    // 保持原值
  }
  return {
    ...row,
    filename: row.file_name,
    filePath: row.file_path,
    parsedText: row.extracted_text,
    content: row.structured_data,
    structuredData,
  };
}
