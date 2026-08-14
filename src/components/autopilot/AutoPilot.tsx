import { useEffect, useRef, useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Group,
  Card,
  Badge,
  Progress,
  Alert,
  SimpleGrid,
  ThemeIcon,
  Divider,
  Paper,
  Loader,
  Collapse,
  Code,
  ScrollArea,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconRocket,
  IconFileText,
  IconSearch,
  IconChartBar,
  IconFileDescription,
  IconMessageCircle,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconRefresh,
  IconSparkles,
  IconListDetails,
  IconPlayerStop,
  IconChevronDown,
  IconChevronUp,
  IconBrain,
  IconRobot,
  IconClock,
  IconBuilding,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/useUserStore";
import { useJobScanStore } from "../../stores/useJobScanStore";
import { useEvaluationStore } from "../../stores/useEvaluationStore";
import { useTrackerStore } from "../../stores/useTrackerStore";
import { useInterviewStore } from "../../stores/useInterviewStore";
import { useResumeStore } from "../../stores/useResumeStore";
import { useCompanyStore } from "../../stores/useCompanyStore";
import {
  useAutoPilotStore,
  type StepDef,
  type StepId,
  type LogEntry,
} from "../../stores/useAutoPilotStore";
import { JobStatus } from "../../services/ai/AIServiceAdapter";
import AutoApplyPanel from "./AutoApplyPanel";

const STEP_ICONS: Record<StepId, React.ReactNode> = {
  parse: <IconFileText size={20} />,
  assessment: <IconBrain size={20} />,
  search: <IconSearch size={20} />,
  evaluate: <IconChartBar size={20} />,
  company: <IconBuilding size={20} />,
  track: <IconListDetails size={20} />,
  resume: <IconFileDescription size={20} />,
  interview: <IconMessageCircle size={20} />,
};

const LOG_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  info: { label: "信息", color: "blue" },
  ai_call: { label: "AI 调用", color: "violet" },
  ai_response: { label: "AI 响应", color: "grape" },
  tool_call: { label: "工具调用", color: "cyan" },
  success: { label: "完成", color: "green" },
  warning: { label: "警告", color: "yellow" },
  error: { label: "错误", color: "red" },
};

function LogItem({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const badge = LOG_TYPE_BADGE[entry.type] || LOG_TYPE_BADGE.info;
  const hasDetail = entry.detail || entry.prompt || entry.response;
  return (
    <div
      style={{
        padding: "6px 0",
        borderBottom: "1px solid var(--mantine-color-gray-2)",
      }}
    >
      <Group
        gap="xs"
        wrap="nowrap"
        style={{ cursor: hasDetail ? "pointer" : "default" }}
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <Text
          size="xs"
          c="dimmed"
          style={{ fontFamily: "monospace", minWidth: 60 }}
        >
          {entry.time}
        </Text>
        <Badge size="xs" color={badge.color} variant="light">
          {badge.label}
        </Badge>
        {entry.toolName && (
          <Badge size="xs" color="cyan" variant="outline">
            {entry.toolName}
          </Badge>
        )}
        <Text size="xs" fw={500} style={{ flex: 1 }}>
          {entry.title}
        </Text>
        {hasDetail && (
          <ActionIcon size="xs" variant="subtle">
            {expanded ? (
              <IconChevronUp size={12} />
            ) : (
              <IconChevronDown size={12} />
            )}
          </ActionIcon>
        )}
      </Group>
      <Collapse in={expanded}>
        <div style={{ marginLeft: 60, marginTop: 4 }}>
          {entry.detail && (
            <Text size="xs" c="dimmed" mb={4}>
              {entry.detail}
            </Text>
          )}
          {entry.prompt && (
            <div style={{ marginBottom: 4 }}>
              <Text size="xs" fw={600} c="violet">
                📤 发送给 AI 的 Prompt：
              </Text>
              <Code
                block
                style={{
                  fontSize: 11,
                  maxHeight: 200,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {entry.prompt.length > 800
                  ? entry.prompt.slice(0, 800) + "..."
                  : entry.prompt}
              </Code>
            </div>
          )}
          {entry.response && (
            <div>
              <Text size="xs" fw={600} c="grape">
                📥 AI 返回：
              </Text>
              <Code
                block
                style={{
                  fontSize: 11,
                  maxHeight: 200,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {entry.response.length > 800
                  ? entry.response.slice(0, 800) + "..."
                  : entry.response}
              </Code>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}

export default function AutoPilot() {
  const navigate = useNavigate();
  const profile = useUserStore((s) => s.profile);
  const selfIntro = useUserStore((s) => s.profile?.selfIntro) || "";
  const resumeText = useUserStore((s) => s.profile?.resumeText) || "";
  const ap = useAutoPilotStore();
  const pipelineRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      await useUserStore.getState().loadFromBackend();
      const current = useUserStore.getState().profile;
      if (!current?.resumeText && window.electronAPI?.getResume) {
        const resume = (await window.electronAPI.getResume()) as any;
        if (resume?.parsedText) {
          await useUserStore
            .getState()
            .updateProfile({ resumeText: String(resume.parsedText) } as any);
        }
      }
    };
    load();
  }, []);

  const startPipeline = async () => {
    if (ap.running) return;
    ap.startPipeline();
    pipelineRef.current = true;

    await useUserStore.getState().loadFromBackend();
    let cp =
      useUserStore.getState().profile ||
      ({
        id: "default",
        name: "求职者",
        age: 22,
        major: "计算机科学",
        personality: {},
        interests: [],
        riskPreference: "balanced",
      } as any);
    if (!cp.resumeText && window.electronAPI?.getResume) {
      const resume = (await window.electronAPI.getResume()) as any;
      if (resume?.parsedText) {
        await useUserStore
          .getState()
          .updateProfile({ resumeText: String(resume.parsedText) } as any);
        cp = useUserStore.getState().profile || cp;
      }
    }
    const cv = cp.resumeText || cp.selfIntro || "";

    let jobsFound = 0,
      jobsEvaluated = 0,
      topJobs = 0,
      tracksCreated = 0,
      resumesGenerated = 0,
      storiesGenerated = 0;

    try {
      // ===== Step 1: AI 分析简历 =====
      ap.setCurrentStep(0);
      ap.updateStep("parse", { status: "running" });
      ap.addLog({
        stepId: "parse",
        type: "info",
        title: "开始分析简历...",
        detail: `简历长度: ${cv.length} 字符`,
      });

      ap.addLog({
        stepId: "parse",
        type: "ai_call",
        title: "调用 AI 解析简历",
        toolName: "ai:parseResume",
        prompt: `简历内容（前300字）：${cv.slice(0, 300)}...`,
      });
      const parsedProfile = await window.electronAPI.parseResume(
        cv || "暂无简历",
      );
      if (!pipelineRef.current) return;
      const pp = parsedProfile as any;
      ap.addLog({
        stepId: "parse",
        type: "ai_response",
        title: `AI 解析完成：${pp.name || "未知"} / ${pp.major || "未知"}`,
        response: JSON.stringify(pp, null, 2).slice(0, 600),
      });

      await useUserStore.getState().updateProfile({
        name: pp.name || cp.name,
        major: pp.major || cp.major,
        age: pp.age || cp.age,
        education: pp.education,
        graduationYear: pp.graduationYear,
        careerGoals: pp.careerGoals,
        selfIntro: pp.selfIntro || cp.selfIntro,
        interests: pp.interests || cp.interests,
        resumeText: cv,
      } as any);
      ap.addLog({
        stepId: "parse",
        type: "success",
        title: `提取 ${pp.skills?.length || 0} 项技能，${pp.interests?.length || 0} 个兴趣方向，已自动填充个人资料`,
      });
      ap.updateStep("parse", {
        status: "done",
        detail: `${pp.skills?.length || 0} 项技能 / ${pp.interests?.length || 0} 个兴趣`,
      });

      // ===== Step 2: 问卷答题链路校验 =====
      ap.setCurrentStep(1);
      ap.updateStep("assessment", { status: "running" });
      ap.addLog({
        stepId: "assessment",
        type: "tool_call",
        title: "校验 MBTI / 霍兰德测评结果",
        toolName: "assessment:validateFlow",
      });
      const assessment = await window.electronAPI.validateAssessmentFlow?.();
      const assessmentData = assessment?.data as any;
      if (assessmentData?.complete) {
        ap.addLog({
          stepId: "assessment",
          type: "success",
          title: `测评链路完整：MBTI ${assessmentData.mbtiType || "-"}，霍兰德 ${assessmentData.hollandCode || "-"}`,
        });
        ap.updateStep("assessment", {
          status: "done",
          detail: assessmentData.recommendedDirections?.join(" / ") || "已完成",
        });
      } else {
        ap.addLog({
          stepId: "assessment",
          type: "warning",
          title: `测评未完整：缺少 ${(assessmentData?.missing || []).join("、") || "测评结果"}`,
          detail:
            "流程将继续使用简历与个人资料推断岗位方向，正式推荐建议补完问卷。",
        });
        ap.updateStep("assessment", {
          status: "done",
          detail: "缺少问卷，已降级推断",
        });
      }

      // ===== Step 2: 智能搜索岗位 =====
      ap.setCurrentStep(2);
      ap.updateStep("search", { status: "running" });
      ap.addLog({
        stepId: "search",
        type: "info",
        title: "开始智能搜索岗位...",
      });

      ap.addLog({
        stepId: "search",
        type: "ai_call",
        title: "调用 AI 生成搜索关键词",
        toolName: "ai:suggestSearchQueries",
        prompt: `专业: ${pp.major}, 技能: ${(pp.skills || []).join(",")}, 兴趣: ${(pp.interests || []).join(",")}`,
      });
      const queries = await window.electronAPI.suggestSearchQueries(pp);
      if (!pipelineRef.current) return;
      ap.addLog({
        stepId: "search",
        type: "ai_response",
        title: `AI 生成 ${(queries as string[]).length} 个搜索词`,
        response: JSON.stringify(queries),
      });

      let allJobs: any[] = [];
      for (const query of (queries as string[]).slice(0, 5)) {
        ap.addLog({
          stepId: "search",
          type: "tool_call",
          title: `搜索: "${query}"`,
          toolName: "crawler:searchJobs",
        });
        try {
          const results = await window.electronAPI.searchJobs(query);
          if (Array.isArray(results)) {
            allJobs = [...allJobs, ...results];
            ap.addLog({
              stepId: "search",
              type: "success",
              title: `"${query}" 找到 ${results.length} 个岗位`,
            });
          }
        } catch (e: any) {
          ap.addLog({
            stepId: "search",
            type: "warning",
            title: `"${query}" 搜索失败: ${e.message || e}`,
          });
        }
      }

      const validated = (await window.electronAPI.validateJobs?.(
        allJobs,
      )) as any;
      allJobs = Array.isArray(validated?.jobs) ? validated.jobs : allJobs;
      allJobs = allJobs.slice(0, 50);
      jobsFound = allJobs.length;

      if (allJobs.length > 0) {
        ap.addLog({
          stepId: "search",
          type: "tool_call",
          title: `保存 ${allJobs.length} 个岗位到数据库`,
          toolName: "crawler:saveJobs",
        });
        await window.electronAPI.saveJobs(allJobs);
      }
      ap.addLog({
        stepId: "search",
        type: "success",
        title: `搜索完成：${jobsFound} 个去重岗位`,
        detail: `去重 ${validated?.duplicateCount || 0}，无效 ${validated?.invalidCount || 0}，高培训风险 ${validated?.trainingRiskCount || 0}`,
      });
      ap.updateStep("search", {
        status: "done",
        detail: `${jobsFound} 个岗位`,
      });

      // ===== Step 3: AI 评估匹配度 =====
      ap.setCurrentStep(3);
      ap.updateStep("evaluate", { status: "running" });
      ap.addLog({
        stepId: "evaluate",
        type: "info",
        title: `开始评估前 ${Math.min(allJobs.length, 50)} 个岗位...`,
      });

      const topJobList = allJobs.slice(0, 50);
      for (let i = 0; i < topJobList.length; i++) {
        if (!pipelineRef.current) return;
        const job = topJobList[i];
        ap.addLog({
          stepId: "evaluate",
          type: "ai_call",
          title: `[${i + 1}/${topJobList.length}] 评估: ${job.title} @ ${job.company}`,
          toolName: "evaluateJob",
        });
        try {
          await useEvaluationStore.getState().evaluateJob(job, cp, cv);
          jobsEvaluated++;
          ap.addLog({
            stepId: "evaluate",
            type: "success",
            title: `${job.title} 评估完成`,
          });
        } catch (e: any) {
          ap.addLog({
            stepId: "evaluate",
            type: "error",
            title: `${job.title} 评估失败: ${e.message || e}`,
          });
        }
      }

      const recommended = useEvaluationStore.getState().getRecommendedJobs(3.5);
      topJobs = recommended.length;
      ap.addLog({
        stepId: "evaluate",
        type: "success",
        title: `评估完成：${jobsEvaluated} 个评估，${topJobs} 个推荐`,
      });
      ap.updateStep("evaluate", {
        status: "done",
        detail: `${jobsEvaluated} 评估 / ${topJobs} 推荐`,
      });

      // ===== Step 4: 企业评估分析 =====
      ap.setCurrentStep(4);
      ap.updateStep("company", { status: "running" });
      ap.addLog({
        stepId: "company",
        type: "info",
        title: "开始企业评估分析...",
      });

      let companiesAnalyzed = 0;
      const analyzedCompanies = new Set<string>();
      for (const rec of recommended) {
        if (!pipelineRef.current) return;
        const job = allJobs.find((j) => j.id === rec.job_listing_id);
        if (!job || analyzedCompanies.has(job.company)) continue;
        analyzedCompanies.add(job.company);

        ap.addLog({
          stepId: "company",
          type: "ai_call",
          title: `分析企业: ${job.company}`,
          toolName: "ai:analyzeCompany",
        });
        try {
          const analysis = await window.electronAPI.analyzeCompany(
            job.company,
            job.description,
          );
          const risk = await window.electronAPI.checkCompanyRisk?.({
            name: job.company,
            industry: (analysis as any)?.industry,
            description: (analysis as any)?.risk?.newsSummary || "",
            jobDescription: job.description || "",
            registryStatus: (analysis as any)?.risk?.registryStatus,
            newsSummary: (analysis as any)?.risk?.newsSummary,
          });
          const a = analysis as any;
          const riskData = risk?.data as any;
          await useCompanyStore.getState().addCompany({
            id: `company-${Date.now()}-${companiesAnalyzed}`,
            name: job.company,
            industry: a.industry || "未知",
            scale: "large",
            location: { city: job.location_city || "未知" },
            stabilityScore: a.growth_potential || 50,
            promotionClarity: a.culture_fit || 50,
            tags: [
              ...(a.strengths || []).slice(0, 3),
              ...(riskData?.flags || []).slice(0, 2),
            ],
            description: `优势：${(a.strengths || []).join("、")}。劣势：${(a.weaknesses || []).join("、")}。风险：${(riskData?.flags || []).join("、") || "未发现高风险信号"}`,
            source: "ai_analysis",
            createdAt: new Date().toISOString(),
          });
          companiesAnalyzed++;
          ap.addLog({
            stepId: "company",
            type: "success",
            title: `${job.company} 分析完成`,
            detail: `风险等级 ${riskData?.riskLevel || "unknown"}，风险分 ${riskData?.riskScore ?? "-"}`,
          });
        } catch (e: any) {
          ap.addLog({
            stepId: "company",
            type: "error",
            title: `${job.company} 分析失败: ${e.message || e}`,
          });
        }
      }
      ap.addLog({
        stepId: "company",
        type: "success",
        title: `企业评估完成：${companiesAnalyzed} 家公司`,
      });
      ap.updateStep("company", {
        status: "done",
        detail: `${companiesAnalyzed} 家公司`,
      });

      // ===== Step 5: 自动创建跟踪 =====
      ap.setCurrentStep(5);
      ap.updateStep("track", { status: "running" });
      for (const rec of recommended) {
        if (!pipelineRef.current) return;
        const job = allJobs.find((j) => j.id === rec.job_listing_id);
        try {
          await useTrackerStore.getState().addApplication({
            job_listing_id: rec.job_listing_id,
            job_title: job?.title || "未知职位",
            company: job?.company || "未知公司",
            status: JobStatus.EVALUATED,
            notes: `AI评估: ${rec.overall_letter} (${rec.overall_score.toFixed(1)})`,
          });
          tracksCreated++;
          ap.addLog({
            stepId: "track",
            type: "tool_call",
            title: `创建跟踪: ${job?.title || "未知"}`,
            toolName: "tracker:save",
          });
        } catch (e: any) {
          ap.addLog({
            stepId: "track",
            type: "error",
            title: `跟踪创建失败: ${e.message || e}`,
          });
        }
      }
      ap.addLog({
        stepId: "track",
        type: "success",
        title: `创建 ${tracksCreated} 条投递跟踪`,
      });
      ap.updateStep("track", {
        status: "done",
        detail: `${tracksCreated} 条跟踪`,
      });

      // ===== Step 6: 生成优化简历 =====
      ap.setCurrentStep(6);
      ap.updateStep("resume", { status: "running" });
      for (const rec of recommended.slice(0, 5)) {
        if (!pipelineRef.current) return;
        const job = allJobs.find((j) => j.id === rec.job_listing_id);
        if (!job) continue;
        const keywords = rec.strengths || [];
        ap.addLog({
          stepId: "resume",
          type: "ai_call",
          title: `为 ${job.title} @ ${job.company} 生成优化简历`,
          toolName: "ai:generateResume",
          prompt: `岗位: ${job.title}, 关键词: ${keywords.join(",")}`,
        });
        try {
          const optimized = await window.electronAPI.generateResume({
            resumeText: cv,
            jobTitle: job.title,
            company: job.company,
            jobDescription: job.description || "",
            keywords,
          });
          await useResumeStore
            .getState()
            .addGeneratedResume({
              user_id: cp.id || "default",
              job_listing_id: rec.job_listing_id,
              template_id: "ai-generated",
              resume_content: optimized,
              keywords_injected: keywords,
            });
          resumesGenerated++;
          ap.addLog({
            stepId: "resume",
            type: "success",
            title: `${job.title} 简历已生成`,
            response: (optimized as string).slice(0, 300) + "...",
          });
        } catch (e: any) {
          ap.addLog({
            stepId: "resume",
            type: "error",
            title: `${job.title} 简历生成失败: ${e.message || e}`,
          });
        }
      }
      ap.updateStep("resume", {
        status: "done",
        detail: `${resumesGenerated} 份优化简历`,
      });

      // ===== Step 7: 生成面试准备 =====
      ap.setCurrentStep(7);
      ap.updateStep("interview", { status: "running" });
      for (const rec of recommended.slice(0, 5)) {
        if (!pipelineRef.current) return;
        const job = allJobs.find((j) => j.id === rec.job_listing_id);
        if (!job) continue;
        ap.addLog({
          stepId: "interview",
          type: "ai_call",
          title: `为 ${job.title} 生成 STAR 故事`,
          toolName: "ai:generateSTARStories",
        });
        try {
          const stories = await window.electronAPI.generateSTARStories({
            resumeText: cv,
            profile: cp,
            jobTitle: job.title,
            company: job.company,
            count: 2,
          });
          for (const story of stories as any[]) {
            await useInterviewStore.getState().addStory(story);
            storiesGenerated++;
            ap.addLog({
              stepId: "interview",
              type: "success",
              title: `STAR: ${story.title} (${story.competency})`,
            });
          }
          ap.addLog({
            stepId: "interview",
            type: "ai_call",
            title: `为 ${job.title} 生成面试题`,
            toolName: "ai:generateInterviewQuestions",
          });
          const questions = await window.electronAPI.generateInterviewQuestions(
            {
              jobTitle: job.title,
              company: job.company,
              jobDescription: job.description || "",
              count: 3,
            },
          );
          for (const q of questions as any[]) {
            await useInterviewStore
              .getState()
              .addQuestion({ ...q, job_listing_id: rec.job_listing_id });
          }
          ap.addLog({
            stepId: "interview",
            type: "success",
            title: `${job.title} 面试题已生成 ${(questions as any[]).length} 道`,
          });
        } catch (e: any) {
          ap.addLog({
            stepId: "interview",
            type: "error",
            title: `面试准备失败: ${e.message || e}`,
          });
        }
      }
      ap.updateStep("interview", {
        status: "done",
        detail: `${storiesGenerated} 个 STAR 故事`,
      });

      // ===== 完成 =====
      ap.setCurrentStep(8);
      ap.addLog({
        stepId: "interview",
        type: "success",
        title: "🎉 全流程完成！",
      });
      ap.setSummary({
        jobsFound,
        jobsEvaluated,
        topJobs,
        companiesAnalyzed,
        tracksCreated,
        resumesGenerated,
        storiesGenerated,
      });
    } catch (err) {
      const stepId = ap.steps[Math.max(0, ap.currentStep)]?.id;
      if (stepId) {
        ap.updateStep(stepId as StepId, {
          status: "error",
          detail: (err as Error).message || "执行失败",
        });
        ap.addLog({
          stepId: stepId as StepId,
          type: "error",
          title: `流程异常终止: ${(err as Error).message}`,
        });
      }
      useAutoPilotStore.setState({ running: false });
    }
    pipelineRef.current = false;
  };

  const stepColor = (s: string) =>
    s === "running"
      ? "blue"
      : s === "done"
        ? "green"
        : s === "error"
          ? "red"
          : "gray";
  const stepIcon = (step: StepDef) =>
    step.status === "running" ? (
      <Loader size={20} />
    ) : step.status === "done" ? (
      <IconCheck size={20} />
    ) : step.status === "error" ? (
      <IconX size={20} />
    ) : (
      STEP_ICONS[step.id]
    );

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={2}>
              <Group gap="sm">
                <IconRocket size={32} color="blue" />
                <span>AI 全自动求职助手</span>
              </Group>
            </Title>
            <Text c="dimmed" mt="xs">
              一键启动 AI 全流程，切换页面不会中断运行
            </Text>
          </div>
        </Group>

        {!selfIntro && !resumeText && (
          <Alert color="yellow" title="提示：建议先完善个人资料">
            <Text size="sm" mb="sm">
              AI
              需要你的简历或个人介绍才能自动工作。也可以直接点击下方按钮用默认信息运行。
            </Text>
            <Group>
              <Button size="xs" onClick={() => navigate("/self-intro")}>
                填写个人情况
              </Button>
              <Button
                size="xs"
                variant="light"
                onClick={() => navigate("/resume")}
              >
                上传简历
              </Button>
            </Group>
          </Alert>
        )}

        {/* 控制面板 */}
        <Card withBorder shadow="sm" radius="md" padding="xl">
          <Stack gap="lg">
            <Group justify="space-between">
              <Group gap="sm">
                <ThemeIcon size={48} radius="md" color="blue" variant="light">
                  <IconSparkles size={24} />
                </ThemeIcon>
                <div>
                  <Text fw={600} size="lg">
                    一键启动
                  </Text>
                  <Text size="sm" c="dimmed">
                    {selfIntro || resumeText
                      ? "已检测到个人资料"
                      : "未检测到资料，将用默认信息运行"}
                  </Text>
                </div>
              </Group>
              <Group>
                {ap.running && (
                  <Button
                    size="md"
                    color="red"
                    variant="light"
                    leftSection={<IconPlayerStop size={18} />}
                    onClick={() => {
                      pipelineRef.current = false;
                      ap.stopPipeline();
                    }}
                  >
                    停止
                  </Button>
                )}
                <Button
                  size="lg"
                  leftSection={<IconPlayerPlay size={20} />}
                  onClick={startPipeline}
                  loading={ap.running}
                  disabled={ap.running}
                  gradient={{ from: "blue", to: "cyan" }}
                  variant="gradient"
                >
                  {ap.running
                    ? "正在运行..."
                    : ap.summary
                      ? "重新运行"
                      : "开始全自动流程"}
                </Button>
              </Group>
            </Group>

            {ap.running && (
              <Progress
                value={((ap.currentStep + 1) / ap.steps.length) * 100}
                animated
                size="lg"
                radius="xl"
              />
            )}

            <Divider />

            {/* 步骤卡片 */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {ap.steps.map((step) => (
                <Card
                  key={step.id}
                  withBorder
                  p="md"
                  radius="md"
                  style={{
                    borderColor:
                      step.status === "running"
                        ? "var(--mantine-color-blue-4)"
                        : step.status === "done"
                          ? "var(--mantine-color-green-4)"
                          : step.status === "error"
                            ? "var(--mantine-color-red-4)"
                            : undefined,
                    opacity: step.status === "idle" ? 0.6 : 1,
                  }}
                >
                  <Stack gap="xs">
                    <Group gap="sm">
                      <ThemeIcon
                        size={36}
                        radius="md"
                        color={stepColor(step.status)}
                        variant={
                          step.status === "running"
                            ? "light"
                            : step.status === "done"
                              ? "filled"
                              : "light"
                        }
                      >
                        {stepIcon(step)}
                      </ThemeIcon>
                      <div>
                        <Text fw={600} size="sm">
                          {step.label}
                        </Text>
                        <Badge
                          size="xs"
                          color={stepColor(step.status)}
                          variant="light"
                        >
                          {step.status === "idle"
                            ? "等待中"
                            : step.status === "running"
                              ? "运行中"
                              : step.status === "done"
                                ? "已完成"
                                : "失败"}
                        </Badge>
                      </div>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {step.description}
                    </Text>
                    {step.detail && (
                      <Text
                        size="xs"
                        fw={500}
                        c={step.status === "error" ? "red" : "green"}
                      >
                        {step.detail}
                      </Text>
                    )}
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Card>

        <AutoApplyPanel />

        {/* AI 活动日志 */}
        {ap.logs.length > 0 && (
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <IconRobot size={20} color="violet" />
                  <Text fw={600}>AI 活动日志</Text>
                  <Badge size="sm" color="violet" variant="light">
                    {ap.logs.length} 条
                  </Badge>
                </Group>
              </Group>
              <Text size="xs" c="dimmed">
                点击条目查看 AI 思维链、发送的 Prompt 和返回结果
              </Text>
              <ScrollArea h={ap.logs.length > 15 ? 400 : undefined}>
                <div style={{ padding: "4px 0" }}>
                  {ap.logs.map((entry) => (
                    <LogItem key={entry.id} entry={entry} />
                  ))}
                </div>
              </ScrollArea>
            </Stack>
          </Card>
        )}

        {/* 结果摘要 */}
        {ap.summary && (
          <Card withBorder shadow="sm" radius="md" padding="xl">
            <Stack gap="lg">
              <Group gap="sm">
                <ThemeIcon size={40} radius="md" color="green" variant="filled">
                  <IconCheck size={20} />
                </ThemeIcon>
                <div>
                  <Title order={3}>全流程完成！</Title>
                  <Text c="dimmed">AI 已为你完成所有求职准备工作</Text>
                </div>
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 7 }} spacing="md">
                <Paper withBorder p="md" radius="md" ta="center">
                  <Text size="xl" fw={700} c="blue">
                    {ap.summary.jobsFound}
                  </Text>
                  <Text size="xs" c="dimmed">
                    发现岗位
                  </Text>
                </Paper>
                <Paper withBorder p="md" radius="md" ta="center">
                  <Text size="xl" fw={700} c="cyan">
                    {ap.summary.jobsEvaluated}
                  </Text>
                  <Text size="xs" c="dimmed">
                    已评估
                  </Text>
                </Paper>
                <Paper withBorder p="md" radius="md" ta="center">
                  <Text size="xl" fw={700} c="green">
                    {ap.summary.topJobs}
                  </Text>
                  <Text size="xs" c="dimmed">
                    推荐岗位
                  </Text>
                </Paper>
                <Paper withBorder p="md" radius="md" ta="center">
                  <Text size="xl" fw={700} c="teal">
                    {ap.summary.companiesAnalyzed}
                  </Text>
                  <Text size="xs" c="dimmed">
                    企业分析
                  </Text>
                </Paper>
                <Paper withBorder p="md" radius="md" ta="center">
                  <Text size="xl" fw={700} c="orange">
                    {ap.summary.tracksCreated}
                  </Text>
                  <Text size="xs" c="dimmed">
                    创建跟踪
                  </Text>
                </Paper>
                <Paper withBorder p="md" radius="md" ta="center">
                  <Text size="xl" fw={700} c="violet">
                    {ap.summary.resumesGenerated}
                  </Text>
                  <Text size="xs" c="dimmed">
                    优化简历
                  </Text>
                </Paper>
                <Paper withBorder p="md" radius="md" ta="center">
                  <Text size="xl" fw={700} c="grape">
                    {ap.summary.storiesGenerated}
                  </Text>
                  <Text size="xs" c="dimmed">
                    STAR故事
                  </Text>
                </Paper>
              </SimpleGrid>
              <Group justify="center" gap="md">
                <Button
                  leftSection={<IconChartBar size={16} />}
                  onClick={() => navigate("/tracker")}
                >
                  查看投递跟踪
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconBuilding size={16} />}
                  onClick={() => navigate("/companies")}
                >
                  查看企业评估
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconFileDescription size={16} />}
                  onClick={() => navigate("/resume-generator")}
                >
                  查看优化简历
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconMessageCircle size={16} />}
                  onClick={() => navigate("/interview")}
                >
                  查看面试准备
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
