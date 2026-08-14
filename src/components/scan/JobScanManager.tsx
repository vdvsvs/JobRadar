import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Group,
  TextInput,
  Select,
  Card,
  Badge,
  SimpleGrid,
  Pagination,
  Alert,
  Center,
  Divider,
  Modal,
  Switch,
  NumberInput,
  ActionIcon,
  Tooltip,
  Progress,
  Table,
  ScrollArea,
  Box,
  Anchor,
  Loader,
  MultiSelect,
  rem,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconSearch,
  IconFilter,
  IconRadar,
  IconPlayerPlay,
  IconPlayerStop,
  IconEdit,
  IconTrash,
  IconExternalLink,
  IconRefresh,
  IconRadar2,
  IconMapPin,
  IconBuilding,
  IconClock,
  IconTag,
  IconBriefcase,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import {
  useJobScanStore,
  ScanConfig,
  JobListing,
} from "../../stores/useJobScanStore";
import { RADAR_SOURCE_PRESETS } from "../../constants/radarSources";
import Loading from "../common/Loading";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const PORTAL_TYPE_OPTIONS = [
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "ashby", label: "Ashby" },
  { value: "wellfound", label: "Wellfound" },
  { value: "custom", label: "自定义" },
];

const PORTAL_TYPE_COLORS: Record<string, string> = {
  greenhouse: "teal",
  lever: "violet",
  ashby: "blue",
  wellfound: "orange",
  custom: "gray",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  discovered: { label: "已发现", color: "blue" },
  evaluated: { label: "已评估", color: "cyan" },
  applied: { label: "已投递", color: "orange" },
  phone_screen: { label: "电话面试", color: "grape" },
  technical_interview: { label: "技术面试", color: "indigo" },
  onsite: { label: "现场面试", color: "violet" },
  offer: { label: "收到Offer", color: "green" },
  accepted: { label: "已接受", color: "lime" },
  rejected: { label: "已拒绝", color: "red" },
  withdrawn: { label: "已撤回", color: "gray" },
};

/* ------------------------------------------------------------------ */
/*  ScanConfig Form Modal                                             */
/* ------------------------------------------------------------------ */

interface ScanConfigFormProps {
  opened: boolean;
  onClose: () => void;
  editingConfig: ScanConfig | null;
}

const ScanConfigForm: React.FC<ScanConfigFormProps> = ({
  opened,
  onClose,
  editingConfig,
}) => {
  const addScanConfig = useJobScanStore((s) => s.addScanConfig);
  const updateScanConfig = useJobScanStore((s) => s.updateScanConfig);

  const form = useForm({
    initialValues: {
      portal_name: "",
      portal_type: "custom" as ScanConfig["portal_type"],
      url_pattern: "",
      keywords: [] as string[],
      is_active: true,
      scan_interval_hours: 24,
    },
    validate: {
      portal_name: (v: string) =>
        v.trim().length === 0 ? "请输入配置名称" : null,
      url_pattern: (v: string) =>
        v.trim().length === 0 ? "请输入 URL 模式" : null,
      scan_interval_hours: (v: number | string) =>
        v === "" || Number(v) < 1 ? "扫描间隔至少 1 小时" : null,
    },
  });

  useEffect(() => {
    if (opened) {
      if (editingConfig) {
        form.setValues({
          portal_name: editingConfig.portal_name,
          portal_type: editingConfig.portal_type,
          url_pattern: editingConfig.url_pattern,
          keywords: editingConfig.keywords ?? [],
          is_active: editingConfig.is_active,
          scan_interval_hours: editingConfig.scan_interval_hours,
        });
      } else {
        form.reset();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editingConfig]);

  const handleSubmit = form.onSubmit((values) => {
    if (editingConfig) {
      updateScanConfig(editingConfig.id, values);
    } else {
      addScanConfig(values);
    }
    onClose();
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editingConfig ? "编辑扫描配置" : "新建扫描配置"}
      size="lg"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="配置名称"
            placeholder="例如：公司官网 Greenhouse"
            required
            {...form.getInputProps("portal_name")}
          />

          <Select
            label="平台类型"
            data={PORTAL_TYPE_OPTIONS}
            required
            {...form.getInputProps("portal_type")}
          />

          <TextInput
            label="URL 模式"
            placeholder="https://boards.greenhouse.io/example"
            required
            description="职位列表页面 URL，用于抓取职位信息"
            {...form.getInputProps("url_pattern")}
          />

          <MultiSelect
            label="关键词"
            placeholder="输入关键词后回车添加"
            data={form.values.keywords}
            searchable
            {...form.getInputProps("keywords")}
            description="添加后可用来过滤职位"
          />

          <NumberInput
            label="扫描间隔（小时）"
            min={1}
            max={168}
            required
            {...form.getInputProps("scan_interval_hours")}
          />

          <Switch
            label="启用此配置"
            checked={form.values.is_active}
            onChange={(e) =>
              form.setFieldValue("is_active", e.currentTarget.checked)
            }
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              {editingConfig ? "保存修改" : "创建配置"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/*  JobListing Detail Modal                                           */
/* ------------------------------------------------------------------ */

interface JobDetailProps {
  job: JobListing | null;
  opened: boolean;
  onClose: () => void;
}

const JobDetail: React.FC<JobDetailProps> = ({ job, opened, onClose }) => {
  if (!job) return null;

  const statusInfo = STATUS_MAP[job.status] ?? {
    label: job.status,
    color: "gray",
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="职位详情"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>{job.title}</Title>
          <Badge color={statusInfo.color} variant="light">
            {statusInfo.label}
          </Badge>
        </Group>

        <Group gap="xl">
          <Group gap="xs">
            <IconBuilding size={16} />
            <Text size="sm">{job.company}</Text>
          </Group>
          {job.location_city && (
            <Group gap="xs">
              <IconMapPin size={16} />
              <Text size="sm">
                {job.location_city}
                {job.location_district ? ` · ${job.location_district}` : ""}
              </Text>
            </Group>
          )}
          {job.salary && (
            <Group gap="xs">
              <IconBriefcase size={16} />
              <Text size="sm">{job.salary}</Text>
            </Group>
          )}
        </Group>

        {job.tags.length > 0 && (
          <Group gap="xs">
            <IconTag size={16} />
            {job.tags.map((tag) => (
              <Badge key={tag} variant="light" size="sm">
                {tag}
              </Badge>
            ))}
          </Group>
        )}

        <Divider />

        {job.description && (
          <Box>
            <Text fw={500} mb={4}>
              职位描述
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {job.description}
            </Text>
          </Box>
        )}

        {job.requirements && (
          <Box>
            <Text fw={500} mb={4}>
              岗位要求
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {job.requirements}
            </Text>
          </Box>
        )}

        {job.notes && (
          <Box>
            <Text fw={500} mb={4}>
              备注
            </Text>
            <Text size="sm">{job.notes}</Text>
          </Box>
        )}

        <Group justify="space-between">
          <Group gap="xs">
            <IconClock size={16} />
            <Text size="xs" c="dimmed">
              发现时间：{new Date(job.discovered_at).toLocaleString("zh-CN")}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            来源：{job.source}
          </Text>
        </Group>

        {job.source_url && (
          <Anchor href={job.source_url} target="_blank" size="sm">
            <Group gap={4}>
              <IconExternalLink size={14} />
              查看原始链接
            </Group>
          </Anchor>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            关闭
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

const JobScanManager: React.FC = () => {
  /* -------- Store -------- */
  const scanConfigs = useJobScanStore((s) => s.scanConfigs);
  const isScanning = useJobScanStore((s) => s.isScanning);
  const scanProgress = useJobScanStore((s) => s.scanProgress);
  const scanError = useJobScanStore((s) => s.scanError);
  const filters = useJobScanStore((s) => s.filters);
  const addScanConfig = useJobScanStore((s) => s.addScanConfig);
  const deleteScanConfig = useJobScanStore((s) => s.deleteScanConfig);
  const startScan = useJobScanStore((s) => s.startScan);
  const stopScan = useJobScanStore((s) => s.stopScan);
  const loadFromBackend = useJobScanStore((s) => s.loadFromBackend);
  const setFilters = useJobScanStore((s) => s.setFilters);
  const clearFilters = useJobScanStore((s) => s.clearFilters);
  const getFilteredJobs = useJobScanStore((s) => s.getFilteredJobs);

  /* -------- Local State -------- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [configFormOpened, { open: openConfigForm, close: closeConfigForm }] =
    useDisclosure(false);
  const [editingConfig, setEditingConfig] = useState<ScanConfig | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [jobDetailOpened, { open: openJobDetail, close: closeJobDetail }] =
    useDisclosure(false);
  const [filterCompany, setFilterCompany] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");

  const itemsPerPage = 10;

  /* -------- Effects -------- */
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        await loadFromBackend();
      } catch {
        if (mounted) setError("加载扫描数据失败");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [loadFromBackend]);

  /* -------- Computed -------- */
  const filteredJobs = useMemo(() => {
    let jobs = getFilteredJobs();

    if (filterCompany) {
      const q = filterCompany.toLowerCase();
      jobs = jobs.filter((j) => j.company.toLowerCase().includes(q));
    }
    if (filterLocation) {
      const q = filterLocation.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.location_city?.toLowerCase().includes(q) ||
          j.location_district?.toLowerCase().includes(q),
      );
    }
    if (filterKeyword) {
      const q = filterKeyword.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description?.toLowerCase().includes(q) ||
          j.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return jobs;
  }, [getFilteredJobs, filterCompany, filterLocation, filterKeyword]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredJobs.slice(start, start + itemsPerPage);
  }, [filteredJobs, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterCompany, filterLocation, filterKeyword]);

  /* -------- Handlers -------- */
  const handleAddConfig = useCallback(() => {
    setEditingConfig(null);
    openConfigForm();
  }, [openConfigForm]);

  const handleInstallRadarPresets = useCallback(async () => {
    const existing = new Set(scanConfigs.map((config) => config.portal_name));
    const missing = RADAR_SOURCE_PRESETS.filter(
      (preset) => !existing.has(preset.portal_name),
    );
    if (missing.length === 0) {
      setError("JobRadar 8 渠道预设已经全部存在");
      return;
    }
    setError(null);
    for (const preset of missing) {
      await addScanConfig(preset);
    }
    await loadFromBackend();
  }, [addScanConfig, loadFromBackend, scanConfigs]);

  const handleEditConfig = useCallback(
    (config: ScanConfig) => {
      setEditingConfig(config);
      openConfigForm();
    },
    [openConfigForm],
  );

  const handleDeleteConfig = useCallback(
    (id: string) => {
      if (window.confirm("确定要删除此扫描配置吗？")) {
        deleteScanConfig(id);
      }
    },
    [deleteScanConfig],
  );

  const handleTriggerScan = useCallback(
    async (configIds?: string[]) => {
      setError(null);
      try {
        await startScan(configIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : "扫描失败");
      }
    },
    [startScan],
  );

  const handleStopScan = useCallback(() => {
    stopScan();
  }, [stopScan]);

  const handleViewJob = useCallback(
    (job: JobListing) => {
      setSelectedJob(job);
      openJobDetail();
    },
    [openJobDetail],
  );

  const handleClearFilters = useCallback(() => {
    setFilterCompany("");
    setFilterLocation("");
    setFilterKeyword("");
    clearFilters();
  }, [clearFilters]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadFromBackend();
    } catch {
      setError("刷新数据失败");
    } finally {
      setLoading(false);
    }
  }, [loadFromBackend]);

  /* -------- Render Helpers -------- */
  const renderStatusBadge = (status: string) => {
    const info = STATUS_MAP[status] ?? { label: status, color: "gray" };
    return (
      <Badge color={info.color} variant="light" size="sm">
        {info.label}
      </Badge>
    );
  };

  if (loading) {
    return <Loading message="加载职位扫描数据..." />;
  }

  /* -------- Return -------- */
  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            岗位雷达
          </Title>
          <Text c="dimmed">统一监控招聘渠道，校验、去重并沉淀新的工作机会</Text>
        </div>
        <Group>
          <Tooltip label="刷新数据">
            <ActionIcon variant="light" size="lg" onClick={handleRefresh}>
              <IconRefresh size={20} />
            </ActionIcon>
          </Tooltip>
          <Button
            variant="light"
            leftSection={<IconRadar size={16} />}
            onClick={handleInstallRadarPresets}
          >
            载入 8 渠道预设
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleAddConfig}
          >
            新建配置
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert
          color="red"
          mb="lg"
          title="错误"
          icon={<IconAlertCircle size={16} />}
        >
          {error}
        </Alert>
      )}

      {scanError && (
        <Alert
          color="yellow"
          mb="lg"
          title="部分渠道扫描失败"
          icon={<IconAlertCircle size={16} />}
        >
          {scanError}
        </Alert>
      )}

      {/* ---- Scanning Progress ---- */}
      {isScanning && (
        <Card withBorder shadow="sm" radius="md" padding="lg" mb="lg">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Loader size="sm" />
              <Text fw={500}>正在扫描中...</Text>
            </Group>
            <Button
              variant="light"
              color="red"
              size="xs"
              leftSection={<IconPlayerStop size={14} />}
              onClick={handleStopScan}
            >
              停止
            </Button>
          </Group>
          <Progress value={scanProgress} striped animated radius="xl" />
          <Text size="xs" c="dimmed" mt={4}>
            {Math.round(scanProgress)}% 完成
          </Text>
        </Card>
      )}

      {/* ---- Scan Config Cards ---- */}
      <Title order={4} mb="md">
        扫描配置
      </Title>

      {scanConfigs.length === 0 ? (
        <Card withBorder shadow="sm" radius="md" padding="xl" mb="xl">
          <Center>
            <Stack align="center" gap="md">
              <IconRadar2 size={48} color="gray" />
              <Text c="dimmed">暂无扫描配置</Text>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleAddConfig}
              >
                创建第一个配置
              </Button>
            </Stack>
          </Center>
        </Card>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg" mb="xl">
            {scanConfigs.map((config) => (
              <Card
                key={config.id}
                withBorder
                shadow="sm"
                padding="lg"
                radius="md"
                style={{
                  opacity: config.is_active ? 1 : 0.6,
                  borderColor: config.is_active
                    ? undefined
                    : "var(--mantine-color-gray-4)",
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={500} size="lg" lineClamp={1}>
                      {config.portal_name}
                    </Text>
                    <Badge
                      color={PORTAL_TYPE_COLORS[config.portal_type] ?? "gray"}
                      variant="light"
                    >
                      {config.portal_type.toUpperCase()}
                    </Badge>
                  </Group>

                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {config.url_pattern}
                  </Text>

                  {config.keywords.length > 0 && (
                    <Group gap={4}>
                      {config.keywords.slice(0, 4).map((kw) => (
                        <Badge key={kw} variant="outline" size="xs">
                          {kw}
                        </Badge>
                      ))}
                      {config.keywords.length > 4 && (
                        <Text size="xs" c="dimmed">
                          +{config.keywords.length - 4}
                        </Text>
                      )}
                    </Group>
                  )}

                  <Divider />

                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconClock size={14} />
                      <Text size="xs" c="dimmed">
                        每 {config.scan_interval_hours}h
                      </Text>
                    </Group>
                    <Group gap="xs">
                      {config.is_active ? (
                        <Badge color="green" variant="dot" size="sm">
                          已启用
                        </Badge>
                      ) : (
                        <Badge color="gray" variant="dot" size="sm">
                          已禁用
                        </Badge>
                      )}
                    </Group>
                  </Group>

                  {config.last_scanned_at && (
                    <Text size="xs" c="dimmed">
                      上次扫描：
                      {new Date(config.last_scanned_at).toLocaleString("zh-CN")}
                    </Text>
                  )}

                  <Group justify="flex-end" gap="xs">
                    <Tooltip label="立即扫描">
                      <ActionIcon
                        variant="light"
                        color="green"
                        onClick={() => handleTriggerScan([config.id])}
                        disabled={isScanning}
                      >
                        <IconPlayerPlay size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="编辑">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleEditConfig(config)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="删除">
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteConfig(config.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>

          {/* Scan all active button */}
          <Group justify="center" mb="xl">
            <Button
              size="md"
              leftSection={<IconRadar size={20} />}
              onClick={() => handleTriggerScan()}
              disabled={
                isScanning ||
                scanConfigs.filter((c) => c.is_active).length === 0
              }
              loading={isScanning}
            >
              扫描所有已启用配置
            </Button>
          </Group>
        </>
      )}

      <Divider mb="xl" />

      {/* ---- Job Listings ---- */}
      <Title order={4} mb="md">
        扫描结果
        {filteredJobs.length > 0 && (
          <Text span size="sm" c="dimmed" fw={400} ml="xs">
            （共 {filteredJobs.length} 条）
          </Text>
        )}
      </Title>

      {/* Filters */}
      <Card withBorder shadow="sm" radius="md" padding="lg" mb="lg">
        <Group gap="md" wrap="wrap">
          <TextInput
            placeholder="筛选公司"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.currentTarget.value)}
            leftSection={<IconBuilding size={16} />}
            style={{ minWidth: 180 }}
          />
          <TextInput
            placeholder="筛选地点"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.currentTarget.value)}
            leftSection={<IconMapPin size={16} />}
            style={{ minWidth: 180 }}
          />
          <TextInput
            placeholder="关键词"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ minWidth: 180 }}
          />
          <Button
            variant="subtle"
            leftSection={<IconFilter size={16} />}
            onClick={handleClearFilters}
          >
            清除筛选
          </Button>
        </Group>
      </Card>

      {/* Jobs Table */}
      {filteredJobs.length === 0 ? (
        <Card withBorder shadow="sm" radius="md" padding="xl">
          <Center>
            <Stack align="center" gap="md">
              <IconBriefcase size={48} color="gray" />
              <Text c="dimmed">暂无扫描到的职位</Text>
              <Text size="sm" c="dimmed">
                创建扫描配置并执行扫描以发现职位
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <>
          <ScrollArea>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: 200 }}>职位</Table.Th>
                  <Table.Th style={{ minWidth: 120 }}>公司</Table.Th>
                  <Table.Th style={{ minWidth: 100 }}>地点</Table.Th>
                  <Table.Th style={{ minWidth: 100 }}>薪资</Table.Th>
                  <Table.Th style={{ minWidth: 80 }}>状态</Table.Th>
                  <Table.Th style={{ minWidth: 100 }}>标签</Table.Th>
                  <Table.Th style={{ minWidth: 120 }}>发现时间</Table.Th>
                  <Table.Th style={{ minWidth: 80 }}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedJobs.map((job) => (
                  <Table.Tr key={job.id}>
                    <Table.Td>
                      <Anchor
                        component="button"
                        type="button"
                        onClick={() => handleViewJob(job)}
                        fw={500}
                        size="sm"
                      >
                        {job.title}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{job.company}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {job.location_city ?? "-"}
                        {job.location_district
                          ? ` · ${job.location_district}`
                          : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{job.salary ?? "-"}</Text>
                    </Table.Td>
                    <Table.Td>{renderStatusBadge(job.status)}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {job.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="light" size="xs">
                            {tag}
                          </Badge>
                        ))}
                        {job.tags.length > 2 && (
                          <Text size="xs" c="dimmed">
                            +{job.tags.length - 2}
                          </Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {new Date(job.discovered_at).toLocaleString("zh-CN")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label="查看详情">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => handleViewJob(job)}
                          >
                            <IconSearch size={16} />
                          </ActionIcon>
                        </Tooltip>
                        {job.source_url && (
                          <Tooltip label="原始链接">
                            <ActionIcon
                              variant="subtle"
                              component="a"
                              href={job.source_url}
                              target="_blank"
                            >
                              <IconExternalLink size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {totalPages > 1 && (
            <Group justify="center" mt="xl">
              <Pagination
                value={page}
                onChange={setPage}
                total={totalPages}
                siblings={1}
                boundaries={1}
              />
            </Group>
          )}
        </>
      )}

      {/* ---- Modals ---- */}
      <ScanConfigForm
        opened={configFormOpened}
        onClose={closeConfigForm}
        editingConfig={editingConfig}
      />

      <JobDetail
        job={selectedJob}
        opened={jobDetailOpened}
        onClose={closeJobDetail}
      />
    </Container>
  );
};

export default JobScanManager;
