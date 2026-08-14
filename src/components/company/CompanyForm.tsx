import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Group,
  TextInput,
  Select,
  Textarea,
  NumberInput,
  Card,
  Alert,
  Grid,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { IconArrowLeft, IconPlus, IconSparkles } from "@tabler/icons-react";
import { useCompanyStore } from "../../stores/useCompanyStore";
import type { Company } from "../../types/company";
import { INDUSTRIES, SCALES, FUNDING_STAGES } from "../../constants/company";

type FormState = {
  name: string;
  industry: string;
  scale: string;
  fundingStage: string;
  location: { city: string; district: string };
  stabilityScore: number;
  promotionClarity: number;
  tags: string;
  description: string;
};

const CompanyForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const addCompany = useCompanyStore((state) => state.addCompany);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    industry: "",
    scale: "startup",
    fundingStage: "",
    location: { city: "", district: "" },
    stabilityScore: 70,
    promotionClarity: 70,
    tags: "",
    description: "",
  });

  useEffect(() => {
    if (isEdit && id) {
      window.electronAPI.getCompany(id).then((c: Company | null) => {
        if (c) {
          setForm({
            name: c.name,
            industry: c.industry,
            scale: c.scale,
            fundingStage: c.fundingStage || "",
            location: {
              city: c.location.city,
              district: c.location.district ?? "",
            },
            stabilityScore: c.stabilityScore,
            promotionClarity: c.promotionClarity,
            tags: (c.tags || []).join(", "),
            description: c.description || "",
          });
        }
      });
    }
  }, [id]);

  const handleChange = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));
  };

  const handleAiAnalyze = async () => {
    if (!form.name.trim()) {
      setError("请先输入公司名称");
      return;
    }
    setAnalyzing(true);
    setError(null);
    setAiNote(null);
    try {
      const result = await window.electronAPI?.aiAnalyzeCompany?.(
        form.name.trim(),
      );
      if (!result?.success || !result.data) {
        throw new Error("AI 未返回数据");
      }
      const d = result.data as Record<string, unknown>;
      const rawIndustry = (d.industry as string) || "";
      const matchedIndustry = INDUSTRIES.includes(rawIndustry)
        ? rawIndustry
        : rawIndustry
          ? "其他"
          : "";
      const scores = d.scores as
        | {
            stability?: number;
            promotion?: number;
            industry?: number;
            regional?: number;
            overall?: number;
          }
        | undefined;
      const reasons = Array.isArray(d.reasons) ? (d.reasons as string[]) : [];
      const tagsArr = Array.isArray(d.tags) ? (d.tags as string[]) : [];
      const desc = (d.description as string) || "";
      let aiExtra = "";
      if (scores) {
        aiExtra += `\n\n【AI 评估说明】\n综合评分：${scores.overall ?? "-"}/100（稳定性 ${scores.stability ?? "-"}、晋升 ${scores.promotion ?? "-"}、行业 ${scores.industry ?? "-"}、地域 ${scores.regional ?? "-"}）`;
      }
      if (reasons.length) {
        aiExtra += "\n" + reasons.map((r: string) => `- ${r}`).join("\n");
      }
      setForm((prev) => ({
        ...prev,
        name: (d.name as string) || prev.name,
        industry: matchedIndustry || prev.industry,
        scale: ["startup", "medium", "large"].includes(d.scale as string)
          ? (d.scale as string)
          : prev.scale,
        fundingStage: (d.fundingStage as string) || prev.fundingStage,
        location: {
          city: (d.city as string) || prev.location.city,
          district: (d.district as string) || prev.location.district,
        },
        stabilityScore:
          typeof d.stabilityScore === "number"
            ? d.stabilityScore
            : prev.stabilityScore,
        promotionClarity:
          typeof d.promotionClarity === "number"
            ? d.promotionClarity
            : prev.promotionClarity,
        tags: tagsArr.join(","),
        description: (desc + aiExtra).trim(),
      }));
      setAiNote(
        matchedIndustry === "其他" && rawIndustry
          ? `AI 返回行业「${rawIndustry}」不在预设列表，已归为「其他」，请确认`
          : "AI 已填充表单，请审核修改后保存",
      );
    } catch (err) {
      setError("AI 分析失败：" + (err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.name.trim()) {
        setError("请输入公司名称");
        return;
      }
      if (!form.industry) {
        setError("请选择行业");
        return;
      }
      if (!form.location.city.trim()) {
        setError("请输入城市");
        return;
      }

      const company: Company = {
        id: isEdit ? id! : Date.now().toString(),
        name: form.name,
        industry: form.industry,
        scale: form.scale as Company["scale"],
        fundingStage: form.fundingStage || undefined,
        location: form.location,
        stabilityScore: form.stabilityScore,
        promotionClarity: form.promotionClarity,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        description: form.description || undefined,
        source: "manual",
        createdAt: new Date().toISOString(),
      };

      if (isEdit) {
        await useCompanyStore.getState().updateCompany(id!, company);
      } else {
        addCompany(company);
        if (window.electronAPI?.saveCompany) {
          await window.electronAPI.saveCompany(company);
        }
      }

      navigate("/companies");
    } catch (err) {
      setError("保存公司信息失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            {isEdit ? "编辑公司信息" : "录入公司信息"}
          </Title>
          <Text c="dimmed">添加目标公司信息，便于后续评估和推荐</Text>
        </div>
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate("/companies")}
        >
          返回列表
        </Button>
      </Group>

      {error && (
        <Alert color="red" mb="lg" title="错误">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Group gap="sm" mb="sm" align="center">
              <IconSparkles size={20} color="var(--mantine-color-blue-6)" />
              <Title order={4}>AI 自动分析</Title>
            </Group>
            <Text size="sm" c="dimmed" mb="md">
              只需输入公司名称，AI
              会自动获取并填充行业、规模、融资、城市、评分等信息。填充后您可审核修改后保存。
            </Text>
            <Group gap="md" align="flex-end">
              <TextInput
                label="公司名称"
                placeholder="例如：字节跳动"
                value={form.name}
                onChange={(e) => handleChange("name", e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button
                leftSection={<IconSparkles size={16} />}
                loading={analyzing}
                onClick={handleAiAnalyze}
              >
                AI 分析并填表
              </Button>
            </Group>
            {aiNote && (
              <Alert color="blue" mt="md" title="提示">
                {aiNote}
              </Alert>
            )}
          </Card>

          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Title order={4} mb="md">
              基本信息
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="公司名称"
                  placeholder="例如：字节跳动"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.currentTarget.value)}
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="所属行业"
                  placeholder="请选择行业"
                  data={INDUSTRIES}
                  searchable
                  value={form.industry}
                  onChange={(val) => handleChange("industry", val || "")}
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="公司规模"
                  placeholder="请选择规模"
                  data={SCALES}
                  value={form.scale}
                  onChange={(val) => handleChange("scale", val || "startup")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="融资阶段"
                  placeholder="请选择融资阶段"
                  data={FUNDING_STAGES}
                  clearable
                  value={form.fundingStage}
                  onChange={(val) => handleChange("fundingStage", val || "")}
                />
              </Grid.Col>
            </Grid>
          </Card>

          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Title order={4} mb="md">
              地理位置
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="城市"
                  placeholder="例如：北京"
                  value={form.location.city}
                  onChange={(e) =>
                    handleLocationChange("city", e.currentTarget.value)
                  }
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="区域（选填）"
                  placeholder="例如：海淀区"
                  value={form.location.district}
                  onChange={(e) =>
                    handleLocationChange("district", e.currentTarget.value)
                  }
                />
              </Grid.Col>
            </Grid>
          </Card>

          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Title order={4} mb="md">
              评估指标
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <NumberInput
                  label="稳定性评分 (0-100)"
                  min={0}
                  max={100}
                  value={form.stabilityScore}
                  onChange={(val) =>
                    handleChange("stabilityScore", Number(val) || 0)
                  }
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <NumberInput
                  label="晋升清晰度 (0-100)"
                  min={0}
                  max={100}
                  value={form.promotionClarity}
                  onChange={(val) =>
                    handleChange("promotionClarity", Number(val) || 0)
                  }
                />
              </Grid.Col>
            </Grid>
          </Card>

          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Title order={4} mb="md">
              其他信息
            </Title>
            <Stack gap="md">
              <TextInput
                label="标签"
                placeholder="用逗号分隔，例如：大厂, 稳定, 高薪"
                value={form.tags}
                onChange={(e) => handleChange("tags", e.currentTarget.value)}
              />
              <Textarea
                label="公司简介"
                placeholder="简要描述公司业务、文化等..."
                minRows={3}
                value={form.description}
                onChange={(e) =>
                  handleChange("description", e.currentTarget.value)
                }
              />
            </Stack>
          </Card>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => navigate("/companies")}>
              取消
            </Button>
            <Button
              type="submit"
              leftSection={<IconPlus size={16} />}
              loading={loading}
            >
              保存公司
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
};

export default CompanyForm;
