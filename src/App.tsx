import { useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  SimpleGrid,
  ThemeIcon,
  Button,
  AppShell,
  NavLink,
  Group,
  Burger,
  ScrollArea,
  Progress,
  Loader,
  Badge,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBrain,
  IconBuilding,
  IconSparkles,
  IconUser,
  IconFileText,
  IconBriefcase,
  IconDatabase,
  IconRobot,
  IconDownload,
  IconHome,
  IconListDetails,
  IconTimeline,
  IconTemplate,
  IconSearch,
  IconRocket,
  IconPlayerStop,
  IconX,
} from "@tabler/icons-react";

import { useUserStore } from "./stores/useUserStore";
import { useCompanyStore } from "./stores/useCompanyStore";
import { useAssessmentStore } from "./stores/useAssessmentStore";
import { useJobScanStore } from "./stores/useJobScanStore";
import { useEvaluationStore } from "./stores/useEvaluationStore";
import { useTrackerStore } from "./stores/useTrackerStore";
import { useInterviewStore } from "./stores/useInterviewStore";
import { useResumeStore } from "./stores/useResumeStore";
import {
  getDueScanConfigIds,
  startRadarScheduler,
} from "./services/radarScheduler";
import { useAutoPilotStore } from "./stores/useAutoPilotStore";
import PersonalAssessment from "./components/assessment/PersonalAssessment";
import MBTIQuestionnaire from "./components/assessment/MBTIQuestionnaire";
import BigFiveQuestionnaire from "./components/assessment/BigFiveQuestionnaire";
import InterestSurvey from "./components/assessment/InterestSurvey";
import SelfIntro from "./components/assessment/SelfIntro";
import ResumeUpload from "./components/assessment/ResumeUpload";
import CompanyList from "./components/company/CompanyList";
import CompanyDetail from "./components/company/CompanyDetail";
import CompanyForm from "./components/company/CompanyForm";
import JobDiscovery from "./components/recommendation/JobDiscovery";
import RecommendationList from "./components/recommendation/RecommendationList";
import CareerPathVisualization from "./components/recommendation/CareerPathVisualization";
import AssessmentResult from "./components/assessment/AssessmentResult";
import ApiKeySettings from "./components/settings/ApiKeySettings";
import DataSourceManager from "./components/settings/DataSourceManager";
import DataBackup from "./components/settings/DataBackup";
import DisclaimerDialog from "./components/common/DisclaimerDialog";
import ApplicationTracker from "./components/tracker/ApplicationTracker";
import JobScanManager from "./components/scan/JobScanManager";
import ResumeGenerator from "./components/resume/ResumeGenerator";
import InterviewPrep from "./components/interview/InterviewPrep";
import AutoPilot from "./components/autopilot/AutoPilot";

const navItems = [
  { label: "首页", icon: IconHome, link: "/" },
  { label: "🚀 AI 全自动", icon: IconRocket, link: "/autopilot" },
  { label: "个人评估", icon: IconBrain, link: "/assessment" },
  { label: "个人情况", icon: IconUser, link: "/self-intro" },
  { label: "简历上传", icon: IconFileText, link: "/resume" },
  { label: "职位获取", icon: IconBriefcase, link: "/jobs" },
  { label: "岗位雷达", icon: IconSearch, link: "/scan" },
  { label: "企业评估", icon: IconBuilding, link: "/companies" },
  { label: "智能推荐", icon: IconSparkles, link: "/recommendations" },
  { label: "投递跟踪", icon: IconListDetails, link: "/tracker" },
  { label: "简历生成", icon: IconTemplate, link: "/resume-generator" },
  { label: "面试准备", icon: IconTimeline, link: "/interview" },
  { label: "AI 配置", icon: IconRobot, link: "/settings/api" },
  { label: "数据源管理", icon: IconDatabase, link: "/settings/datasource" },
  { label: "数据备份", icon: IconDownload, link: "/settings/backup" },
];

function HomePage() {
  const features = [
    {
      title: "🚀 AI 全自动",
      description: "一键启动：分析简历→搜索岗位→评估→跟踪→简历→面试准备",
      icon: IconRocket,
      color: "blue",
      link: "/autopilot",
    },
    {
      title: "个人评估",
      description: "MBTI、五大人格、霍兰德职业兴趣、AI 洞察分析",
      icon: IconBrain,
      color: "cyan",
      link: "/assessment",
    },
    {
      title: "个人情况",
      description: "填写身份、自我介绍，帮助推荐更精准",
      icon: IconUser,
      color: "cyan",
      link: "/self-intro",
    },
    {
      title: "简历上传",
      description: "上传简历，解锁完整推荐功能",
      icon: IconFileText,
      color: "teal",
      link: "/resume",
    },
    {
      title: "职位获取",
      description: "联网搜索、爬虫导入、手动添加职位",
      icon: IconBriefcase,
      color: "indigo",
      link: "/jobs",
    },
    {
      title: "岗位雷达",
      description: "监控招聘渠道，清洗去重并发现新职位",
      icon: IconSearch,
      color: "lime",
      link: "/scan",
    },
    {
      title: "企业评估",
      description: "公司稳定性、晋升路径、行业前景",
      icon: IconBuilding,
      color: "green",
      link: "/companies",
    },
    {
      title: "智能推荐",
      description: "结合专业、性格、兴趣的个性化推荐",
      icon: IconSparkles,
      color: "violet",
      link: "/recommendations",
    },
    {
      title: "投递跟踪",
      description: "看板/列表/时间线多视图管理申请",
      icon: IconListDetails,
      color: "pink",
      link: "/tracker",
    },
    {
      title: "简历生成",
      description: "基于JD关键词注入的简历优化",
      icon: IconTemplate,
      color: "red",
      link: "/resume-generator",
    },
    {
      title: "面试准备",
      description: "STAR故事库、AI生成面试题",
      icon: IconTimeline,
      color: "grape",
      link: "/interview",
    },
    {
      title: "AI 配置",
      description: "API Key、服务商、模型管理",
      icon: IconRobot,
      color: "orange",
      link: "/settings/api",
    },
    {
      title: "数据备份",
      description: "导入导出数据，防止丢失",
      icon: IconDownload,
      color: "gray",
      link: "/settings/backup",
    },
  ];

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={1} ta="center">
          JobRadar
        </Title>
        <Text ta="center" c="dimmed" mb="xl">
          岗位雷达与 AI 求职助手 - 从发现机会到拿到 Offer
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {features.map((feature) => (
            <Card
              key={feature.title}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              component={Link}
              to={feature.link}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Stack align="center" gap="sm">
                <ThemeIcon
                  size={56}
                  radius="md"
                  color={feature.color}
                  variant="light"
                >
                  <feature.icon size={28} />
                </ThemeIcon>
                <Text fw={500} size="lg" ta="center">
                  {feature.title}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  {feature.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

/** 全局悬浮进度条 - 当 AI 全自动流程运行时在任何页面都可见 */
function AutoPilotBanner() {
  const { running, currentStep, steps, summary } = useAutoPilotStore();
  if (!running && !summary) return null;
  const currentStepDef =
    currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;
  const isDone = !!summary;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        marginBottom: 12,
        background: isDone
          ? "var(--mantine-color-green-1)"
          : "var(--mantine-color-blue-0)",
        border: isDone
          ? "1px solid var(--mantine-color-green-4)"
          : "1px solid var(--mantine-color-blue-3)",
        borderRadius: 8,
        padding: "8px 16px",
      }}
    >
      <Group justify="space-between" gap="sm">
        <Group gap="sm" style={{ flex: 1 }}>
          <Badge color={isDone ? "green" : "blue"} variant="filled" size="sm">
            {isDone ? "✅ 完成" : "🚀 AI 自动流程"}
          </Badge>
          <Text size="sm" fw={500}>
            {isDone
              ? `已发现 ${summary.jobsFound} 个岗位，推荐 ${summary.topJobs} 个`
              : currentStepDef
                ? `${currentStepDef.label}...`
                : "准备中..."}
          </Text>
          {!isDone && currentStepDef && <Loader size="xs" />}
        </Group>
        {running && (
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {currentStep + 1}/{steps.length}
            </Text>
            <Button
              size="compact-xs"
              variant="subtle"
              component={Link}
              to="/autopilot"
            >
              查看详情
            </Button>
          </Group>
        )}
        {isDone && (
          <Button
            size="compact-xs"
            variant="subtle"
            component={Link}
            to="/autopilot"
          >
            查看结果
          </Button>
        )}
      </Group>
      {running && (
        <Progress
          value={((currentStep + 1) / steps.length) * 100}
          size="xs"
          radius="xl"
          mt={4}
          animated
        />
      )}
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Container size="lg" py="xl">
      {children}
    </Container>
  );
}

function NotFound() {
  return (
    <PageWrapper>
      <Stack align="center" gap="md">
        <Title order={2}>页面不存在</Title>
        <Button component={Link} to="/" variant="subtle">
          ← 返回首页
        </Button>
      </Stack>
    </PageWrapper>
  );
}

export default function App() {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();

  useEffect(() => {
    let stopRadarScheduler = () => {};
    let disposed = false;

    useUserStore.getState().loadFromBackend?.();
    useCompanyStore.getState().loadFromBackend?.();
    useAssessmentStore.getState().loadFromBackend?.();
    void useJobScanStore
      .getState()
      .loadFromBackend()
      .then(() => {
        if (disposed) return;
        stopRadarScheduler = startRadarScheduler(async () => {
          const radar = useJobScanStore.getState();
          if (radar.isScanning) return;
          const dueIds = getDueScanConfigIds(radar.scanConfigs);
          if (dueIds.length > 0) await radar.startScan(dueIds);
        });
      });
    useEvaluationStore.getState().loadFromBackend();
    useTrackerStore.getState().loadFromBackend();
    useInterviewStore.getState().loadFromBackend();
    useResumeStore.getState().loadFromBackend();

    return () => {
      disposed = true;
      stopRadarScheduler();
    };
  }, []);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              hiddenFrom="sm"
            />
            <Text fw={700} size="lg">
              JobRadar
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            岗位雷达与 AI 求职助手
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea>
          <Stack gap="xs">
            {navItems.map((item) => (
              <NavLink
                key={item.link}
                component={Link}
                to={item.link}
                label={item.label}
                leftSection={<item.icon size={18} />}
                active={
                  location.pathname === item.link ||
                  (item.link !== "/" && location.pathname.startsWith(item.link))
                }
                onClick={() => {
                  if (window.innerWidth < 768) toggle();
                }}
              />
            ))}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        {/* 免责公告：首次启动自动弹出；设置页可通过 reopenDisclaimer() 重新打开 */}
        <DisclaimerDialog />
        {/* AI 全自动流程浮窗进度条 */}
        <AutoPilotBanner />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/autopilot" element={<AutoPilot />} />
          <Route path="/assessment" element={<PersonalAssessment />} />
          <Route path="/assessment/mbti" element={<MBTIQuestionnaire />} />
          <Route
            path="/assessment/bigfive"
            element={<BigFiveQuestionnaire />}
          />
          <Route path="/assessment/interest" element={<InterestSurvey />} />
          <Route path="/assessment/result" element={<AssessmentResult />} />
          <Route
            path="/assessment/career-match"
            element={<CareerPathVisualization />}
          />
          <Route path="/self-intro" element={<SelfIntro />} />
          <Route path="/profile" element={<SelfIntro />} />
          <Route path="/resume" element={<ResumeUpload />} />
          <Route path="/jobs" element={<JobDiscovery />} />
          <Route path="/companies" element={<CompanyList />} />
          <Route path="/companies/new" element={<CompanyForm />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/companies/:id/edit" element={<CompanyForm />} />
          <Route path="/recommendations" element={<RecommendationList />} />
          <Route path="/scan" element={<JobScanManager />} />
          <Route path="/tracker" element={<ApplicationTracker />} />
          <Route path="/resume-generator" element={<ResumeGenerator />} />
          <Route path="/interview" element={<InterviewPrep />} />
          <Route
            path="/settings"
            element={<Navigate to="/settings/api" replace />}
          />
          <Route path="/settings/api" element={<ApiKeySettings />} />
          <Route path="/settings/datasource" element={<DataSourceManager />} />
          <Route path="/settings/backup" element={<DataBackup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
