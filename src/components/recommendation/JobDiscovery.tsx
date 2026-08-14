import { useState, useEffect, useCallback, useRef } from "react";
import {
  Container,
  Title,
  Text,
  Group,
  Stack,
  Card,
  Button,
  Alert,
  Badge,
  TextInput,
  Select,
  Switch,
  SimpleGrid,
  LoadingOverlay,
  FileInput,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconSearch,
  IconRefresh,
  IconUpload,
  IconDownload,
  IconBuildingFactory,
  IconMapPin,
  IconAlertTriangle,
  IconWorld,
  IconTarget,
  IconDeviceFloppy,
  IconX,
  IconListDetails,
} from "@tabler/icons-react";

interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  snippet?: string;
  salary?: string;
  tags?: string[];
  source: string;
  url?: string;
  collectedAt?: string;
  quality?: {
    validityStatus: "valid" | "needs_review" | "invalid";
    validityScore: number;
    trainingRiskScore: number;
    flags: string[];
  };
}

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  bing: { label: "Bing", color: "teal" },
  serpapi: { label: "SerpApi", color: "grape" },
  custom: { label: "自定义", color: "indigo" },
  crawler: { label: "爬虫", color: "orange" },
  manual: { label: "手动", color: "blue" },
  api: { label: "API", color: "green" },
  search: { label: "搜索", color: "cyan" },
  ai_search: { label: "AI搜索", color: "violet" },
};

function sourceBadge(source: string) {
  const item = SOURCE_BADGE[source] || {
    label: source || "未知",
    color: "gray",
  };
  return (
    <Badge color={item.color} variant="light">
      {item.label}
    </Badge>
  );
}

export default function JobDiscovery() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState("https://www.zhipin.com");
  const [extracting, setExtracting] = useState(false);
  const [previewJobs, setPreviewJobs] = useState<JobItem[]>([]);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mapJob = (raw: Record<string, unknown>): JobItem => {
    let tags: string[] | undefined;
    if (Array.isArray(raw.tags)) tags = raw.tags as string[];
    else if (typeof raw.tags === "string") {
      try {
        tags = JSON.parse(raw.tags);
      } catch {
        tags = raw.tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
    return {
      id: String(raw.id ?? "job-" + Math.random().toString(36).slice(2, 8)),
      title: String(raw.title ?? raw.name ?? "未命名职位"),
      company: String(raw.company ?? raw.company_name ?? "未知公司"),
      location: String(raw.location ?? raw.location_city ?? raw.city ?? ""),
      snippet: raw.snippet
        ? String(raw.snippet)
        : raw.description
          ? String(raw.description)
          : undefined,
      salary: raw.salary ? String(raw.salary) : undefined,
      tags,
      source: String(raw.source ?? "manual"),
      url: raw.url
        ? String(raw.url)
        : raw.source_url
          ? String(raw.source_url)
          : undefined,
      collectedAt: raw.collected_at
        ? String(raw.collected_at)
        : raw.createdAt
          ? String(raw.createdAt)
          : undefined,
      quality: raw.quality as JobItem["quality"],
    };
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await window.electronAPI?.getJobListings?.()) as
        Record<string, unknown>[] | undefined;
      if (!isMountedRef.current) return;
      if (data && Array.isArray(data)) {
        setJobs(data.map(mapJob));
      }
    } catch (err) {
      if (isMountedRef.current)
        setError("加载本地职位失败：" + (err as Error).message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefresh = async () => {
    setError(null);
    setInfo(null);
    if (!online) {
      setInfo("联网模式已关闭，仅刷新本地已保存的职位。");
      await loadJobs();
      return;
    }
    setRefreshing(true);
    try {
      const query = searchQuery.trim() || "招聘";
      const results = (await window.electronAPI?.searchJobs?.(query)) as
        Record<string, unknown>[] | undefined;
      if (!isMountedRef.current) return;
      const validated = (await window.electronAPI?.validateJobs?.(
        results || [],
      )) as
        | {
            jobs?: Record<string, unknown>[];
            duplicateCount?: number;
            invalidCount?: number;
            trainingRiskCount?: number;
          }
        | undefined;
      const mapped = (validated?.jobs || results || []).map(mapJob);
      if (mapped.length > 0) {
        if (window.electronAPI?.saveJobs) {
          await window.electronAPI.saveJobs(mapped);
        }
        if (!isMountedRef.current) return;
        setInfo(
          `搜索到 ${mapped.length} 条有效候选，已保存到本地。去重 ${validated?.duplicateCount || 0} 条，无效 ${validated?.invalidCount || 0} 条，高培训风险 ${validated?.trainingRiskCount || 0} 条。`,
        );
        await loadJobs();
      } else {
        setInfo("搜索未返回结果。");
      }
    } catch (err) {
      const msg = (err as Error).message || "";
      if (!isMountedRef.current) return;
      if (msg.includes("未配置") || msg.includes("搜索源")) {
        setError("未配置搜索源，请先在数据源管理中配置。");
      } else {
        setError("搜索失败：" + msg);
      }
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const text = await file.text();
      if (!isMountedRef.current) return;
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [parsed];
      if (window.electronAPI?.importData) {
        const result = await window.electronAPI.importData("json", list);
        if (!isMountedRef.current) return;
        if (result?.success) {
          setInfo("成功导入 " + result.count + " 条数据");
          await loadJobs();
        } else {
          setError("导入失败");
        }
      } else {
        setError("导入功能不可用");
      }
    } catch (err) {
      if (isMountedRef.current)
        setError(
          "导入失败：文件格式错误或数据损坏 (" + (err as Error).message + ")",
        );
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleExport = () => {
    if (jobs.length === 0) {
      setError("当前没有可导出的职位");
      return;
    }
    setError(null);
    try {
      const blob = new Blob([JSON.stringify(jobs, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jobs-export-" + Date.now() + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setInfo("已导出 " + jobs.length + " 条职位。");
    } catch (err) {
      setError("导出失败：" + (err as Error).message);
    }
  };

  const handleOpenBrowser = async () => {
    setError(null);
    setInfo(null);
    try {
      await window.electronAPI?.openJobBrowser?.(
        browserUrl.trim() || "https://www.zhipin.com",
      );
      if (!isMountedRef.current) return;
      setInfo(
        '浏览器已打开。请在浏览器中登录招聘网站，导航到职位列表页后，再回来点击"抓取当前页"。',
      );
    } catch (err) {
      if (isMountedRef.current)
        setError("打开浏览器失败：" + (err as Error).message);
    }
  };

  const handleExtractJobs = async () => {
    setExtracting(true);
    setError(null);
    setInfo(null);
    try {
      const result = await window.electronAPI?.extractJobsFromPage?.();
      if (!isMountedRef.current) return;
      if (result?.success && Array.isArray(result.jobs)) {
        const mapped = (result.jobs as Record<string, unknown>[]).map(mapJob);
        setPreviewJobs(mapped);
        setInfo(
          `成功抓取 ${mapped.length} 条职位。请确认后点击"保存全部到本地"。`,
        );
      } else {
        throw new Error("未返回职位数据");
      }
    } catch (err) {
      if (isMountedRef.current) setError("抓取失败：" + (err as Error).message);
    } finally {
      if (isMountedRef.current) setExtracting(false);
    }
  };

  const handleSavePreview = async () => {
    if (previewJobs.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      if (window.electronAPI?.saveJobs) {
        const result = await window.electronAPI.saveJobs(previewJobs);
        if (!isMountedRef.current) return;
        if (result?.success) {
          setInfo(`成功保存 ${result.count} 条职位到本地。`);
          setPreviewJobs([]);
          await loadJobs();
        }
      }
    } catch (err) {
      if (isMountedRef.current) setError("保存失败：" + (err as Error).message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleCloseBrowser = async () => {
    try {
      await window.electronAPI?.closeJobBrowser?.();
      if (!isMountedRef.current) return;
      setInfo("浏览器已关闭。");
      setPreviewJobs([]);
    } catch (err) {
      if (isMountedRef.current)
        setError("关闭浏览器失败：" + (err as Error).message);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q);
    const matchIndustry =
      !industry ||
      (job.tags?.some((t) =>
        t.toLowerCase().includes(industry.toLowerCase()),
      ) ??
        false);
    const matchRegion =
      !region || job.location.toLowerCase().includes(region.toLowerCase());
    return matchQuery && matchIndustry && matchRegion;
  });

  return (
    <Container size="xl" py="md">
      <LoadingOverlay visible={loading && jobs.length === 0} />
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>职位获取</Title>
            <Text c="dimmed" size="sm">
              通过联网搜索、爬虫或手动导入职位，支持收藏后评估对应企业。
            </Text>
          </div>
          <Group gap="xs">
            <Switch
              checked={online}
              onChange={(e) => setOnline(e.currentTarget.checked)}
              label={online ? "联网模式" : "离线模式"}
              size="xs"
            />
            <Button
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate(-1)}
            >
              返回
            </Button>
          </Group>
        </Group>

        {error && (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={16} />}
            title="出错了"
          >
            {error}
          </Alert>
        )}
        {info && (
          <Alert color="blue" title="提示">
            {info}
          </Alert>
        )}

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Group grow>
              <TextInput
                placeholder="搜索职位、公司或城市"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                leftSection={<IconSearch size={16} />}
              />
              <Select
                placeholder="行业筛选"
                value={industry}
                onChange={setIndustry}
                data={[
                  { value: "互联网", label: "互联网" },
                  { value: "金融", label: "金融" },
                  { value: "教育", label: "教育" },
                  { value: "制造", label: "制造" },
                  { value: "医疗", label: "医疗" },
                ]}
                clearable
              />
              <Select
                placeholder="地区筛选"
                value={region}
                onChange={setRegion}
                data={[
                  { value: "北京", label: "北京" },
                  { value: "上海", label: "上海" },
                  { value: "深圳", label: "深圳" },
                  { value: "广州", label: "广州" },
                  { value: "杭州", label: "杭州" },
                  { value: "成都", label: "成都" },
                ]}
                clearable
              />
            </Group>
            <Group justify="space-between">
              <Group gap="xs">
                <Button
                  leftSection={<IconRefresh size={16} />}
                  loading={refreshing}
                  onClick={handleRefresh}
                >
                  刷新职位
                </Button>
                <FileInput
                  placeholder="导入 JSON"
                  leftSection={<IconUpload size={16} />}
                  accept=".json"
                  onChange={handleImport}
                  style={{ width: 200 }}
                />
                <Button
                  variant="light"
                  leftSection={<IconDownload size={16} />}
                  onClick={handleExport}
                >
                  导出职位
                </Button>
              </Group>
              <Text size="sm" c="dimmed">
                共 {filteredJobs.length} / {jobs.length} 条
              </Text>
            </Group>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="sm" align="center">
            <IconWorld size={20} color="var(--mantine-color-indigo-6)" />
            <Title order={4}>视觉 OCR 抓取（截图识别）</Title>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            打开招聘网站 → 登录 → 导航到职位列表页 →
            点击抓取，视觉模型会识别截图提取职位
          </Text>
          <Group gap="md" mb="md" align="flex-end">
            <TextInput
              label="招聘网站 URL"
              placeholder="https://www.zhipin.com"
              value={browserUrl}
              onChange={(e) => setBrowserUrl(e.currentTarget.value)}
              leftSection={<IconWorld size={16} />}
              style={{ flex: 1 }}
            />
            <Button
              variant="light"
              leftSection={<IconWorld size={16} />}
              onClick={handleOpenBrowser}
            >
              打开浏览器
            </Button>
          </Group>
          <Group gap="xs">
            <Button
              leftSection={<IconTarget size={16} />}
              loading={extracting}
              onClick={handleExtractJobs}
            >
              抓取当前页
            </Button>
            <Button
              variant="light"
              leftSection={<IconDeviceFloppy size={16} />}
              disabled={previewJobs.length === 0}
              onClick={handleSavePreview}
            >
              保存全部到本地 ({previewJobs.length})
            </Button>
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconX size={16} />}
              onClick={handleCloseBrowser}
            >
              关闭浏览器
            </Button>
          </Group>
          {previewJobs.length > 0 && (
            <Stack gap="xs" mt="md">
              <Text size="xs" c="dimmed" fw={500}>
                预览（前 10 条，共 {previewJobs.length} 条）：
              </Text>
              {previewJobs.slice(0, 10).map((job, i) => (
                <Group key={job.id} gap="xs" align="center">
                  <Badge size="xs" variant="light" color="gray">
                    {i + 1}
                  </Badge>
                  <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
                    {job.title}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {job.company}
                  </Text>
                  {job.salary && (
                    <Text size="xs" c="orange" fw={500}>
                      {job.salary}
                    </Text>
                  )}
                </Group>
              ))}
            </Stack>
          )}
        </Card>

        {filteredJobs.length === 0 ? (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack align="center" gap="sm" py="xl">
              <IconSearch size={40} color="gray" />
              <Text c="dimmed">
                暂无职位，点击刷新职位联网搜索或导入 JSON。
              </Text>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
              >
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start">
                    <Text fw={600} size="sm" lineClamp={2}>
                      {job.title}
                    </Text>
                    {sourceBadge(job.source)}
                  </Group>
                  <Group gap="xs">
                    <Group gap={4}>
                      <IconBuildingFactory size={14} />
                      <Text size="sm">{job.company}</Text>
                    </Group>
                  </Group>
                  <Group gap="xs">
                    <Group gap={4}>
                      <IconMapPin size={14} />
                      <Text size="sm" c="dimmed">
                        {job.location || "未知地区"}
                      </Text>
                    </Group>
                    {job.salary && (
                      <Text size="sm" c="orange" fw={500}>
                        {job.salary}
                      </Text>
                    )}
                  </Group>
                  {job.snippet && (
                    <Text size="xs" c="dimmed" lineClamp={3}>
                      {job.snippet}
                    </Text>
                  )}
                  {job.tags && job.tags.length > 0 && (
                    <Group gap={4}>
                      {job.tags
                        .filter(
                          (tag) =>
                            !tag.startsWith("有效分:") &&
                            !tag.startsWith("有效性:") &&
                            !tag.startsWith("培训风险:"),
                        )
                        .slice(0, 4)
                        .map((tag, i) => (
                          <Badge
                            key={`tag-${tag}-${i}`}
                            size="xs"
                            variant="light"
                            color="gray"
                          >
                            {tag}
                          </Badge>
                        ))}
                    </Group>
                  )}
                  {job.quality && (
                    <Group gap={4}>
                      <Badge
                        size="xs"
                        color={
                          job.quality.validityStatus === "valid"
                            ? "green"
                            : job.quality.validityStatus === "invalid"
                              ? "red"
                              : "yellow"
                        }
                        variant="light"
                      >
                        有效性 {job.quality.validityScore}
                      </Badge>
                      <Badge
                        size="xs"
                        color={
                          job.quality.trainingRiskScore >= 70
                            ? "red"
                            : job.quality.trainingRiskScore >= 35
                              ? "yellow"
                              : "green"
                        }
                        variant="light"
                      >
                        培训风险 {job.quality.trainingRiskScore}
                      </Badge>
                    </Group>
                  )}
                  {job.url && (
                    <Group gap="xs">
                      <Button
                        component="a"
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        variant="subtle"
                        size="xs"
                        mt={4}
                      >
                        查看原职位
                      </Button>
                      <Button
                        variant="light"
                        size="xs"
                        mt={4}
                        leftSection={<IconListDetails size={14} />}
                        onClick={async () => {
                          try {
                            await window.electronAPI?.saveTracker?.({
                              job_listing_id: job.id,
                              job_title: job.title,
                              company: job.company,
                              status: "discovered",
                              notes: "",
                            });
                            navigate("/tracker");
                          } catch (err) {
                            console.error("Failed to track job:", err);
                          }
                        }}
                      >
                        投递跟踪
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
