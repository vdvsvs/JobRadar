import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconClock,
  IconExternalLink,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react";

type AutoApplyLog = {
  id: string;
  time: string;
  type: "info" | "success" | "warning" | "error" | "blocked";
  title: string;
  detail?: string;
};

type AutoApplyStatus = {
  running: boolean;
  nextRunAt: string | null;
  session: "morning" | "afternoon" | null;
  eligibleCount: number;
  queueStats?: {
    totalJobs: number;
    evaluatedJobs: number;
    unevaluatedJobs: number;
    eligibleJobs: number;
    minScore: number;
    blockedReasons: Record<string, number>;
  };
  today: { morning: number; afternoon: number };
  logs: AutoApplyLog[];
  config: {
    enabled: boolean;
    intervalMinutes: number;
    dailyMorningLimit: number;
    dailyAfternoonLimit: number;
    minScore: number;
    titleWhitelist: string[];
    cityWhitelist: string[];
    companyBlocklist: string[];
    onlineInterviewPreferred: boolean;
    dryRun: boolean;
  };
};

type TextConfigKey = "titleWhitelist" | "cityWhitelist" | "companyBlocklist";

const logColor: Record<AutoApplyLog["type"], string> = {
  info: "blue",
  success: "green",
  warning: "yellow",
  error: "red",
  blocked: "orange",
};

const loginPlatforms = [
  { label: "Boss 直聘", url: "https://www.zhipin.com" },
  { label: "猎聘", url: "https://www.liepin.com" },
  { label: "前程无忧", url: "https://www.51job.com" },
  { label: "拉勾", url: "https://www.lagou.com" },
  { label: "智联招聘", url: "https://www.zhaopin.com" },
  { label: "实习僧", url: "https://www.shixiseng.com" },
];

export default function AutoApplyPanel() {
  const [status, setStatus] = useState<AutoApplyStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [textDrafts, setTextDrafts] = useState<Record<TextConfigKey, string>>({
    titleWhitelist: "",
    cityWhitelist: "",
    companyBlocklist: "",
  });
  const [activeTextField, setActiveTextField] = useState<TextConfigKey | null>(
    null,
  );

  const load = async () => {
    setStatus(
      (await window.electronAPI.autoApplyGetStatus()) as AutoApplyStatus,
    );
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!status || activeTextField) return;
    setTextDrafts({
      titleWhitelist: status.config.titleWhitelist.join(","),
      cityWhitelist: status.config.cityWhitelist.join(","),
      companyBlocklist: status.config.companyBlocklist.join(","),
    });
  }, [status, activeTextField]);

  if (!status) return null;

  const saveConfig = async (updates: Partial<AutoApplyStatus["config"]>) => {
    setSaving(true);
    try {
      setStatus(
        (await window.electronAPI.autoApplyUpdateConfig(
          updates,
        )) as AutoApplyStatus,
      );
    } finally {
      setSaving(false);
    }
  };

  const saveTextConfig = async (key: TextConfigKey) => {
    const value = textDrafts[key];
    if (value !== status.config[key].join(",")) {
      await saveConfig({ [key]: splitWords(value) } as Partial<
        AutoApplyStatus["config"]
      >);
    }
    setActiveTextField((current) => (current === key ? null : current));
  };

  const setTextDraft = (key: TextConfigKey, value: string) => {
    setTextDrafts((current) => ({ ...current, [key]: value }));
  };

  const start = async () =>
    setStatus((await window.electronAPI.autoApplyStart()) as AutoApplyStatus);
  const stop = async () =>
    setStatus((await window.electronAPI.autoApplyStop()) as AutoApplyStatus);
  const refresh = async () => {
    const result = (await window.electronAPI.autoApplyRefreshQueue()) as {
      status: AutoApplyStatus;
    };
    setStatus(result.status);
  };
  const extractCurrentPage = async () => {
    setExtracting(true);
    try {
      const result = await window.electronAPI.extractJobsFromPage();
      const jobs = (result.jobs || []).map((job: any, index: number) => ({
        id: job.id || `page-${Date.now()}-${index}`,
        title: job.title || job.name || "未命名职位",
        company: job.company || job.company_name || "未知公司",
        location_city: job.location_city || job.location || "",
        salary: job.salary || "",
        description: job.description || job.snippet || "",
        requirements: job.requirements || "",
        source_url: job.url || result.source || "",
        source: "page_extract",
      }));
      if (jobs.length > 0) await window.electronAPI.saveJobs(jobs);
      await refresh();
    } finally {
      setExtracting(false);
    }
  };
  const openLogin = async (url: string) => {
    await window.electronAPI.openJobBrowser(url);
  };

  return (
    <Card withBorder shadow="sm" radius="md" padding="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <ThemeIcon size={44} radius="md" color="green" variant="light">
              <IconShieldCheck size={24} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="lg">
                安全自动投递
              </Text>
              <Text size="sm" c="dimmed">
                白名单、去重、失败保护、日志、上午/下午限额
              </Text>
            </div>
          </Group>
          <Group>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={refresh}
            >
              刷新队列
            </Button>
            <Button
              variant="light"
              leftSection={<IconExternalLink size={16} />}
              loading={extracting}
              onClick={extractCurrentPage}
            >
              抓取当前页岗位
            </Button>
            {status.running ? (
              <Button
                color="red"
                variant="light"
                leftSection={<IconPlayerStop size={16} />}
                onClick={stop}
              >
                停止
              </Button>
            ) : (
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={start}
              >
                启动
              </Button>
            )}
          </Group>
        </Group>

        <Alert color="orange" title="安全执行边界">
          支持 Boss
          直聘、猎聘、前程无忧、拉勾、智联招聘、实习僧。需要先在对应平台登录；遇到验证码、安全验证、未知按钮或未知平台会自动阻断。
        </Alert>

        <Card withBorder p="md">
          <Stack gap="sm">
            <Text fw={600}>平台登录</Text>
            <Text size="sm" c="dimmed">
              点击平台后会打开应用内浏览器，完成登录后关闭窗口即可。
            </Text>
            <Group gap="xs">
              {loginPlatforms.map((platform) => (
                <Button
                  key={platform.url}
                  size="xs"
                  variant="light"
                  leftSection={<IconExternalLink size={14} />}
                  onClick={() => openLogin(platform.url)}
                >
                  {platform.label}
                </Button>
              ))}
            </Group>
          </Stack>
        </Card>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <Card withBorder p="md">
            <Text size="xs" c="dimmed">
              当前状态
            </Text>
            <Badge color={status.running ? "green" : "gray"}>
              {status.running ? "运行中" : "已停止"}
            </Badge>
          </Card>
          <Card withBorder p="md">
            <Text size="xs" c="dimmed">
              候选岗位
            </Text>
            <Text fw={700}>{status.eligibleCount}</Text>
          </Card>
          <Card withBorder p="md">
            <Text size="xs" c="dimmed">
              上午投递
            </Text>
            <Text fw={700}>
              {status.today.morning}/{status.config.dailyMorningLimit}
            </Text>
          </Card>
          <Card withBorder p="md">
            <Text size="xs" c="dimmed">
              下午投递
            </Text>
            <Text fw={700}>
              {status.today.afternoon}/{status.config.dailyAfternoonLimit}
            </Text>
          </Card>
        </SimpleGrid>

        {status.eligibleCount === 0 && status.queueStats && (
          <Alert color="yellow" title="候选队列为空">
            <Text size="sm">
              本地岗位 {status.queueStats.totalJobs} 条，已评分{" "}
              {status.queueStats.evaluatedJobs} 条，未评分{" "}
              {status.queueStats.unevaluatedJobs} 条，最低匹配分{" "}
              {status.queueStats.minScore}。
              {status.queueStats.totalJobs === 0 &&
                " 登录只保存登录态，不会自动保存岗位；请在登录窗口进入职位列表页后点击“抓取当前页岗位”。"}
              {status.queueStats.totalJobs > 0 &&
                status.queueStats.evaluatedJobs === 0 &&
                " 已保存岗位还不能直接投递；请先运行 AI 全自动流程完成岗位匹配评分。"}
              {Object.keys(status.queueStats.blockedReasons).length > 0 &&
                ` 过滤原因：${Object.entries(status.queueStats.blockedReasons)
                  .map(([reason, count]) => `${reason} ${count}`)
                  .join("，")}`}
            </Text>
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <NumberInput
            label="间隔分钟"
            min={1}
            value={status.config.intervalMinutes}
            disabled={saving}
            onChange={(v) => saveConfig({ intervalMinutes: Number(v) || 2 })}
          />
          <NumberInput
            label="最低匹配分"
            min={0}
            max={100}
            step={1}
            value={status.config.minScore}
            disabled={saving}
            onChange={(v) =>
              saveConfig({ minScore: typeof v === "number" ? v : 70 })
            }
          />
          <NumberInput
            label="上午上限"
            min={0}
            value={status.config.dailyMorningLimit}
            disabled={saving}
            onChange={(v) => saveConfig({ dailyMorningLimit: Number(v) || 50 })}
          />
          <NumberInput
            label="下午上限"
            min={0}
            value={status.config.dailyAfternoonLimit}
            disabled={saving}
            onChange={(v) =>
              saveConfig({ dailyAfternoonLimit: Number(v) || 50 })
            }
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <TextInput
            label="岗位白名单"
            value={textDrafts.titleWhitelist}
            onFocus={() => setActiveTextField("titleWhitelist")}
            onChange={(e) =>
              setTextDraft("titleWhitelist", e.currentTarget.value)
            }
            onBlur={() => saveTextConfig("titleWhitelist")}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <TextInput
            label="城市白名单"
            placeholder="留空表示不限城市"
            value={textDrafts.cityWhitelist}
            onFocus={() => setActiveTextField("cityWhitelist")}
            onChange={(e) =>
              setTextDraft("cityWhitelist", e.currentTarget.value)
            }
            onBlur={() => saveTextConfig("cityWhitelist")}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <TextInput
            label="公司黑名单"
            placeholder="逗号分隔"
            value={textDrafts.companyBlocklist}
            onFocus={() => setActiveTextField("companyBlocklist")}
            onChange={(e) =>
              setTextDraft("companyBlocklist", e.currentTarget.value)
            }
            onBlur={() => saveTextConfig("companyBlocklist")}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </SimpleGrid>

        <Group justify="space-between">
          <Group>
            <Switch
              checked={status.config.dryRun}
              label="安全演练模式"
              onChange={(e) => saveConfig({ dryRun: e.currentTarget.checked })}
            />
            <Switch
              checked={status.config.onlineInterviewPreferred}
              label="面试优先选择线上面试"
              onChange={(e) =>
                saveConfig({
                  onlineInterviewPreferred: e.currentTarget.checked,
                })
              }
            />
          </Group>
          <Group gap="xs">
            <IconClock size={16} />
            <Text size="sm" c="dimmed">
              {status.nextRunAt
                ? `下次执行：${new Date(status.nextRunAt).toLocaleString()}`
                : "未安排执行"}
            </Text>
          </Group>
        </Group>

        <Stack gap="xs">
          <Text fw={600}>投递日志</Text>
          <ScrollArea h={220}>
            <Stack gap="xs">
              {status.logs.length === 0 && (
                <Text size="sm" c="dimmed">
                  暂无日志
                </Text>
              )}
              {status.logs.map((log) => (
                <Group key={log.id} gap="xs" wrap="nowrap">
                  <Badge size="xs" color={logColor[log.type]}>
                    {log.type}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {new Date(log.time).toLocaleTimeString()}
                  </Text>
                  <Text size="sm">{log.title}</Text>
                  {log.detail && (
                    <Text size="xs" c="dimmed">
                      {log.detail}
                    </Text>
                  )}
                </Group>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Stack>
    </Card>
  );
}

function splitWords(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
