import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Group,
  Card,
  Badge,
  Grid,
  NumberInput,
  Textarea,
  Alert,
  Tabs,
  Rating,
  Divider,
  Progress,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconMapPin,
  IconCurrencyYen,
  IconSparkles,
} from "@tabler/icons-react";
import { useCompanyStore } from "../../stores/useCompanyStore";
import Loading from "../common/Loading";
import type { Company } from "../../types/company";

const EVAL_DIMENSIONS = [
  { key: "stability", label: "稳定性", color: "green" },
  { key: "promotion", label: "晋升清晰度", color: "blue" },
  { key: "industry", label: "行业前景", color: "cyan" },
  { key: "regional", label: "地域发展", color: "grape" },
] as const;

const CompanyDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const companies = useCompanyStore((state) => state.companies);
  const updateCompany = useCompanyStore((state) => state.updateCompany);
  const removeCompany = useCompanyStore((state) => state.removeCompany);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localCompany, setLocalCompany] = useState<Partial<Company>>({});

  const company = companies.find((c) => c.id === id);

  const [autoEval, setAutoEval] = useState<{
    scores: Record<string, number>;
    reasons: Record<string, string[]>;
  } | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [manualStability, setManualStability] = useState<number>(
    company?.stabilityScore ?? 50,
  );
  const [manualPromotion, setManualPromotion] = useState<number>(
    company?.promotionClarity ?? 50,
  );
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCompany = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!company && window.electronAPI?.getCompany) {
          const data = await window.electronAPI.getCompany(id!);
          if (!mounted) return;
          const found = data as Company;
          if (found) {
            setLocalCompany(found);
          } else {
            setError("公司不存在");
          }
        } else if (company) {
          setLocalCompany(company);
        } else {
          setError("公司不存在");
        }
      } catch (err) {
        if (mounted) setError("加载公司详情失败");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCompany();
    return () => {
      mounted = false;
    };
  }, [id, company]);

  const handleSave = async () => {
    if (!id || !localCompany) return;

    setSaving(true);
    try {
      await updateCompany(id, localCompany as Company);
      setIsEditing(false);
    } catch (err) {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("确定要删除这家公司吗？")) return;

    try {
      await removeCompany(id);
      navigate("/companies");
    } catch (err) {
      setError("删除失败");
    }
  };

  useEffect(() => {
    if (company) {
      setManualStability(company.stabilityScore);
      setManualPromotion(company.promotionClarity);
    }
  }, [company]);

  const handleAutoEvaluate = async () => {
    if (!id) return;
    setEvaluating(true);
    setEvalError(null);
    try {
      const result = (await window.electronAPI?.autoEvaluateCompany?.(id)) as
        | {
            scores?: Record<string, number>;
            reasons?: Record<string, string[]>;
          }
        | undefined;
      if (!isMountedRef.current) return;
      if (result && (result.scores || result.reasons)) {
        setAutoEval({
          scores: result.scores || {},
          reasons: result.reasons || {},
        });
      } else {
        setEvalError("未返回有效的评估结果");
      }
    } catch (err) {
      if (isMountedRef.current)
        setEvalError("自动评估失败：" + (err as Error).message);
    } finally {
      if (isMountedRef.current) setEvaluating(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!id || !company) return;
    setSaving(true);
    setEvalError(null);
    try {
      const updated: Company = {
        ...company,
        stabilityScore: manualStability,
        promotionClarity: manualPromotion,
      };
      await updateCompany(id, updated);
      setLocalCompany(updated);
      setAutoEval(null);
    } catch (err) {
      setEvalError("保存覆盖失败：" + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const getScaleLabel = (scale?: string) => {
    switch (scale) {
      case "large":
        return "大型企业";
      case "medium":
        return "中型企业";
      case "startup":
        return "初创公司";
      default:
        return scale || "未知";
    }
  };

  if (loading) {
    return <Loading message="加载公司详情..." />;
  }

  const displayCompany = (company || localCompany) as Company;

  if (error || !displayCompany) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md">
          <Text c="dimmed">{error || "公司不存在"}</Text>
          <Button onClick={() => navigate("/companies")}>返回列表</Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="xl">
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate("/companies")}
        >
          返回列表
        </Button>
        <Group>
          {!isEditing ? (
            <>
              <Button
                variant="light"
                leftSection={<IconEdit size={16} />}
                onClick={() => setIsEditing(true)}
              >
                编辑
              </Button>
              <Button
                variant="light"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={handleDelete}
              >
                删除
              </Button>
            </>
          ) : (
            <>
              <Button variant="default" onClick={() => setIsEditing(false)}>
                取消
              </Button>
              <Button onClick={handleSave} loading={saving}>
                保存
              </Button>
            </>
          )}
        </Group>
      </Group>

      <Tabs defaultValue="info">
        <Tabs.List mb="lg">
          <Tabs.Tab value="info">基本信息</Tabs.Tab>
          <Tabs.Tab value="evaluation">评估分析</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info">
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Title order={3}>{displayCompany.name}</Title>
                  <Text c="dimmed">{displayCompany.industry}</Text>
                </div>
                <Badge size="lg" color="blue" variant="light">
                  {getScaleLabel(displayCompany.scale)}
                </Badge>
              </Group>

              {isEditing ? (
                <Stack gap="md">
                  <Textarea
                    label="公司简介"
                    value={localCompany.description || ""}
                    onChange={(e) =>
                      setLocalCompany({
                        ...localCompany,
                        description: e.currentTarget.value,
                      })
                    }
                    minRows={3}
                  />
                  <NumberInput
                    label="稳定性评分"
                    min={0}
                    max={100}
                    value={localCompany.stabilityScore}
                    onChange={(val) =>
                      setLocalCompany({
                        ...localCompany,
                        stabilityScore: Number(val) || 0,
                      })
                    }
                  />
                  <NumberInput
                    label="晋升清晰度"
                    min={0}
                    max={100}
                    value={localCompany.promotionClarity}
                    onChange={(val) =>
                      setLocalCompany({
                        ...localCompany,
                        promotionClarity: Number(val) || 0,
                      })
                    }
                  />
                </Stack>
              ) : (
                <Stack gap="sm">
                  {displayCompany.description && (
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {displayCompany.description}
                    </Text>
                  )}
                  <Group gap="lg">
                    <Group gap="xs">
                      <IconMapPin size={16} />
                      <Text size="sm">
                        {displayCompany.location.city}
                        {displayCompany.location.district
                          ? ` · ${displayCompany.location.district}`
                          : ""}
                      </Text>
                    </Group>
                    {displayCompany.fundingStage && (
                      <Group gap="xs">
                        <IconCurrencyYen size={16} />
                        <Text size="sm">{displayCompany.fundingStage}</Text>
                      </Group>
                    )}
                  </Group>
                </Stack>
              )}

              <Divider />

              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    稳定性评分
                  </Text>
                  <Group gap="xs">
                    <Rating
                      value={Math.round(displayCompany.stabilityScore / 20)}
                      readOnly
                      fractions={2}
                    />
                    <Text fw={500}>{displayCompany.stabilityScore} 分</Text>
                  </Group>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    晋升清晰度
                  </Text>
                  <Group gap="xs">
                    <Rating
                      value={Math.round(displayCompany.promotionClarity / 20)}
                      readOnly
                      fractions={2}
                    />
                    <Text fw={500}>{displayCompany.promotionClarity} 分</Text>
                  </Group>
                </Grid.Col>
              </Grid>

              {displayCompany.tags.length > 0 && (
                <>
                  <Divider />
                  <Group gap="xs">
                    {displayCompany.tags.map((tag) => (
                      <Badge key={tag} variant="light" color="gray">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="evaluation">
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Title order={4}>综合评估</Title>
                  <Text c="dimmed" size="sm">
                    基于公司稳定性、晋升路径、行业前景等维度的综合评估
                  </Text>
                </div>
                <Button
                  variant="light"
                  leftSection={<IconSparkles size={16} />}
                  loading={evaluating}
                  onClick={handleAutoEvaluate}
                >
                  自动评估
                </Button>
              </Group>

              {evalError && (
                <Alert color="red" title="评估失败">
                  {evalError}
                </Alert>
              )}

              {autoEval ? (
                <Stack gap="sm">
                  <Title order={5}>自动评分结果</Title>
                  {EVAL_DIMENSIONS.map((dim) => {
                    const score = Number(autoEval.scores[dim.key]) || 0;
                    const reasons = autoEval.reasons[dim.key] || [];
                    return (
                      <div key={dim.key}>
                        <Group justify="space-between" mb={4}>
                          <Text size="sm" fw={500}>
                            {dim.label}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {score} / 100
                          </Text>
                        </Group>
                        <Progress
                          value={score}
                          color={dim.color}
                          size="lg"
                          radius="md"
                        />
                        {reasons.length > 0 && (
                          <Stack gap={2} mt={6}>
                            {reasons.map((r, i) => (
                              <Text key={i} size="xs" c="dimmed">
                                • {r}
                              </Text>
                            ))}
                          </Stack>
                        )}
                      </div>
                    );
                  })}
                </Stack>
              ) : (
                <Alert color="blue" variant="light" title="提示">
                  点击“自动评估”，由 AI 根据企业信息生成各维度评分及评分依据。
                </Alert>
              )}

              <Divider label="手工覆盖" labelPosition="center" />

              <Stack gap="sm">
                <NumberInput
                  label="稳定性评分"
                  min={0}
                  max={100}
                  value={manualStability}
                  onChange={(val) => setManualStability(Number(val) || 0)}
                />
                <NumberInput
                  label="晋升清晰度"
                  min={0}
                  max={100}
                  value={manualPromotion}
                  onChange={(val) => setManualPromotion(Number(val) || 0)}
                />
                <Group>
                  <Button
                    variant="light"
                    loading={saving}
                    onClick={handleApplyOverride}
                  >
                    应用覆盖
                  </Button>
                  <Text size="xs" c="dimmed">
                    手工评分将覆盖自动评分并保存到该公司。
                  </Text>
                </Group>
              </Stack>

              <Alert color="blue" title="建议">
                <Text size="sm">
                  该公司适合追求
                  {displayCompany.stabilityScore >= 80 ? "稳定" : "成长"}
                  发展的求职者。
                  {displayCompany.promotionClarity >= 80
                    ? "晋升路径清晰，长期发展潜力良好。"
                    : "晋升机制可能需要进一步了解。"}
                </Text>
              </Alert>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default CompanyDetail;
