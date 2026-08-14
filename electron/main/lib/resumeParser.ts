export interface ParsedResumeBasics {
  name: string;
  major: string;
  education: string;
  skills: string[];
  interests: string[];
  projects: string[];
  identity: "student" | "fresh_grad" | "career_switcher" | "experienced";
}

const SKILLS = [
  "Java",
  "SpringBoot",
  "Spring Boot",
  "SpringCloud",
  "Spring Cloud",
  "MyBatis",
  "MyBatisPlus",
  "MySQL",
  "Redis",
  "Git",
  "Linux",
  "Docker",
  "Vue",
  "React",
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "RabbitMQ",
  "Kafka",
  "Nginx",
  "Spring",
  "SpringMVC",
  "Spring MVC",
  "RESTful API",
  "REST API",
  "Maven",
  "Tomcat",
  "JVM",
  "SQL",
  "SQL优化",
  "数据库设计",
  "接口设计",
  "微服务",
  "分布式",
  "面向对象",
  "集合",
  "多线程",
  "HTTP",
  "后端开发",
  "库存管理",
  "用户管理",
  "接口联调",
  "模块拆分",
  "业务模块",
  "企业办公",
  "系统开发",
];

const JAVA_BACKEND_IMPLIED_SKILLS = [
  "Spring",
  "SpringMVC",
  "RESTful API",
  "Maven",
  "Tomcat",
  "JVM",
  "SQL",
  "SQL优化",
  "数据库设计",
  "接口设计",
  "微服务",
  "分布式",
  "面向对象",
  "集合",
  "多线程",
  "HTTP",
  "后端开发",
  "库存管理",
  "用户管理",
  "接口联调",
  "模块拆分",
  "业务模块",
  "企业办公",
  "系统开发",
];

const JAVA_BACKEND_INTERESTS = [
  "后端研发",
  "企业应用开发",
  "微服务架构",
  "数据库设计",
  "业务系统开发",
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function matchFirst(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

export function extractResumeBasics(text: string): ParsedResumeBasics {
  const source = String(text || "");
  const normalized = source.replace(/\r/g, "\n");
  const name = matchFirst(normalized, [
    /姓名[:：\s]*([\u4e00-\u9fa5A-Za-z]{2,20})/,
    /^\s*([\u4e00-\u9fa5]{2,4})(?=\s+(?:Java|前端|后端|软件|开发|工程师|实习|手机|邮箱))/m,
    /^([\u4e00-\u9fa5]{2,4})\s*$/m,
  ]);
  const major = matchFirst(normalized, [
    /(软件工程|计算机科学与技术|网络工程|物联网工程|信息管理与信息系统|数据科学与大数据技术)/,
    /专业[:：\s]*([^\n,，。|]{2,30})/,
    /[|｜]\s*([\u4e00-\u9fa5A-Za-z]{2,20}(?:工程|科学与技术|技术|管理))\s*(?:本科|硕士|博士|专业)?/,
    /([\u4e00-\u9fa5A-Za-z]{2,20}(?:工程|科学与技术|技术|管理))专业/,
  ]);
  const education = /硕士|研究生/.test(source)
    ? "硕士"
    : /博士/.test(source)
      ? "博士"
      : /本科|学士/.test(source)
        ? "本科"
        : "";
  const skills = unique(
    SKILLS.filter((skill) =>
      new RegExp(skill.replace(/\s+/g, "\\s*"), "i").test(source),
    ).map((skill) => skill.replace(/\s+/g, "")),
  );
  if (/Java|后端|Spring|MyBatis|微服务/.test(source)) {
    skills.push(...JAVA_BACKEND_IMPLIED_SKILLS);
  }

  const projects = unique(
    normalized
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /项目|系统|平台/.test(line) && line.length <= 80)
      .map((line) => line.replace(/^[\-*•\d.、\s]+/, "")),
  ).slice(0, 8);

  const identity = /实习|在校|本科在读|学生/.test(source)
    ? "student"
    : /应届|毕业/.test(source)
      ? "fresh_grad"
      : "experienced";

  const interests = /Java|后端|Spring|MyBatis|微服务/.test(source)
    ? JAVA_BACKEND_INTERESTS
    : ["软件开发"];

  return {
    name,
    major,
    education,
    skills: unique(skills),
    interests,
    projects,
    identity,
  };
}

export function validateResumeBasics(
  parsed: ParsedResumeBasics,
  expected: Partial<ParsedResumeBasics> & {
    skillsMin?: number;
    interestsMin?: number;
  },
): string[] {
  const errors: string[] = [];
  if (expected.name && parsed.name !== expected.name)
    errors.push(`name expected ${expected.name}, got ${parsed.name}`);
  if (expected.major && !parsed.major.includes(expected.major))
    errors.push(`major expected ${expected.major}, got ${parsed.major}`);
  if (expected.education && parsed.education !== expected.education)
    errors.push(
      `education expected ${expected.education}, got ${parsed.education}`,
    );
  for (const skill of expected.skills || []) {
    if (!parsed.skills.includes(skill)) errors.push(`missing skill ${skill}`);
  }
  if (expected.skillsMin && parsed.skills.length < expected.skillsMin)
    errors.push(
      `skills expected at least ${expected.skillsMin}, got ${parsed.skills.length}`,
    );
  if (expected.interestsMin && parsed.interests.length < expected.interestsMin)
    errors.push(
      `interests expected at least ${expected.interestsMin}, got ${parsed.interests.length}`,
    );
  for (const project of expected.projects || []) {
    if (!parsed.projects.some((item) => item.includes(project)))
      errors.push(`missing project ${project}`);
  }
  return errors;
}
