import React, { useState, useEffect, useMemo } from "react";
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
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconPlus,
  IconSearch,
  IconFilter,
  IconBuilding,
} from "@tabler/icons-react";
import { useCompanyStore } from "../../stores/useCompanyStore";
import type { Company, CompanyFilters } from "../../types/company";
import { INDUSTRIES } from "../../constants/company";
import Loading from "../common/Loading";

const CompanyList: React.FC = () => {
  const navigate = useNavigate();
  const companies = useCompanyStore((state) => state.companies);
  const filters = useCompanyStore((state) => state.filters);
  const setFilters = useCompanyStore((state) => state.setFilters);
  const setCompanies = useCompanyStore((state) => state.setCompanies);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    let mounted = true;
    const loadCompanies = async () => {
      setLoading(true);
      setError(null);

      try {
        if (window.electronAPI?.getCompanies) {
          const data = await window.electronAPI.getCompanies();
          if (!mounted) return;
          setCompanies(Array.isArray(data) ? (data as Company[]) : []);
        }
      } catch (err) {
        if (mounted) setError("加载公司列表失败");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCompanies();
    return () => {
      mounted = false;
    };
  }, [setCompanies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      if (filters.industry && company.industry !== filters.industry)
        return false;
      if (filters.city && company.location.city !== filters.city) return false;
      if (
        filters.minStabilityScore &&
        company.stabilityScore < filters.minStabilityScore
      )
        return false;
      return true;
    });
  }, [companies, filters]);

  const paginatedCompanies = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, page]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  // 分页越界保护：筛选后页码超出总页数时回到第 1 页
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page]);

  const handleFilterChange = (
    key: keyof CompanyFilters,
    value: string | number | undefined,
  ) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const getStabilityColor = (score: number) => {
    if (score >= 80) return "green";
    if (score >= 60) return "yellow";
    return "red";
  };

  if (loading) {
    return <Loading message="加载公司列表..." />;
  }

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            企业评估
          </Title>
          <Text c="dimmed">管理你的目标公司，了解企业稳定性和发展前景</Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate("/companies/new")}
        >
          添加公司
        </Button>
      </Group>

      {error && (
        <Alert color="red" mb="lg" title="错误">
          {error}
        </Alert>
      )}

      <Card withBorder shadow="sm" radius="md" padding="lg" mb="lg">
        <Group gap="md" wrap="wrap">
          <Select
            placeholder="筛选行业"
            data={INDUSTRIES}
            clearable
            value={filters.industry}
            onChange={(val) => handleFilterChange("industry", val || undefined)}
            style={{ minWidth: 150 }}
          />
          <TextInput
            placeholder="筛选城市"
            value={filters.city || ""}
            onChange={(e) =>
              handleFilterChange("city", e.currentTarget.value || undefined)
            }
            leftSection={<IconSearch size={16} />}
            style={{ minWidth: 150 }}
          />
          <Select
            placeholder="最低稳定性"
            data={[
              { value: "60", label: "60分以上" },
              { value: "70", label: "70分以上" },
              { value: "80", label: "80分以上" },
            ]}
            clearable
            value={filters.minStabilityScore?.toString()}
            onChange={(val) =>
              handleFilterChange(
                "minStabilityScore",
                val ? Number(val) : undefined,
              )
            }
            style={{ minWidth: 150 }}
          />
          <Button
            variant="subtle"
            leftSection={<IconFilter size={16} />}
            onClick={() => {
              setFilters({});
              setPage(1);
            }}
          >
            清除筛选
          </Button>
        </Group>
      </Card>

      {paginatedCompanies.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="md">
            <IconBuilding size={48} color="gray" />
            <Text c="dimmed">暂无公司数据</Text>
            <Button onClick={() => navigate("/companies/new")}>
              添加第一家
            </Button>
          </Stack>
        </Center>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
            {paginatedCompanies.map((company) => (
              <Card
                key={company.id}
                withBorder
                shadow="sm"
                padding="lg"
                radius="md"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate(`/companies/${company.id}`);
                  }
                }}
                style={{ cursor: "pointer", height: "100%" }}
                onClick={() => navigate(`/companies/${company.id}`)}
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={500} size="lg" lineClamp={1}>
                      {company.name}
                    </Text>
                    <Badge
                      color={
                        company.scale === "large"
                          ? "blue"
                          : company.scale === "medium"
                            ? "yellow"
                            : "gray"
                      }
                      variant="light"
                    >
                      {company.scale === "large"
                        ? "大型"
                        : company.scale === "medium"
                          ? "中型"
                          : "初创"}
                    </Badge>
                  </Group>

                  <Text size="sm" c="dimmed">
                    {company.industry} · {company.location.city}
                  </Text>

                  <Group gap="xs">
                    {company.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="light" color="gray" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>

                  <Divider my="xs" />

                  <Group justify="space-between">
                    <div>
                      <Text size="xs" c="dimmed">
                        稳定性
                      </Text>
                      <Badge
                        color={getStabilityColor(company.stabilityScore)}
                        variant="light"
                      >
                        {company.stabilityScore} 分
                      </Badge>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        晋升清晰度
                      </Text>
                      <Text fw={500} size="sm">
                        {company.promotionClarity} 分
                      </Text>
                    </div>
                  </Group>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>

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
    </Container>
  );
};

export default CompanyList;
