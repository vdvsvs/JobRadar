import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Tabs,
  Paper,
  TextInput,
  Select,
  Table,
  Badge,
  ActionIcon,
  Modal,
  Tooltip,
  SimpleGrid,
  Stack,
  Box,
  Pagination,
  Alert,
  Center,
} from "@mantine/core";
import {
  IconPlus,
  IconDownload,
  IconList,
  IconLayoutKanban,
  IconClock,
  IconEye,
  IconEdit,
  IconTrash,
  IconFilter,
} from "@tabler/icons-react";
import {
  useTrackerStore,
  ApplicationRecord,
} from "../../stores/useTrackerStore";
import { JobStatus, STATUS_FLOW } from "../../services/ai/AIServiceAdapter";
import ApplicationDetail from "./ApplicationDetail";
import ApplicationForm from "./ApplicationForm";
import KanbanView from "./KanbanView";
import TimelineView from "./TimelineView";
import StatsDashboard from "./StatsDashboard";

const ROWS_PER_PAGE = 10;

const ApplicationTracker: React.FC = () => {
  const {
    applications,
    currentApplication,
    viewMode,
    filters,
    addApplication,
    updateApplication,
    deleteApplication,
    setCurrentApplication,
    updateStatus,
    setViewMode,
    setFilters,
    clearFilters,
    getFilteredApplications,
    loadFromBackend,
    getStats,
    exportToCSV,
  } = useTrackerStore();

  const [activeTab, setActiveTab] = useState<string | null>("applications");
  const [openForm, setOpenForm] = useState(false);
  const [editingApplication, setEditingApplication] =
    useState<ApplicationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  const handleAddApplication = () => {
    setEditingApplication(null);
    setOpenForm(true);
  };

  const handleEditApplication = (application: ApplicationRecord) => {
    setEditingApplication(application);
    setOpenForm(true);
  };

  const handleDeleteApplication = async (id: string) => {
    if (window.confirm("确定要删除这条申请记录吗？")) {
      try {
        deleteApplication(id);
      } catch (err) {
        setError("删除失败");
      }
    }
  };

  const handleSaveApplication = (data: any) => {
    try {
      if (editingApplication) {
        updateApplication(editingApplication.id, data);
      } else {
        addApplication(data);
      }
      setOpenForm(false);
      setEditingApplication(null);
    } catch (err) {
      setError("保存失败");
    }
  };

  const handleStatusChange = (id: string, newStatus: JobStatus) => {
    try {
      updateStatus(id, newStatus);
    } catch (err) {
      setError("状态更新失败");
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = exportToCSV();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `applications_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    } catch (err) {
      setError("导出失败");
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ [key]: value || undefined });
  };

  const filteredApplications = getFilteredApplications();
  const stats = getStats();

  const getStatusColor = (status: JobStatus): string => {
    const colors: Record<string, string> = {
      [JobStatus.DISCOVERED]: "gray",
      [JobStatus.EVALUATED]: "blue",
      [JobStatus.APPLIED]: "orange",
      [JobStatus.PHONE_SCREEN]: "violet",
      [JobStatus.TECHNICAL_INTERVIEW]: "indigo",
      [JobStatus.ONSITE]: "cyan",
      [JobStatus.OFFER]: "green",
      [JobStatus.ACCEPTED]: "lime",
      [JobStatus.REJECTED]: "red",
      [JobStatus.WITHDRAWN]: "brown",
    };
    return colors[status] || "gray";
  };

  const getStatusLabel = (status: JobStatus): string => {
    const labels: Record<string, string> = {
      [JobStatus.DISCOVERED]: "已发现",
      [JobStatus.EVALUATED]: "已评估",
      [JobStatus.APPLIED]: "已投递",
      [JobStatus.PHONE_SCREEN]: "电话面试",
      [JobStatus.TECHNICAL_INTERVIEW]: "技术面试",
      [JobStatus.ONSITE]: "现场面试",
      [JobStatus.OFFER]: "收到Offer",
      [JobStatus.ACCEPTED]: "已接受",
      [JobStatus.REJECTED]: "已拒绝",
      [JobStatus.WITHDRAWN]: "已撤回",
    };
    return labels[status] || status;
  };

  const statusSelectData = [
    { value: "", label: "全部" },
    ...Object.values(JobStatus).map((status) => ({
      value: status,
      label: getStatusLabel(status),
    })),
  ];

  // 分页计算
  const totalFiltered = filteredApplications.length;
  const totalPages = Math.ceil(totalFiltered / ROWS_PER_PAGE);
  const paginatedApplications = filteredApplications.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  // 列表视图表格行
  const rows = paginatedApplications.map((app) => (
    <Table.Tr key={app.id}>
      <Table.Td>{app.job_title}</Table.Td>
      <Table.Td>{app.company}</Table.Td>
      <Table.Td>
        <Badge color={getStatusColor(app.status)} variant="light">
          {getStatusLabel(app.status)}
        </Badge>
      </Table.Td>
      <Table.Td>{new Date(app.created_at).toLocaleDateString()}</Table.Td>
      <Table.Td>{new Date(app.updated_at).toLocaleDateString()}</Table.Td>
      <Table.Td>
        <Group gap={4}>
          <Tooltip label="查看详情">
            <ActionIcon
              variant="subtle"
              color="blue"
              size="sm"
              onClick={() => setCurrentApplication(app)}
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="编辑">
            <ActionIcon
              variant="subtle"
              color="yellow"
              size="sm"
              onClick={() => handleEditApplication(app)}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="删除">
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={() => handleDeleteApplication(app.id)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container fluid p="md">
      {error && (
        <Alert
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="applications">申请列表</Tabs.Tab>
          <Tabs.Tab value="stats">统计仪表板</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="applications" pt="md">
          {/* 顶部操作栏 */}
          <Group justify="space-between" mb="md">
            <Group>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleAddApplication}
              >
                添加申请
              </Button>
              <Button
                variant="outline"
                leftSection={<IconDownload size={16} />}
                onClick={handleExportCSV}
              >
                导出CSV
              </Button>
            </Group>

            <Group gap={4}>
              <Tooltip label="列表视图">
                <ActionIcon
                  variant={viewMode === "list" ? "filled" : "subtle"}
                  color={viewMode === "list" ? "blue" : "gray"}
                  onClick={() => setViewMode("list")}
                >
                  <IconList size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="看板视图">
                <ActionIcon
                  variant={viewMode === "kanban" ? "filled" : "subtle"}
                  color={viewMode === "kanban" ? "blue" : "gray"}
                  onClick={() => setViewMode("kanban")}
                >
                  <IconLayoutKanban size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="时间线视图">
                <ActionIcon
                  variant={viewMode === "timeline" ? "filled" : "subtle"}
                  color={viewMode === "timeline" ? "blue" : "gray"}
                  onClick={() => setViewMode("timeline")}
                >
                  <IconClock size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* 筛选器 */}
          <Paper withBorder p="md" mb="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Select
                label="状态"
                placeholder="选择状态"
                data={statusSelectData}
                value={filters.status || ""}
                onChange={(value) => handleFilterChange("status", value)}
                clearable
              />
              <TextInput
                label="公司"
                placeholder="输入公司名称"
                value={filters.company || ""}
                onChange={(e) =>
                  handleFilterChange("company", e.currentTarget.value)
                }
              />
              <Box pt={24}>
                <Button
                  variant="outline"
                  leftSection={<IconFilter size={16} />}
                  onClick={clearFilters}
                >
                  清除筛选
                </Button>
              </Box>
            </SimpleGrid>
          </Paper>

          {/* 视图内容 */}
          {viewMode === "list" && (
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>职位</Table.Th>
                    <Table.Th>公司</Table.Th>
                    <Table.Th>状态</Table.Th>
                    <Table.Th>投递时间</Table.Th>
                    <Table.Th>最后更新</Table.Th>
                    <Table.Th>操作</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.length > 0 ? (
                    rows
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Center py="xl">
                          <Text c="dimmed">暂无申请记录</Text>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>

              {totalPages > 1 && (
                <Group justify="center" py="md">
                  <Pagination
                    total={totalPages}
                    value={page}
                    onChange={setPage}
                    size="sm"
                  />
                </Group>
              )}
            </Paper>
          )}

          {viewMode === "kanban" && (
            <KanbanView
              applications={filteredApplications}
              onStatusChange={handleStatusChange}
              onView={setCurrentApplication}
              onEdit={handleEditApplication}
              onDelete={handleDeleteApplication}
            />
          )}

          {viewMode === "timeline" && (
            <TimelineView
              applications={filteredApplications}
              onView={setCurrentApplication}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="stats" pt="md">
          <StatsDashboard stats={stats} />
        </Tabs.Panel>
      </Tabs>

      {/* 添加/编辑申请对话框 */}
      <Modal
        opened={openForm}
        onClose={() => setOpenForm(false)}
        title={editingApplication ? "编辑申请" : "添加申请"}
        size="lg"
        centered
      >
        <ApplicationForm
          application={editingApplication}
          onSave={handleSaveApplication}
          onCancel={() => setOpenForm(false)}
        />
      </Modal>

      {/* 申请详情对话框 */}
      <Modal
        opened={!!currentApplication}
        onClose={() => setCurrentApplication(null)}
        title="申请详情"
        size="lg"
        centered
      >
        {currentApplication && (
          <ApplicationDetail
            application={currentApplication}
            onStatusChange={handleStatusChange}
            onClose={() => setCurrentApplication(null)}
          />
        )}
      </Modal>
    </Container>
  );
};

export default ApplicationTracker;
