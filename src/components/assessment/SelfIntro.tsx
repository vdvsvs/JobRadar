import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Textarea,
  Button,
  Group,
  Stack,
  Card,
  Alert,
  Select,
  Badge,
  SimpleGrid,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { IconArrowLeft, IconArrowRight, IconUser } from "@tabler/icons-react";
import { useUserStore } from "../../stores/useUserStore";

const templates = [
  { value: "student", label: "在校学生" },
  { value: "fresh_grad", label: "应届毕业生" },
  { value: "career_switcher", label: "转行求职者" },
  { value: "experienced", label: "有工作经验" },
];

const SelfIntro: React.FC = () => {
  const navigate = useNavigate();
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const [identity, setIdentity] = useState<string | null>(null);
  const [intro, setIntro] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await useUserStore.getState().loadFromBackend();
      await backfillProfileFromLatestResume();
      if (!mounted) return;
      const p = useUserStore.getState().profile;
      if (p) {
        setIntro((p.selfIntro as string) || buildIntroFromProfile(p));
        // Try to restore identity from profile data
        if (p.identity) setIdentity(p.identity as string);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!intro.trim()) {
      setError("请先填写你的自我介绍");
      return;
    }
    try {
      await updateProfile({
        selfIntro: intro.trim(),
        identity: identity,
        assessmentUnlocked: true,
      });
    } catch (e) {
      console.error("Failed to persist profile to backend:", e);
    }
    navigate("/jobs");
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>📝 个人情况说明</Title>
            <Text c="dimmed" size="sm">
              让系统更了解你，从而给出更精准的职位推荐。
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

        {profile &&
          (profile.name ||
            profile.major ||
            profile.education ||
            profile.skills?.length ||
            profile.resumeText) && (
            <Card withBorder shadow="sm" radius="md" padding="lg">
              <Stack gap="sm">
                <Text fw={600}>已从简历读取</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  {profile.name && (
                    <Text size="sm">
                      <strong>姓名：</strong>
                      {profile.name}
                    </Text>
                  )}
                  {profile.major && (
                    <Text size="sm">
                      <strong>专业：</strong>
                      {profile.major}
                    </Text>
                  )}
                  {profile.education && (
                    <Text size="sm">
                      <strong>学历：</strong>
                      {profile.education}
                    </Text>
                  )}
                  {profile.graduationYear && (
                    <Text size="sm">
                      <strong>毕业年份：</strong>
                      {profile.graduationYear}
                    </Text>
                  )}
                  {profile.identity && (
                    <Text size="sm">
                      <strong>身份：</strong>
                      {templates.find((item) => item.value === profile.identity)
                        ?.label || profile.identity}
                    </Text>
                  )}
                </SimpleGrid>
                {profile.skills && profile.skills.length > 0 && (
                  <Group gap={4}>
                    {profile.skills.slice(0, 16).map((skill) => (
                      <Badge key={skill} size="sm" variant="light">
                        {skill}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Stack>
            </Card>
          )}

        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Stack gap="sm">
            <Text fw={600}>第一步：选择你的当前身份</Text>
            <Select
              placeholder="选择最贴近你的身份"
              data={templates}
              value={identity}
              onChange={setIdentity}
            />
            {identity && (
              <Alert color="blue" variant="light">
                {identity === "student" &&
                  "你正在校就读，推荐优先看实习和校招岗位。"}
                {identity === "fresh_grad" &&
                  "你刚毕业，推荐优先看应届生岗位和校招补录。"}
                {identity === "career_switcher" &&
                  "你正在转行，推荐会兼顾可迁移能力与转型岗位。"}
                {identity === "experienced" &&
                  "你有工作经验，推荐会更关注职级匹配和晋升路径。"}
              </Alert>
            )}
          </Stack>
        </Card>

        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Stack gap="sm">
            <Text fw={600}>第二步：自我介绍</Text>
            <Text size="sm" c="dimmed">
              可以包括：专业背景、实习/项目经历、技能栈、目标行业、期望岗位、地域偏好等。
            </Text>
            <Textarea
              placeholder="例如：我是计算机科学专业大三学生，主要使用 React/TypeScript，做过两个前端项目，希望在深圳找一份前端实习..."
              value={intro}
              onChange={(e) => setIntro(e.currentTarget.value)}
              minRows={6}
              maxRows={12}
              error={error}
            />
          </Stack>
        </Card>

        <Group justify="flex-end">
          <Button variant="default" onClick={() => navigate("/resume")}>
            跳过，稍后补充
          </Button>
          <Button
            onClick={() => {
              handleSave();
            }}
            rightSection={<IconArrowRight size={16} />}
          >
            保存并继续
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};

function buildIntroFromProfile(profile: any): string {
  const parts = [
    profile.major ? `我是${profile.major}${profile.education || ""}学生` : "",
    profile.skills?.length
      ? `熟悉${profile.skills.slice(0, 8).join("、")}`
      : "",
    typeof profile.careerGoals === "string" && profile.careerGoals
      ? `目标是${profile.careerGoals}`
      : "",
  ].filter(Boolean);
  return parts.join("，");
}

async function backfillProfileFromLatestResume() {
  const profile = useUserStore.getState().profile;
  if (
    (profile?.name && profile?.major && profile?.selfIntro) ||
    !window.electronAPI?.getResume
  )
    return;
  const resume = (await window.electronAPI.getResume()) as any;
  const text = resume?.parsedText ? String(resume.parsedText) : "";
  if (!text.trim()) return;
  if (!window.electronAPI?.parseResume) {
    await useUserStore.getState().updateProfile({ resumeText: text } as any);
    return;
  }
  try {
    const data = (await window.electronAPI.parseResume(text)) as any;
    await useUserStore.getState().updateProfile({
      name: data.name || profile?.name || "",
      major: data.major || profile?.major || "",
      age: data.age || profile?.age || 0,
      education: data.education || profile?.education,
      graduationYear: data.graduationYear || profile?.graduationYear,
      careerGoals: data.careerGoals || profile?.careerGoals,
      selfIntro:
        data.selfIntro || profile?.selfIntro || buildIntroFromProfile(data),
      interests: data.interests || profile?.interests || [],
      identity: data.identity || profile?.identity || null,
      skills: Array.isArray(data.skills) ? data.skills : profile?.skills || [],
      resumeText: text,
      assessmentUnlocked: true,
    } as any);
  } catch {
    await useUserStore.getState().updateProfile({ resumeText: text } as any);
  }
}

export default SelfIntro;
