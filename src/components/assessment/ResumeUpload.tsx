import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Alert,
  FileInput,
  Textarea,
  Badge,
  SimpleGrid,
  Loader,
  ThemeIcon,
  Divider,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconArrowRight,
  IconUpload,
  IconFileText,
  IconCheck,
  IconSparkles,
  IconTrash,
  IconRefresh,
} from "@tabler/icons-react";
import { useUserStore } from "../../stores/useUserStore";

export default function ResumeUpload() {
  const navigate = useNavigate();
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);

  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [autoSavedText, setAutoSavedText] = useState("");

  // AI 解析状态
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // 已保存的简历列表
  const [savedResumes, setSavedResumes] = useState<any[]>([]);

  // 初始化：加载已有简历
  useEffect(() => {
    loadExistingResume();
  }, []);

  const loadExistingResume = async () => {
    try {
      await useUserStore.getState().loadFromBackend();
      const currentProfile = useUserStore.getState().profile;
      // 加载用户资料中的简历文本
      if (currentProfile?.resumeText) {
        setResumeText(currentProfile.resumeText);
      }
      // 加载已保存的简历文件列表
      if (window.electronAPI?.getAllResumes) {
        const resumes = await window.electronAPI.getAllResumes();
        setSavedResumes(Array.isArray(resumes) ? resumes : []);
        if (
          !currentProfile?.resumeText &&
          Array.isArray(resumes) &&
          resumes[0]?.parsedText
        ) {
          setResumeText(String(resumes[0].parsedText));
        }
      }
    } catch (err) {
      console.error("加载简历失败:", err);
    }
  };

  const saveResumeText = async (text: string, fileName: string) => {
    if (!text.trim()) return;
    if (window.electronAPI?.saveResume) {
      await window.electronAPI.saveResume({
        fileName,
        extractedText: text,
      });
    }
    await updateProfile({ resumeText: text } as any);
    setAutoSavedText(text);
    setSaved(true);
    await loadExistingResume();
  };

  // 处理文件上传
  const handleFileChange = async (f: File | null) => {
    setFile(f);
    setExtractError(null);
    setParseError(null);
    setParsed(null);
    if (!f) return;

    let text = "";

    if (f.name.toLowerCase().endsWith(".pdf")) {
      // PDF：先尝试 file.path，sandbox 模式下为空则用 arrayBuffer 发送到主进程
      const filePath = (f as any).path;
      try {
        let result: any;
        if (filePath && window.electronAPI?.extractPdfText) {
          result = await window.electronAPI.extractPdfText(filePath);
        } else if (window.electronAPI?.extractPdfFromBuffer) {
          const buf = await f.arrayBuffer();
          result = await window.electronAPI.extractPdfFromBuffer(buf);
        } else {
          setExtractError("PDF 解析功能不可用，请手动粘贴");
          return;
        }
        if (result.success) {
          text = result.text;
          setResumeText(text);
        } else {
          setExtractError(result.text || "PDF 提取失败，请手动粘贴");
          return;
        }
      } catch (err: any) {
        setExtractError(`PDF 解析出错：${err.message || err}，请手动粘贴`);
        return;
      }
    } else {
      // txt/md：直接读取
      text = await f.text();
      setResumeText(text);
    }

    // 有内容就自动调用 AI 解析
    if (text.trim()) {
      await saveResumeText(text, f.name);
      await doAIParse(text);
    }
  };

  // AI 解析简历
  const doAIParse = async (text: string) => {
    if (!window.electronAPI?.parseResume) {
      setParseError("AI 解析功能不可用，请检查 AI 配置");
      return;
    }
    setParsing(true);
    setParseError(null);
    setParsed(null);
    try {
      const result = await window.electronAPI.parseResume(text);
      setParsed(result);
      // 自动填充用户资料
      const data = result as any;
      await updateProfile({
        name: data.name || profile?.name,
        major: data.major || profile?.major,
        age: data.age || profile?.age,
        education: data.education || profile?.education,
        graduationYear: data.graduationYear || profile?.graduationYear,
        careerGoals: data.careerGoals || profile?.careerGoals,
        selfIntro: data.selfIntro || profile?.selfIntro,
        interests: data.interests || profile?.interests,
        identity: data.identity || profile?.identity || null,
        skills: Array.isArray(data.skills)
          ? data.skills
          : profile?.skills || [],
        resumeText: text,
        resume: {
          fileName: file?.name || "手动输入",
          extractedText: text,
        },
        assessmentUnlocked: true,
      } as any);
    } catch (err: any) {
      setParseError(`AI 解析失败：${err.message || err}`);
    } finally {
      setParsing(false);
    }
  };

  // 保存简历
  const handleSave = async () => {
    if (!resumeText.trim()) return;
    setSaving(true);
    try {
      if (resumeText !== autoSavedText) {
        await saveResumeText(resumeText, file?.name || "手动输入");
      } else {
        await updateProfile({ resumeText } as any);
        setSaved(true);
      }
    } catch (err: any) {
      setExtractError(`保存失败：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 删除简历
  const handleDeleteResume = async (id: string) => {
    try {
      if (window.electronAPI?.deleteResume) {
        await window.electronAPI.deleteResume(id);
      }
      setSavedResumes((prev) => prev.filter((r: any) => r.id !== id));
      // 如果删的是当前显示的，清空
      setResumeText("");
      setParsed(null);
      await updateProfile({ resumeText: "" } as any);
    } catch (err) {
      console.error("删除简历失败:", err);
    }
  };

  // 清空当前简历
  const handleClear = () => {
    setFile(null);
    setResumeText("");
    setParsed(null);
    setParseError(null);
    setExtractError(null);
    setSaved(false);
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>📄 简历上传</Title>
            <Text c="dimmed" size="sm">
              上传简历后 AI 自动解析并填充个人信息，无需手动填写。
            </Text>
          </div>
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            返回
          </Button>
        </Group>

        {/* 已保存的简历 */}
        {savedResumes.length > 0 && (
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Stack gap="sm">
              <Text fw={600}>已保存的简历</Text>
              {savedResumes.map((r: any) => (
                <Group
                  key={r.id}
                  justify="space-between"
                  p="xs"
                  style={{
                    border: "1px solid var(--mantine-color-gray-3)",
                    borderRadius: 8,
                  }}
                >
                  <Group gap="sm">
                    <IconFileText size={20} />
                    <div>
                      <Text size="sm" fw={500}>
                        {r.filename || "未命名简历"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString("zh-CN")
                          : ""}
                      </Text>
                    </div>
                  </Group>
                  <Tooltip label="删除此简历">
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => handleDeleteResume(r.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ))}
            </Stack>
          </Card>
        )}

        {/* 上传区域 */}
        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Stack gap="sm">
            <Group gap="sm">
              <Text fw={600}>上传简历文件</Text>
              <Badge color="blue" variant="light">
                AI 自动解析
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              支持 PDF / txt / markdown。上传后 AI
              自动提取姓名、专业、技能、经历等并填充到个人资料。
            </Text>
            <FileInput
              placeholder="点击选择简历文件"
              leftSection={<IconUpload size={16} />}
              accept=".txt,.md,.pdf"
              value={file}
              onChange={handleFileChange}
              clearable
            />
            {file && (
              <Alert
                icon={<IconFileText size={16} />}
                color="blue"
                variant="light"
              >
                已选择：{file.name}
              </Alert>
            )}
            {extractError && (
              <Alert color="red" variant="light" title="提示">
                {extractError}
              </Alert>
            )}
          </Stack>
        </Card>

        {/* AI 解析中 */}
        {parsing && (
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Group gap="sm">
              <Loader size="sm" />
              <Text fw={500}>AI 正在分析简历...</Text>
            </Group>
            <Text size="sm" c="dimmed" mt="xs">
              正在提取姓名、专业、技能、经历、兴趣等信息
            </Text>
          </Card>
        )}

        {/* AI 解析结果 */}
        {parsed && !parsing && (
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Stack gap="sm">
              <Group gap="sm">
                <ThemeIcon size={32} radius="md" color="green" variant="light">
                  <IconSparkles size={16} />
                </ThemeIcon>
                <Text fw={600}>AI 已自动提取并填充以下信息</Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                {parsed.name && (
                  <Text size="sm">
                    <strong>姓名：</strong>
                    {parsed.name}
                  </Text>
                )}
                {parsed.major && (
                  <Text size="sm">
                    <strong>专业：</strong>
                    {parsed.major}
                  </Text>
                )}
                {parsed.education && (
                  <Text size="sm">
                    <strong>学历：</strong>
                    {parsed.education}
                  </Text>
                )}
                {parsed.graduationYear && (
                  <Text size="sm">
                    <strong>毕业年份：</strong>
                    {parsed.graduationYear}
                  </Text>
                )}
                {parsed.identity && (
                  <Text size="sm">
                    <strong>身份：</strong>
                    {parsed.identity === "student"
                      ? "在校学生"
                      : parsed.identity === "fresh_grad"
                        ? "应届毕业生"
                        : parsed.identity === "experienced"
                          ? "有工作经验"
                          : parsed.identity}
                  </Text>
                )}
              </SimpleGrid>
              {parsed.skills?.length > 0 && (
                <div>
                  <Text size="sm" fw={500} mb={4}>
                    技能：
                  </Text>
                  <Group gap={4}>
                    {parsed.skills.map((s: string, i: number) => (
                      <Badge key={i} size="sm" variant="light">
                        {s}
                      </Badge>
                    ))}
                  </Group>
                </div>
              )}
              {parsed.interests?.length > 0 && (
                <div>
                  <Text size="sm" fw={500} mb={4}>
                    兴趣方向：
                  </Text>
                  <Group gap={4}>
                    {parsed.interests.map((s: string, i: number) => (
                      <Badge key={i} size="sm" color="blue" variant="light">
                        {s}
                      </Badge>
                    ))}
                  </Group>
                </div>
              )}
              {parsed.selfIntro && (
                <div>
                  <Text size="sm" fw={500} mb={4}>
                    AI 生成的自我介绍：
                  </Text>
                  <Text size="sm" c="dimmed">
                    {parsed.selfIntro}
                  </Text>
                </div>
              )}
              <Alert
                color="green"
                variant="light"
                icon={<IconCheck size={16} />}
              >
                以上信息已自动填充到个人资料中，可去"个人情况"页面查看修改。
              </Alert>
            </Stack>
          </Card>
        )}

        {parseError && (
          <Alert color="yellow" variant="light" title="AI 解析失败">
            {parseError}
          </Alert>
        )}

        {/* 简历内容编辑 */}
        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={600}>简历内容</Text>
              {resumeText && (
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconSparkles size={14} />}
                    loading={parsing}
                    onClick={() => doAIParse(resumeText)}
                  >
                    AI 重新解析
                  </Button>
                  <Button
                    variant="subtle"
                    size="xs"
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={handleClear}
                  >
                    清空
                  </Button>
                </Group>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              上传后自动填充，也可手动粘贴或编辑。
            </Text>
            <Textarea
              placeholder="粘贴你的简历内容..."
              value={resumeText}
              onChange={(e) => setResumeText(e.currentTarget.value)}
              minRows={8}
              maxRows={20}
            />
            <Group justify="flex-end">
              <Button
                onClick={handleSave}
                leftSection={<IconCheck size={16} />}
                loading={saving}
                disabled={!resumeText.trim()}
              >
                保存简历
              </Button>
            </Group>
            {saved && (
              <Alert
                color="green"
                variant="light"
                icon={<IconCheck size={16} />}
              >
                简历已保存！
              </Alert>
            )}
          </Stack>
        </Card>

        <Divider />

        <Group justify="flex-end">
          <Button
            onClick={() => navigate("/autopilot")}
            rightSection={<IconArrowRight size={16} />}
            gradient={{ from: "blue", to: "cyan" }}
            variant="gradient"
          >
            进入 AI 全自动流程
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
