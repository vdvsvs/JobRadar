import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Title,
  Text,
  Textarea,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Paper,
  Select,
  Card,
  Badge,
  ActionIcon,
  Divider,
  Progress,
  Alert,
  Modal,
  ScrollArea,
  Tooltip,
  Tabs,
  FileInput,
  Loader,
  ThemeIcon,
  Collapse,
  Code,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconTemplate,
  IconFileText,
  IconSparkles,
  IconEye,
  IconTrash,
  IconDownload,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconTags,
  IconPencil,
  IconList,
  IconPlus,
  IconCopy,
  IconUpload,
  IconRobot,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useResumeStore } from "../../stores/useResumeStore";
import { useUserStore } from "../../stores/useUserStore";
import type {
  ResumeTemplate,
  GeneratedResume,
} from "../../services/ai/AIServiceAdapter";
import AIActivityLog from "../common/AIActivityLog";
import type { AILogEntry } from "../common/AIActivityLog";
import { createLogEntry } from "../common/AIActivityLog";

export default function ResumeGenerator() {
  const {
    templates,
    generatedResumes,
    baseResume,
    isGenerating,
    generationProgress,
    generationError,
    currentTemplate,
    currentResume,
    setBaseResume,
    generateResume,
    previewResume,
    loadFromBackend,
    setCurrentTemplate,
    deleteGeneratedResume,
    exportResume,
    getTemplateList,
    getDefaultTemplate,
  } = useResumeStore();

  const profile = useUserStore((s) => s.profile);

  const [jobDescription, setJobDescription] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpened, { open: openPreview, close: closePreview }] =
    useDisclosure(false);
  const [activeTab, setActiveTab] = useState<string | null>("generate");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  // PDF 模板上传
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateText, setTemplateText] = useState("");
  const [imitating, setImitating] = useState(false);
  const [imitateResult, setImitateResult] = useState("");
  const [logs, setLogs] = useState<AILogEntry[]>([]);

  const addLog = (entry: AILogEntry) => setLogs((prev) => [...prev, entry]);

  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  useEffect(() => {
    if (templates.length > 0 && !currentTemplate) {
      const def = getDefaultTemplate();
      if (def) setCurrentTemplate(def);
    }
  }, [templates, currentTemplate, getDefaultTemplate, setCurrentTemplate]);

  // 上传PDF模板并提取文本
  const handleTemplateUpload = async (f: File | null) => {
    setTemplateFile(f);
    setTemplateText("");
    setImitateResult("");
    if (!f) return;

    if (f.name.toLowerCase().endsWith(".pdf")) {
      const filePath = (f as any).path;
      try {
        let result: any;
        if (filePath && window.electronAPI?.extractPdfText) {
          result = await window.electronAPI.extractPdfText(filePath);
        } else if (window.electronAPI?.extractPdfFromBuffer) {
          const buf = await f.arrayBuffer();
          result = await window.electronAPI.extractPdfFromBuffer(buf);
        } else {
          addLog(createLogEntry("error", "PDF解析功能不可用"));
          return;
        }
        if (result.success) {
          setTemplateText(result.text);
          addLog(
            createLogEntry(
              "success",
              `模板PDF已解析：${result.text.length} 字符`,
            ),
          );
        } else {
          addLog(createLogEntry("error", result.text));
        }
      } catch (err: any) {
        addLog(createLogEntry("error", `PDF解析失败：${err.message}`));
      }
    } else {
      const text = await f.text();
      setTemplateText(text);
      addLog(createLogEntry("success", `模板文件已读取：${text.length} 字符`));
    }
  };

  // AI模仿模板生成简历
  const handleImitateResume = async () => {
    if (!templateText.trim()) {
      addLog(createLogEntry("error", "请先上传模板简历"));
      return;
    }
    if (!profile) {
      addLog(createLogEntry("error", "请先完善个人资料"));
      return;
    }

    setImitating(true);
    setImitateResult("");
    setLogs([]);

    const name = profile.name || "用户";
    const major = profile.major || "";
    const education = profile.education || "";
    const selfIntro = (profile as any).selfIntro || "";
    const resumeText = (profile as any).resumeText || "";
    const interests = Array.isArray(profile.interests)
      ? profile.interests.join("、")
      : "";

    const userInfo = [
      `姓名：${name}`,
      `专业：${major}`,
      `学历：${education}`,
      `兴趣方向：${interests}`,
      selfIntro ? `自我介绍：${selfIntro}` : "",
      resumeText ? `简历内容：\n${resumeText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `你是一位资深简历撰写专家。请模仿以下模板简历的**格式、风格、语气和排版结构**，为用户生成一份新的简历。

=== 模板简历（参考风格）===
${templateText}

=== 用户个人信息 ===
${userInfo}

${jobDescription ? `=== 目标职位描述 ===\n${jobDescription}\n` : ""}
要求：
1. 严格模仿模板简历的格式结构（如用同样的标题层级、段落风格、技能呈现方式）
2. 用用户的实际信息替换模板中的内容
3. 如果模板中有用户没有的经历，合理补充或调整
4. 保持专业性，语言精炼
5. 如果有目标职位JD，要针对性地突出相关技能和经历
6. 直接返回简历内容，不要额外解释`;

    addLog(
      createLogEntry("ai_call", "调用 AI 模仿模板生成简历", {
        toolName: "chatWithAI",
        prompt: prompt.slice(0, 500) + "...",
      }),
    );

    try {
      const response = await window.electronAPI.chatWithAI([
        {
          role: "system",
          content:
            "你是简历撰写专家，擅长模仿各种简历风格。直接输出简历内容，不要加任何解释。",
        },
        { role: "user", content: prompt },
      ]);

      const result = response as string;
      setImitateResult(result);
      setBaseResume(result);
      addLog(
        createLogEntry("success", `AI 模仿简历已生成：${result.length} 字符`, {
          response: result.slice(0, 500) + "...",
        }),
      );
    } catch (err: any) {
      addLog(createLogEntry("error", `生成失败：${err.message}`));
    } finally {
      setImitating(false);
    }
  };

  // 生成简历
  const handleGenerate = useCallback(async () => {
    if (!baseResume.trim()) return;
    try {
      const keywords = jobDescription
        ? jobDescription.split(/[,，、;\s]+/).filter(Boolean)
        : [];
      await generateResume("", jobDescription, keywords, currentTemplate?.id);
    } catch {
      /* store handles error */
    }
  }, [baseResume, jobDescription, currentTemplate, generateResume]);

  // 预览
  const handlePreview = useCallback(
    async (resumeId: string) => {
      try {
        const html = await previewResume(resumeId);
        setPreviewHtml(html);
        openPreview();
      } catch {
        /* ignore */
      }
    },
    [previewResume, openPreview],
  );

  // 删除确认
  const confirmDelete = useCallback(
    (id: string) => {
      setDeleteConfirmId(id);
      openDeleteModal();
    },
    [openDeleteModal],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteGeneratedResume(deleteConfirmId);
      setDeleteConfirmId(null);
      closeDeleteModal();
    }
  }, [deleteConfirmId, deleteGeneratedResume, closeDeleteModal]);

  const templateList = getTemplateList();

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <div>
          <Group gap="sm" mb={4}>
            <IconFileText size={28} />
            <Title order={2}>AI 简历生成器</Title>
          </Group>
          <Text c="dimmed" size="sm">
            上传模板简历让 AI
            模仿风格，或手动编辑简历内容，针对目标职位生成专业简历
          </Text>
        </div>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="generate" leftSection={<IconSparkles size={16} />}>
              AI 生成
            </Tabs.Tab>
            <Tabs.Tab value="imitate" leftSection={<IconUpload size={16} />}>
              模仿模板
            </Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<IconList size={16} />}>
              历史记录
              {generatedResumes.length > 0 && (
                <Badge size="xs" ml={4} variant="light" color="blue">
                  {generatedResumes.length}
                </Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>

          {/* Tab: AI 生成 */}
          <Tabs.Panel value="generate" pt="lg">
            <Stack gap="lg">
              {/* 模板选择 */}
              <Card withBorder shadow="xs" radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconTemplate size={20} />
                      <Text fw={600}>选择简历模板</Text>
                    </Group>
                    <Badge variant="light" color="blue">
                      {templateList.length} 个模板
                    </Badge>
                  </Group>
                  {templateList.length === 0 ? (
                    <Text c="dimmed" size="sm" ta="center" py="md">
                      暂无模板，将使用默认格式生成
                    </Text>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                      {templates.map((tpl) => (
                        <Paper
                          key={tpl.id}
                          shadow={currentTemplate?.id === tpl.id ? "md" : "xs"}
                          p="md"
                          radius="md"
                          withBorder
                          onClick={() => setCurrentTemplate(tpl)}
                          style={{
                            cursor: "pointer",
                            borderColor:
                              currentTemplate?.id === tpl.id
                                ? "var(--mantine-color-blue-6)"
                                : undefined,
                            borderWidth: currentTemplate?.id === tpl.id ? 2 : 1,
                          }}
                        >
                          <Group gap="xs">
                            <IconTemplate size={16} />
                            <Text fw={500} size="sm">
                              {tpl.name}
                            </Text>
                            {currentTemplate?.id === tpl.id && (
                              <Badge size="xs" color="blue">
                                已选
                              </Badge>
                            )}
                          </Group>
                          {tpl.description && (
                            <Text size="xs" c="dimmed" lineClamp={2}>
                              {tpl.description}
                            </Text>
                          )}
                        </Paper>
                      ))}
                    </SimpleGrid>
                  )}
                </Stack>
              </Card>

              {/* 基础简历 */}
              <Card withBorder shadow="xs" radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconPencil size={20} />
                      <Text fw={600}>基础简历内容</Text>
                    </Group>
                    {profile?.resumeText && !baseResume && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => setBaseResume(profile.resumeText!)}
                      >
                        导入已上传的简历
                      </Button>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    在此输入或粘贴简历内容。如果没有内容，可以去"简历上传"页面上传。
                  </Text>
                  <Textarea
                    placeholder="例如：&#10;姓名：张三&#10;专业：计算机科学与技术&#10;教育背景：...&#10;实习经历：...&#10;技能：..."
                    minRows={10}
                    maxRows={20}
                    autosize
                    value={baseResume}
                    onChange={(e) => setBaseResume(e.currentTarget.value)}
                    styles={{
                      input: {
                        fontFamily: "monospace",
                        fontSize: 13,
                        lineHeight: 1.6,
                      },
                    }}
                  />
                  {baseResume.trim() && (
                    <Group gap="xs">
                      <IconCheck size={14} color="green" />
                      <Text size="xs" c="green">
                        已输入 {baseResume.length} 字符
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Card>

              {/* JD 关键词 */}
              <Card withBorder shadow="xs" radius="md" padding="lg">
                <Stack gap="md">
                  <Group gap="xs">
                    <IconSparkles size={20} />
                    <Text fw={600}>目标职位 JD（可选）</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    粘贴目标职位描述，AI 将提取关键词注入简历提高匹配度。
                  </Text>
                  <Textarea
                    placeholder="粘贴目标职位的 JD..."
                    minRows={4}
                    maxRows={8}
                    autosize
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.currentTarget.value)}
                  />
                </Stack>
              </Card>

              {/* 生成按钮 */}
              <Group justify="flex-end">
                <Button
                  leftSection={<IconSparkles size={16} />}
                  loading={isGenerating}
                  disabled={!baseResume.trim()}
                  onClick={handleGenerate}
                  gradient={{ from: "blue", to: "cyan" }}
                  variant="gradient"
                  size="lg"
                >
                  AI 生成简历
                </Button>
              </Group>

              {isGenerating && (
                <Stack gap="xs">
                  <Group gap="xs">
                    <Loader size="sm" />
                    <Text size="sm" fw={500}>
                      正在生成简历...
                    </Text>
                    <Badge variant="light" color="blue">
                      {generationProgress}%
                    </Badge>
                  </Group>
                  <Progress value={generationProgress} animated radius="xl" />
                </Stack>
              )}

              {generationError && (
                <Alert color="red" icon={<IconAlertCircle size={16} />}>
                  {generationError}
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Tab: 模仿模板 */}
          <Tabs.Panel value="imitate" pt="lg">
            <Stack gap="lg">
              <Card withBorder shadow="xs" radius="md" padding="lg">
                <Stack gap="md">
                  <Group gap="sm">
                    <ThemeIcon
                      size={36}
                      radius="md"
                      color="violet"
                      variant="light"
                    >
                      <IconUpload size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600}>上传模板简历</Text>
                      <Text size="xs" c="dimmed">
                        上传一份你喜欢的简历模板（PDF/txt），AI
                        会模仿它的风格，用你的信息生成新简历
                      </Text>
                    </div>
                  </Group>
                  <FileInput
                    placeholder="选择模板简历文件"
                    leftSection={<IconUpload size={16} />}
                    accept=".txt,.md,.pdf"
                    value={templateFile}
                    onChange={handleTemplateUpload}
                    clearable
                  />
                  {templateFile && (
                    <Alert
                      color="blue"
                      variant="light"
                      icon={<IconFileText size={16} />}
                    >
                      已选择：{templateFile.name}（{templateText.length} 字符）
                    </Alert>
                  )}
                </Stack>
              </Card>

              {templateText && (
                <Card withBorder shadow="xs" radius="md" padding="lg">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={600}>模板内容预览</Text>
                      <Badge size="sm" variant="light">
                        {templateText.length} 字符
                      </Badge>
                    </Group>
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: "var(--mantine-color-gray-0)",
                        maxHeight: 300,
                        overflow: "auto",
                      }}
                    >
                      <Text
                        size="xs"
                        style={{
                          fontFamily: "monospace",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {templateText.slice(0, 1500)}
                        {templateText.length > 1500 ? "..." : ""}
                      </Text>
                    </Paper>
                  </Stack>
                </Card>
              )}

              {templateText && (
                <Card withBorder shadow="xs" radius="md" padding="lg">
                  <Stack gap="md">
                    <Group gap="xs">
                      <IconSparkles size={20} />
                      <Text fw={600}>目标职位 JD（可选）</Text>
                    </Group>
                    <Textarea
                      placeholder="粘贴目标职位描述，让 AI 针对性调整简历..."
                      minRows={3}
                      maxRows={6}
                      autosize
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.currentTarget.value)}
                    />
                  </Stack>
                </Card>
              )}

              <Group justify="flex-end">
                <Button
                  size="lg"
                  leftSection={<IconSparkles size={16} />}
                  loading={imitating}
                  disabled={!templateText.trim() || !profile}
                  onClick={handleImitateResume}
                  gradient={{ from: "violet", to: "blue" }}
                  variant="gradient"
                >
                  AI 模仿生成简历
                </Button>
              </Group>

              {imitating && (
                <Card withBorder shadow="sm" radius="md" padding="lg">
                  <Group gap="sm">
                    <Loader size="sm" />
                    <Text fw={500}>AI 正在分析模板风格并生成简历...</Text>
                  </Group>
                </Card>
              )}

              {imitateResult && (
                <Card withBorder shadow="sm" radius="md" padding="lg">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <ThemeIcon
                          size={32}
                          radius="md"
                          color="green"
                          variant="light"
                        >
                          <IconCheck size={16} />
                        </ThemeIcon>
                        <Text fw={600}>
                          AI 生成的简历（已自动填入基础简历）
                        </Text>
                      </Group>
                      <Badge color="green" variant="light">
                        {imitateResult.length} 字符
                      </Badge>
                    </Group>
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: "var(--mantine-color-gray-0)",
                        maxHeight: 400,
                        overflow: "auto",
                      }}
                    >
                      <Text
                        size="sm"
                        style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
                      >
                        {imitateResult}
                      </Text>
                    </Paper>
                    <Group justify="flex-end">
                      <Button
                        variant="light"
                        onClick={() => setActiveTab("generate")}
                      >
                        去"AI 生成"页进一步优化
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              )}

              <AIActivityLog logs={logs} maxHeight={300} />
            </Stack>
          </Tabs.Panel>

          {/* Tab: 历史记录 */}
          <Tabs.Panel value="history" pt="lg">
            <Stack gap="md">
              {generatedResumes.length === 0 ? (
                <Paper
                  p="xl"
                  withBorder
                  radius="md"
                  bg="var(--mantine-color-gray-0)"
                >
                  <Stack align="center" gap="xs">
                    <IconFileText
                      size={32}
                      color="var(--mantine-color-dimmed)"
                    />
                    <Text c="dimmed" size="sm">
                      暂无生成记录
                    </Text>
                  </Stack>
                </Paper>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {generatedResumes.map((resume) => (
                    <Paper
                      key={resume.id}
                      shadow="xs"
                      p="md"
                      radius="md"
                      withBorder
                    >
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Group gap="xs">
                            <IconFileText size={18} />
                            <Text fw={500} size="sm" lineClamp={1}>
                              {resume.job_listing_id
                                ? `针对职位 (${resume.job_listing_id.slice(0, 8)}...)`
                                : "通用简历"}
                            </Text>
                          </Group>
                          <Group gap={4}>
                            <Tooltip label="预览">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                size="sm"
                                onClick={() => handlePreview(resume.id)}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="删除">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => confirmDelete(resume.id)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Group>
                        {resume.keywords_injected &&
                          resume.keywords_injected.length > 0 && (
                            <Group gap={4} wrap="wrap">
                              <IconTags size={14} color="gray" />
                              {resume.keywords_injected
                                .slice(0, 5)
                                .map((kw, i) => (
                                  <Badge
                                    key={i}
                                    size="xs"
                                    variant="outline"
                                    color="gray"
                                  >
                                    {kw}
                                  </Badge>
                                ))}
                            </Group>
                          )}
                        <Group gap="xs">
                          <IconClock size={12} color="gray" />
                          <Text size="xs" c="dimmed">
                            {new Date(resume.created_at).toLocaleString(
                              "zh-CN",
                            )}
                          </Text>
                        </Group>
                      </Stack>
                    </Paper>
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* 预览 Modal */}
        <Modal
          opened={previewOpened}
          onClose={closePreview}
          title="简历预览"
          size="lg"
          scrollAreaComponent={ScrollArea.Autosize}
        >
          <Paper withBorder p="md" radius="md" style={{ minHeight: 400 }}>
            {previewHtml ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                暂无预览内容
              </Text>
            )}
          </Paper>
        </Modal>

        {/* 删除确认 Modal */}
        <Modal
          opened={deleteModalOpened}
          onClose={closeDeleteModal}
          title="确认删除"
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm">确定要删除这份简历吗？此操作不可撤销。</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDeleteModal}>
                取消
              </Button>
              <Button color="red" onClick={handleConfirmDelete}>
                确认删除
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
