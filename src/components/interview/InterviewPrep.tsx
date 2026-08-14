import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Card,
  Badge,
  Tabs,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Modal,
  ActionIcon,
  SimpleGrid,
  Accordion,
  Tooltip,
  Divider,
  Center,
  Alert,
  Paper,
  Loader,
  Menu,
  rem,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconLink,
  IconUnlink,
  IconSparkles,
  IconStar,
  IconQuestionMark,
  IconFilter,
  IconSearch,
  IconDotsVertical,
  IconBook,
  IconBulb,
  IconCheck,
  IconX,
  IconClock,
  IconTag,
  IconBrain,
  IconMessageQuestion,
} from "@tabler/icons-react";
import { useInterviewStore } from "../../stores/useInterviewStore";
import type {
  InterviewStory,
  InterviewQuestion,
} from "../../services/ai/AIServiceAdapter";

/* ============================
   常量
   ============================ */

const QUESTION_TYPE_OPTIONS = [
  { value: "behavioral", label: "行为面试题" },
  { value: "technical", label: "技术面试题" },
  { value: "situational", label: "情景面试题" },
];

const QUESTION_TYPE_COLORS: Record<string, string> = {
  behavioral: "blue",
  technical: "orange",
  situational: "green",
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  behavioral: "行为",
  technical: "技术",
  situational: "情景",
};

const COMMON_COMPETENCIES = [
  "领导力",
  "团队协作",
  "沟通能力",
  "问题解决",
  "创新能力",
  "抗压能力",
  "时间管理",
  "学习能力",
  "责任心",
  "主动性",
  "适应能力",
  "冲突管理",
  "决策能力",
  "客户服务",
  "项目管理",
];

/* ============================
   STAR 故事表单组件
   ============================ */

interface StoryFormProps {
  opened: boolean;
  onClose: () => void;
  initialValues?: InterviewStory | null;
  onSubmit: (
    values: Omit<
      InterviewStory,
      "id" | "created_at" | "use_count" | "last_used_at"
    >,
  ) => void;
  existingCompetencies: string[];
  existingTags: string[];
}

const StoryForm: React.FC<StoryFormProps> = ({
  opened,
  onClose,
  initialValues,
  onSubmit,
  existingCompetencies,
  existingTags,
}) => {
  const form = useForm({
    initialValues: {
      title: "",
      competency: "",
      situation: "",
      task: "",
      action: "",
      result: "",
      reflection: "",
      tags: [] as string[],
    },
    validate: {
      title: (value: string) =>
        value.trim().length > 0 ? null : "请输入故事标题",
      competency: (value: string) =>
        value.trim().length > 0 ? null : "请选择能力维度",
      situation: (value: string) =>
        value.trim().length > 0 ? null : "请描述情境",
      task: (value: string) => (value.trim().length > 0 ? null : "请描述任务"),
      action: (value: string) =>
        value.trim().length > 0 ? null : "请描述行动",
      result: (value: string) =>
        value.trim().length > 0 ? null : "请描述结果",
    },
  });

  useEffect(() => {
    if (opened) {
      if (initialValues) {
        form.setValues({
          title: initialValues.title,
          competency: initialValues.competency,
          situation: initialValues.situation,
          task: initialValues.task,
          action: initialValues.action,
          result: initialValues.result,
          reflection: initialValues.reflection || "",
          tags: initialValues.tags || [],
        });
      } else {
        form.reset();
      }
    }
  }, [opened, initialValues]);

  const competencyOptions = useMemo(() => {
    const combined = new Set([...COMMON_COMPETENCIES, ...existingCompetencies]);
    return Array.from(combined).map((c) => ({ value: c, label: c }));
  }, [existingCompetencies]);

  const tagOptions = useMemo(() => {
    return existingTags.map((t) => ({ value: t, label: t }));
  }, [existingTags]);

  const handleSubmit = (values: typeof form.values) => {
    onSubmit({
      title: values.title.trim(),
      competency: values.competency,
      situation: values.situation.trim(),
      task: values.task.trim(),
      action: values.action.trim(),
      result: values.result.trim(),
      reflection: values.reflection.trim() || undefined,
      tags: values.tags,
    });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initialValues ? "编辑STAR故事" : "添加STAR故事"}
      size="lg"
      scrollAreaComponent={undefined}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="故事标题"
            placeholder="例：主导校园电商项目上线"
            required
            {...form.getInputProps("title")}
          />

          <Select
            label="能力维度"
            placeholder="选择或输入能力维度"
            data={competencyOptions}
            searchable
            required
            {...form.getInputProps("competency")}
          />

          <Textarea
            label="Situation（情境）"
            placeholder="描述当时的背景和环境..."
            autosize
            minRows={3}
            required
            {...form.getInputProps("situation")}
          />

          <Textarea
            label="Task（任务）"
            placeholder="描述你面临的任务或挑战..."
            autosize
            minRows={3}
            required
            {...form.getInputProps("task")}
          />

          <Textarea
            label="Action（行动）"
            placeholder="描述你采取的具体行动..."
            autosize
            minRows={3}
            required
            {...form.getInputProps("action")}
          />

          <Textarea
            label="Result（结果）"
            placeholder="描述取得的成果和影响..."
            autosize
            minRows={3}
            required
            {...form.getInputProps("result")}
          />

          <Textarea
            label="Reflection（反思）"
            placeholder="你的收获和反思（可选）..."
            autosize
            minRows={2}
            {...form.getInputProps("reflection")}
          />

          <MultiSelect
            label="标签"
            placeholder="选择或输入标签"
            data={tagOptions}
            searchable
            {...form.getInputProps("tags")}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" leftSection={<IconCheck size={16} />}>
              {initialValues ? "保存修改" : "添加故事"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

/* ============================
   STAR 故事卡片组件
   ============================ */

interface StoryCardProps {
  story: InterviewStory;
  linkedQuestions: InterviewQuestion[];
  onEdit: (story: InterviewStory) => void;
  onDelete: (id: string) => void;
  onLinkToQuestion: (story: InterviewStory) => void;
}

const StoryCard: React.FC<StoryCardProps> = ({
  story,
  linkedQuestions,
  onEdit,
  onDelete,
  onLinkToQuestion,
}) => {
  const [
    deleteConfirmOpened,
    { open: openDeleteConfirm, close: closeDeleteConfirm },
  ] = useDisclosure(false);

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="sm">
            <IconStar size={20} color="var(--mantine-color-yellow-6)" />
            <Text fw={600} size="md">
              {story.title}
            </Text>
          </Group>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => onEdit(story)}
              >
                编辑
              </Menu.Item>
              <Menu.Item
                leftSection={<IconLink size={14} />}
                onClick={() => onLinkToQuestion(story)}
              >
                关联到问题
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={openDeleteConfirm}
              >
                删除
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Group gap="xs" mb="sm">
          <Badge color="violet" variant="light">
            {story.competency}
          </Badge>
          {story.tags?.map((tag) => (
            <Badge key={tag} color="gray" variant="outline" size="sm">
              {tag}
            </Badge>
          ))}
        </Group>

        <Accordion variant="separated" mb="sm">
          <Accordion.Item value="star">
            <Accordion.Control>
              <Text size="sm" fw={500}>
                STAR 详情
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Box>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    S - 情境
                  </Text>
                  <Text size="sm">{story.situation}</Text>
                </Box>
                <Box>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    T - 任务
                  </Text>
                  <Text size="sm">{story.task}</Text>
                </Box>
                <Box>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    A - 行动
                  </Text>
                  <Text size="sm">{story.action}</Text>
                </Box>
                <Box>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    R - 结果
                  </Text>
                  <Text size="sm">{story.result}</Text>
                </Box>
                {story.reflection && (
                  <Box>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                      反思
                    </Text>
                    <Text size="sm" c="dimmed">
                      {story.reflection}
                    </Text>
                  </Box>
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Group justify="space-between">
          <Group gap="md">
            <Tooltip label="使用次数">
              <Group gap={4}>
                <IconClock size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                  {story.use_count || 0}次
                </Text>
              </Group>
            </Tooltip>
            {linkedQuestions.length > 0 && (
              <Tooltip label={`已关联 ${linkedQuestions.length} 个问题`}>
                <Group gap={4}>
                  <IconLink size={14} color="var(--mantine-color-blue-6)" />
                  <Text size="xs" c="blue">
                    {linkedQuestions.length}个问题
                  </Text>
                </Group>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Card>

      {/* 删除确认弹窗 */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={closeDeleteConfirm}
        title="确认删除"
        size="sm"
      >
        <Stack>
          <Text size="sm">
            确定要删除故事「{story.title}」吗？此操作不可撤销。
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteConfirm}>
              取消
            </Button>
            <Button
              color="red"
              onClick={() => {
                onDelete(story.id);
                closeDeleteConfirm();
              }}
            >
              删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

/* ============================
   问题表单组件
   ============================ */

interface QuestionFormProps {
  opened: boolean;
  onClose: () => void;
  initialValues?: InterviewQuestion | null;
  onSubmit: (
    values: Omit<
      InterviewQuestion,
      "id" | "created_at" | "suggested_story_id" | "user_answer" | "ai_feedback"
    >,
  ) => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  opened,
  onClose,
  initialValues,
  onSubmit,
}) => {
  const form = useForm({
    initialValues: {
      question_text: "",
      question_type: "behavioral" as "behavioral" | "technical" | "situational",
      job_listing_id: "",
    },
    validate: {
      question_text: (value: string) =>
        value.trim().length > 0 ? null : "请输入面试问题",
    },
  });

  useEffect(() => {
    if (opened) {
      if (initialValues) {
        form.setValues({
          question_text: initialValues.question_text,
          question_type: initialValues.question_type,
          job_listing_id: initialValues.job_listing_id || "",
        });
      } else {
        form.reset();
      }
    }
  }, [opened, initialValues]);

  const handleSubmit = (values: typeof form.values) => {
    onSubmit({
      question_text: values.question_text.trim(),
      question_type: values.question_type,
      job_listing_id: values.job_listing_id || "",
    });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initialValues ? "编辑面试问题" : "添加面试问题"}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Textarea
            label="面试问题"
            placeholder="请输入面试问题..."
            autosize
            minRows={3}
            required
            {...form.getInputProps("question_text")}
          />

          <Select
            label="问题类型"
            data={QUESTION_TYPE_OPTIONS}
            required
            {...form.getInputProps("question_type")}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" leftSection={<IconCheck size={16} />}>
              {initialValues ? "保存修改" : "添加问题"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

/* ============================
   问题卡片组件
   ============================ */

interface QuestionCardProps {
  question: InterviewQuestion;
  linkedStory: InterviewStory | undefined;
  onEdit: (question: InterviewQuestion) => void;
  onDelete: (id: string) => void;
  onLinkStory: (question: InterviewQuestion) => void;
  onUnlinkStory: (questionId: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  linkedStory,
  onEdit,
  onDelete,
  onLinkStory,
  onUnlinkStory,
}) => {
  const [
    deleteConfirmOpened,
    { open: openDeleteConfirm, close: closeDeleteConfirm },
  ] = useDisclosure(false);

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="sm">
            <IconMessageQuestion
              size={20}
              color="var(--mantine-color-blue-6)"
            />
            <Badge
              color={QUESTION_TYPE_COLORS[question.question_type]}
              variant="light"
            >
              {QUESTION_TYPE_LABELS[question.question_type]}
            </Badge>
          </Group>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => onEdit(question)}
              >
                编辑
              </Menu.Item>
              {question.suggested_story_id ? (
                <Menu.Item
                  leftSection={<IconUnlink size={14} />}
                  onClick={() => onUnlinkStory(question.id)}
                >
                  取消关联
                </Menu.Item>
              ) : (
                <Menu.Item
                  leftSection={<IconLink size={14} />}
                  onClick={() => onLinkStory(question)}
                >
                  关联故事
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={openDeleteConfirm}
              >
                删除
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Text size="sm" mb="sm" style={{ whiteSpace: "pre-wrap" }}>
          {question.question_text}
        </Text>

        {linkedStory && (
          <Paper p="xs" radius="sm" bg="blue.0" withBorder>
            <Group gap="xs">
              <IconStar size={14} color="var(--mantine-color-yellow-6)" />
              <Text size="xs" fw={500} c="blue.8">
                关联故事：{linkedStory.title}
              </Text>
            </Group>
          </Paper>
        )}
      </Card>

      {/* 删除确认弹窗 */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={closeDeleteConfirm}
        title="确认删除"
        size="sm"
      >
        <Stack>
          <Text size="sm">确定要删除这个面试问题吗？此操作不可撤销。</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteConfirm}>
              取消
            </Button>
            <Button
              color="red"
              onClick={() => {
                onDelete(question.id);
                closeDeleteConfirm();
              }}
            >
              删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

/* ============================
   关联故事弹窗组件
   ============================ */

interface LinkStoryModalProps {
  opened: boolean;
  onClose: () => void;
  targetQuestion: InterviewQuestion | null;
  targetStory: InterviewStory | null;
  stories: InterviewStory[];
  onConfirm: (storyId: string, questionId: string) => void;
}

const LinkStoryModal: React.FC<LinkStoryModalProps> = ({
  opened,
  onClose,
  targetQuestion,
  targetStory,
  stories,
  onConfirm,
}) => {
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");

  useEffect(() => {
    if (opened) {
      setSelectedStoryId("");
    }
  }, [opened]);

  const storyOptions = useMemo(() => {
    return stories.map((s) => ({
      value: s.id,
      label: `${s.title} (${s.competency})`,
    }));
  }, [stories]);

  const handleConfirm = () => {
    if (targetQuestion && selectedStoryId) {
      onConfirm(selectedStoryId, targetQuestion.id);
      onClose();
    }
  };

  // 从故事关联到问题模式
  const isStoryToQuestionMode = !!targetStory;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isStoryToQuestionMode ? "将故事关联到问题" : "为问题关联故事"}
      size="md"
    >
      <Stack gap="md">
        {isStoryToQuestionMode ? (
          <Alert color="blue" variant="light">
            <Text size="sm">
              故事：<strong>{targetStory?.title}</strong>（
              {targetStory?.competency}）
            </Text>
          </Alert>
        ) : targetQuestion ? (
          <Alert color="blue" variant="light">
            <Text size="sm">
              问题：{targetQuestion.question_text.substring(0, 60)}
              {targetQuestion.question_text.length > 60 ? "..." : ""}
            </Text>
          </Alert>
        ) : null}

        <Select
          label={
            isStoryToQuestionMode ? "选择要关联的面试问题" : "选择要关联的故事"
          }
          placeholder="请选择..."
          data={
            isStoryToQuestionMode
              ? [] // 实际中应有问题列表，此处简化
              : storyOptions
          }
          value={selectedStoryId}
          onChange={(value) => setSelectedStoryId(value || "")}
          searchable
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={!selectedStoryId}
            onClick={handleConfirm}
            leftSection={<IconLink size={16} />}
          >
            确认关联
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

/* ============================
   主页面组件
   ============================ */

const InterviewPrep: React.FC = () => {
  // Store
  const stories = useInterviewStore((s) => s.stories);
  const questions = useInterviewStore((s) => s.questions);
  const storyFilters = useInterviewStore((s) => s.storyFilters);
  const questionFilters = useInterviewStore((s) => s.questionFilters);
  const addStory = useInterviewStore((s) => s.addStory);
  const updateStory = useInterviewStore((s) => s.updateStory);
  const deleteStory = useInterviewStore((s) => s.deleteStory);
  const addQuestion = useInterviewStore((s) => s.addQuestion);
  const updateQuestion = useInterviewStore((s) => s.updateQuestion);
  const deleteQuestion = useInterviewStore((s) => s.deleteQuestion);
  const linkStoryToQuestion = useInterviewStore((s) => s.linkStoryToQuestion);
  const unlinkStoryFromQuestion = useInterviewStore(
    (s) => s.unlinkStoryFromQuestion,
  );
  const loadFromBackend = useInterviewStore((s) => s.loadFromBackend);
  const getCompetencies = useInterviewStore((s) => s.getCompetencies);
  const getAllTags = useInterviewStore((s) => s.getAllTags);
  const getFilteredStories = useInterviewStore((s) => s.getFilteredStories);
  const getFilteredQuestions = useInterviewStore((s) => s.getFilteredQuestions);
  const setStoryFilters = useInterviewStore((s) => s.setStoryFilters);
  const clearStoryFilters = useInterviewStore((s) => s.clearStoryFilters);
  const setQuestionFilters = useInterviewStore((s) => s.setQuestionFilters);
  const clearQuestionFilters = useInterviewStore((s) => s.clearQuestionFilters);

  // 本地状态
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>("stories");

  // 故事表单
  const [storyFormOpened, { open: openStoryForm, close: closeStoryForm }] =
    useDisclosure(false);
  const [editingStory, setEditingStory] = useState<InterviewStory | null>(null);

  // 问题表单
  const [
    questionFormOpened,
    { open: openQuestionForm, close: closeQuestionForm },
  ] = useDisclosure(false);
  const [editingQuestion, setEditingQuestion] =
    useState<InterviewQuestion | null>(null);

  // 关联弹窗
  const [linkModalOpened, { open: openLinkModal, close: closeLinkModal }] =
    useDisclosure(false);
  const [linkTargetStory, setLinkTargetStory] = useState<InterviewStory | null>(
    null,
  );
  const [linkTargetQuestion, setLinkTargetQuestion] =
    useState<InterviewQuestion | null>(null);

  // AI 生成状态
  const [generatingStory, setGeneratingStory] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // 筛选搜索
  const [storySearchQuery, setStorySearchQuery] = useState("");
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadFromBackend();
      } catch (err) {
        console.error("加载面试数据失败:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadFromBackend]);

  // 计算属性
  const existingCompetencies = useMemo(() => getCompetencies(), [stories]);
  const existingTags = useMemo(() => getAllTags(), [stories]);
  const filteredStories = useMemo(
    () => getFilteredStories(),
    [stories, storyFilters],
  );
  const filteredQuestions = useMemo(
    () => getFilteredQuestions(),
    [questions, questionFilters],
  );

  // 搜索过滤后的列表
  const displayStories = useMemo(() => {
    if (!storySearchQuery.trim()) return filteredStories;
    const q = storySearchQuery.toLowerCase();
    return filteredStories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.competency.toLowerCase().includes(q) ||
        s.situation.toLowerCase().includes(q) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [filteredStories, storySearchQuery]);

  const displayQuestions = useMemo(() => {
    if (!questionSearchQuery.trim()) return filteredQuestions;
    const q = questionSearchQuery.toLowerCase();
    return filteredQuestions.filter(
      (question) =>
        question.question_text.toLowerCase().includes(q) ||
        question.question_type.toLowerCase().includes(q),
    );
  }, [filteredQuestions, questionSearchQuery]);

  // 获取问题关联的故事
  const getLinkedStoryForQuestion = useCallback(
    (question: InterviewQuestion): InterviewStory | undefined => {
      if (!question.suggested_story_id) return undefined;
      return stories.find((s) => s.id === question.suggested_story_id);
    },
    [stories],
  );

  // 获取故事关联的问题列表
  const getLinkedQuestionsForStory = useCallback(
    (story: InterviewStory): InterviewQuestion[] => {
      return questions.filter((q) => q.suggested_story_id === story.id);
    },
    [questions],
  );

  // ---- 故事操作 ----

  const handleAddStory = () => {
    setEditingStory(null);
    openStoryForm();
  };

  const handleEditStory = (story: InterviewStory) => {
    setEditingStory(story);
    openStoryForm();
  };

  const handleSubmitStory = (
    values: Omit<
      InterviewStory,
      "id" | "created_at" | "use_count" | "last_used_at"
    >,
  ) => {
    if (editingStory) {
      updateStory(editingStory.id, values);
      notifications.show({
        title: "已更新",
        message: `故事「${values.title}」已更新`,
        color: "green",
      });
    } else {
      addStory(values);
      notifications.show({
        title: "已添加",
        message: `故事「${values.title}」已添加到故事库`,
        color: "green",
      });
    }
  };

  const handleDeleteStory = (id: string) => {
    deleteStory(id);
    notifications.show({
      title: "已删除",
      message: "故事已删除",
      color: "gray",
    });
  };

  // ---- 问题操作 ----

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    openQuestionForm();
  };

  const handleEditQuestion = (question: InterviewQuestion) => {
    setEditingQuestion(question);
    openQuestionForm();
  };

  const handleSubmitQuestion = (
    values: Omit<
      InterviewQuestion,
      "id" | "created_at" | "suggested_story_id" | "user_answer" | "ai_feedback"
    >,
  ) => {
    if (editingQuestion) {
      updateQuestion(editingQuestion.id, values);
      notifications.show({
        title: "已更新",
        message: "面试问题已更新",
        color: "green",
      });
    } else {
      addQuestion(values);
      notifications.show({
        title: "已添加",
        message: "面试问题已添加",
        color: "green",
      });
    }
  };

  const handleDeleteQuestion = (id: string) => {
    deleteQuestion(id);
    notifications.show({
      title: "已删除",
      message: "面试问题已删除",
      color: "gray",
    });
  };

  // ---- 关联操作 ----

  const handleLinkStoryToQuestion = (story: InterviewStory) => {
    setLinkTargetStory(story);
    setLinkTargetQuestion(null);
    openLinkModal();
  };

  const handleLinkQuestionToStory = (question: InterviewQuestion) => {
    setLinkTargetQuestion(question);
    setLinkTargetStory(null);
    openLinkModal();
  };

  const handleConfirmLink = (storyId: string, questionId: string) => {
    linkStoryToQuestion(storyId, questionId);
    notifications.show({
      title: "已关联",
      message: "故事已关联到面试问题",
      color: "blue",
    });
  };

  const handleUnlinkStory = (questionId: string) => {
    unlinkStoryFromQuestion(questionId);
    notifications.show({
      title: "已取消关联",
      message: "已取消故事与问题的关联",
      color: "gray",
    });
  };

  // ---- AI 生成操作 ----

  const handleGenerateStory = async () => {
    setGeneratingStory(true);
    try {
      // 调用 Electron IPC 进行 AI 生成
      if (window.electronAPI?.generateSTARStory) {
        const story = await window.electronAPI.generateSTARStory(
          "问题解决",
          "请基于我的简历生成一个STAR故事",
        );
        if (story) {
          addStory(story as Omit<InterviewStory, "id" | "created_at">);
          notifications.show({
            title: "AI生成成功",
            message: "已生成一个新的STAR故事",
            color: "green",
          });
        }
      } else {
        notifications.show({
          title: "功能暂不可用",
          message: "AI生成功能需要配置API Key",
          color: "yellow",
        });
      }
    } catch (err) {
      console.error("AI生成故事失败:", err);
      notifications.show({
        title: "生成失败",
        message: "AI生成故事失败，请检查网络和API配置",
        color: "red",
      });
    } finally {
      setGeneratingStory(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      if (window.electronAPI?.generateInterviewQuestions) {
        const newQuestions =
          await window.electronAPI.generateInterviewQuestions(
            { title: "目标岗位", company: "目标公司" } as any,
            "",
          );
        if (Array.isArray(newQuestions) && newQuestions.length > 0) {
          newQuestions.forEach((q) => {
            addQuestion(q as Omit<InterviewQuestion, "id" | "created_at">);
          });
          notifications.show({
            title: "AI生成成功",
            message: `已生成 ${newQuestions.length} 个面试问题`,
            color: "green",
          });
        }
      } else {
        notifications.show({
          title: "功能暂不可用",
          message: "AI生成功能需要配置API Key",
          color: "yellow",
        });
      }
    } catch (err) {
      console.error("AI生成问题失败:", err);
      notifications.show({
        title: "生成失败",
        message: "AI生成面试问题失败，请检查网络和API配置",
        color: "red",
      });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // ---- 筛选操作 ----

  const handleStoryCompetencyFilter = (competency: string | null) => {
    if (competency) {
      setStoryFilters({ competency });
    } else {
      clearStoryFilters();
    }
  };

  const handleQuestionTypeFilter = (type: string | null) => {
    if (type) {
      setQuestionFilters({ question_type: type });
    } else {
      clearQuestionFilters();
    }
  };

  // ---- 加载中 ----

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Center h={400}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">加载面试准备数据...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  // ---- 主渲染 ----

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* 页面标题 */}
        <Group justify="space-between">
          <div>
            <Title order={2} mb="xs">
              面试准备
            </Title>
            <Text c="dimmed">管理你的STAR故事库和面试问题，充分准备面试</Text>
          </div>
        </Group>

        {/* 统计概览 */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Paper p="md" radius="md" withBorder>
            <Group gap="sm">
              <IconStar size={24} color="var(--mantine-color-yellow-6)" />
              <div>
                <Text size="xl" fw={700}>
                  {stories.length}
                </Text>
                <Text size="xs" c="dimmed">
                  STAR故事
                </Text>
              </div>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group gap="sm">
              <IconQuestionMark size={24} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="xl" fw={700}>
                  {questions.length}
                </Text>
                <Text size="xs" c="dimmed">
                  面试问题
                </Text>
              </div>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group gap="sm">
              <IconBrain size={24} color="var(--mantine-color-violet-6)" />
              <div>
                <Text size="xl" fw={700}>
                  {existingCompetencies.length}
                </Text>
                <Text size="xs" c="dimmed">
                  能力维度
                </Text>
              </div>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group gap="sm">
              <IconTag size={24} color="var(--mantine-color-teal-6)" />
              <div>
                <Text size="xl" fw={700}>
                  {existingTags.length}
                </Text>
                <Text size="xs" c="dimmed">
                  标签
                </Text>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* 主内容 Tab */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="stories" leftSection={<IconBook size={16} />}>
              STAR故事库 ({stories.length})
            </Tabs.Tab>
            <Tabs.Tab
              value="questions"
              leftSection={<IconQuestionMark size={16} />}
            >
              面试问题 ({questions.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* STAR 故事库 Tab */}
          <Tabs.Panel value="stories" pt="md">
            <Stack gap="md">
              {/* 操作栏 */}
              <Group justify="space-between">
                <Group>
                  <TextInput
                    placeholder="搜索故事..."
                    leftSection={<IconSearch size={16} />}
                    value={storySearchQuery}
                    onChange={(e) => setStorySearchQuery(e.currentTarget.value)}
                    w={260}
                  />
                  <Select
                    placeholder="按能力筛选"
                    data={existingCompetencies.map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    value={storyFilters.competency || null}
                    onChange={handleStoryCompetencyFilter}
                    clearable
                    leftSection={<IconFilter size={16} />}
                    w={200}
                  />
                </Group>
                <Group>
                  <Button
                    variant="light"
                    color="violet"
                    leftSection={<IconSparkles size={16} />}
                    onClick={handleGenerateStory}
                    loading={generatingStory}
                  >
                    AI生成故事
                  </Button>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={handleAddStory}
                  >
                    添加故事
                  </Button>
                </Group>
              </Group>

              <Divider />

              {/* 故事列表 */}
              {displayStories.length === 0 ? (
                <Center py="xl">
                  <Stack align="center" gap="md">
                    <IconStar
                      size={48}
                      color="var(--mantine-color-dimmed)"
                      stroke={1}
                    />
                    <Text c="dimmed" size="lg">
                      {stories.length === 0
                        ? "还没有STAR故事"
                        : "没有匹配的故事"}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {stories.length === 0
                        ? "点击「添加故事」创建你的第一个STAR故事，或使用AI生成"
                        : "尝试调整筛选条件"}
                    </Text>
                    {stories.length === 0 && (
                      <Group>
                        <Button
                          variant="light"
                          leftSection={<IconSparkles size={16} />}
                          onClick={handleGenerateStory}
                          loading={generatingStory}
                        >
                          AI生成故事
                        </Button>
                        <Button
                          leftSection={<IconPlus size={16} />}
                          onClick={handleAddStory}
                        >
                          添加故事
                        </Button>
                      </Group>
                    )}
                  </Stack>
                </Center>
              ) : (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  {displayStories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      linkedQuestions={getLinkedQuestionsForStory(story)}
                      onEdit={handleEditStory}
                      onDelete={handleDeleteStory}
                      onLinkToQuestion={handleLinkStoryToQuestion}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Panel>

          {/* 面试问题 Tab */}
          <Tabs.Panel value="questions" pt="md">
            <Stack gap="md">
              {/* 操作栏 */}
              <Group justify="space-between">
                <Group>
                  <TextInput
                    placeholder="搜索问题..."
                    leftSection={<IconSearch size={16} />}
                    value={questionSearchQuery}
                    onChange={(e) =>
                      setQuestionSearchQuery(e.currentTarget.value)
                    }
                    w={260}
                  />
                  <Select
                    placeholder="按类型筛选"
                    data={QUESTION_TYPE_OPTIONS}
                    value={questionFilters.question_type || null}
                    onChange={handleQuestionTypeFilter}
                    clearable
                    leftSection={<IconFilter size={16} />}
                    w={200}
                  />
                </Group>
                <Group>
                  <Button
                    variant="light"
                    color="violet"
                    leftSection={<IconSparkles size={16} />}
                    onClick={handleGenerateQuestions}
                    loading={generatingQuestions}
                  >
                    AI生成问题
                  </Button>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={handleAddQuestion}
                  >
                    添加问题
                  </Button>
                </Group>
              </Group>

              <Divider />

              {/* 问题列表 */}
              {displayQuestions.length === 0 ? (
                <Center py="xl">
                  <Stack align="center" gap="md">
                    <IconQuestionMark
                      size={48}
                      color="var(--mantine-color-dimmed)"
                      stroke={1}
                    />
                    <Text c="dimmed" size="lg">
                      {questions.length === 0
                        ? "还没有面试问题"
                        : "没有匹配的问题"}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {questions.length === 0
                        ? "点击「添加问题」创建你的面试问题库，或使用AI生成"
                        : "尝试调整筛选条件"}
                    </Text>
                    {questions.length === 0 && (
                      <Group>
                        <Button
                          variant="light"
                          leftSection={<IconSparkles size={16} />}
                          onClick={handleGenerateQuestions}
                          loading={generatingQuestions}
                        >
                          AI生成问题
                        </Button>
                        <Button
                          leftSection={<IconPlus size={16} />}
                          onClick={handleAddQuestion}
                        >
                          添加问题
                        </Button>
                      </Group>
                    )}
                  </Stack>
                </Center>
              ) : (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  {displayQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      linkedStory={getLinkedStoryForQuestion(question)}
                      onEdit={handleEditQuestion}
                      onDelete={handleDeleteQuestion}
                      onLinkStory={handleLinkQuestionToStory}
                      onUnlinkStory={handleUnlinkStory}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* 故事表单弹窗 */}
      <StoryForm
        opened={storyFormOpened}
        onClose={closeStoryForm}
        initialValues={editingStory}
        onSubmit={handleSubmitStory}
        existingCompetencies={existingCompetencies}
        existingTags={existingTags}
      />

      {/* 问题表单弹窗 */}
      <QuestionForm
        opened={questionFormOpened}
        onClose={closeQuestionForm}
        initialValues={editingQuestion}
        onSubmit={handleSubmitQuestion}
      />

      {/* 关联故事弹窗 */}
      <LinkStoryModal
        opened={linkModalOpened}
        onClose={closeLinkModal}
        targetStory={linkTargetStory}
        targetQuestion={linkTargetQuestion}
        stories={stories}
        onConfirm={handleConfirmLink}
      />
    </Container>
  );
};

export default InterviewPrep;
