import React, { useState, useEffect, useRef } from "react";
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
  Alert,
  Table,
  ActionIcon,
  Tooltip,
  Tabs,
  Badge,
  FileInput,
  Modal,
  Progress,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconUpload,
  IconTrash,
  IconRefresh,
  IconDatabase,
  IconFile,
  IconCheck,
} from "@tabler/icons-react";
import type { DataSource } from "../../types/crawler";
import Loading from "../common/Loading";

const DataSourceManager: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "bing" as DataSource["type"],
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    loadDataSources();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadDataSources = async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getDataSources) {
        const data = await window.electronAPI.getDataSources();
        setDataSources(data as DataSource[]);
      }
    } catch (err) {
      setError("加载数据源列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const dataSource: DataSource = {
        id: Date.now().toString(),
        name: form.name,
        type: form.type,
        config: {},
        createdAt: new Date().toISOString(),
      };

      if (window.electronAPI?.saveDataSource) {
        await window.electronAPI.saveDataSource(dataSource);
      }

      setDataSources((prev) => [...prev, dataSource]);
      setForm({ name: "", type: "bing" });
      setSaved(true);
      setTimeout(() => {
        if (mountedRef.current) setSaved(false);
      }, 3000);
    } catch (err) {
      setError("保存数据源失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个数据源吗？")) return;
    try {
      if (window.electronAPI?.deleteDataSource) {
        await window.electronAPI.deleteDataSource(id);
      }
      setDataSources((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError("删除数据源失败");
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setError(null);

    try {
      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setImportProgress(Math.round((e.loaded / e.total) * 50));
        }
      };

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const format = file.name.endsWith(".json")
            ? "json"
            : file.name.endsWith(".csv")
              ? "csv"
              : null;

          if (!format) {
            throw new Error("不支持的文件格式");
          }

          setImportProgress(60);

          // 使用正确的 IPC：crawler:import（importData），将原始文本交由后端解析 JSON/CSV
          if (window.electronAPI?.importData) {
            const result = await window.electronAPI.importData(format, content);

            if (result?.success) {
              setImportProgress(100);
              setSaved(true);
              setTimeout(() => {
                if (!mountedRef.current) return;
                setImportModalOpen(false);
                setImportProgress(0);
                loadDataSources();
              }, 1000);
            } else {
              setError("导入失败");
            }
          } else {
            setError("导入功能不可用");
          }
        } catch (err) {
          setError("解析文件失败");
        } finally {
          setImporting(false);
        }
      };

      reader.onerror = () => {
        setError("读取文件失败");
        setImporting(false);
      };

      reader.readAsText(file);
    } catch (err) {
      setError("读取文件失败");
      setImporting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "bing":
        return "Bing 搜索";
      case "serpapi":
        return "SerpApi";
      case "custom":
        return "自定义";
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bing":
        return "blue";
      case "serpapi":
        return "green";
      case "custom":
        return "orange";
      default:
        return "gray";
    }
  };

  if (loading && dataSources.length === 0) {
    return <Loading message="加载数据源..." />;
  }

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            数据源管理
          </Title>
          <Text c="dimmed">
            管理和配置数据采集来源，支持 API、脚本和文件导入
          </Text>
        </div>
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate("/settings/api")}
        >
          返回设置
        </Button>
      </Group>

      {error && (
        <Alert color="red" mb="lg" title="错误">
          {error}
        </Alert>
      )}

      {saved && (
        <Alert
          color="green"
          mb="lg"
          title="成功"
          icon={<IconCheck size={16} />}
        >
          操作成功
        </Alert>
      )}

      <Tabs defaultValue="list">
        <Tabs.List mb="lg">
          <Tabs.Tab value="list">数据源列表</Tabs.Tab>
          <Tabs.Tab value="import">导入数据</Tabs.Tab>
          <Tabs.Tab value="add">添加数据源</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="list">
          <Card withBorder shadow="sm" radius="md" padding="lg">
            {dataSources.length === 0 ? (
              <Stack align="center" gap="md" py="xl">
                <IconDatabase size={48} color="gray" />
                <Text c="dimmed">暂无数据源</Text>
                <Group>
                  <Button onClick={() => setImportModalOpen(true)}>
                    导入数据
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>名称</Table.Th>
                    <Table.Th>类型</Table.Th>
                    <Table.Th>创建时间</Table.Th>
                    <Table.Th>操作</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {dataSources.map((source) => (
                    <Table.Tr key={source.id}>
                      <Table.Td>
                        <Group gap="xs">
                          <IconFile size={16} />
                          {source.name}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={getTypeColor(source.type)}
                          variant="light"
                        >
                          {getTypeLabel(source.type)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {new Date(source.createdAt).toLocaleDateString("zh-CN")}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="刷新">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={loadDataSources}
                            >
                              <IconRefresh size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="删除">
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => handleDelete(source.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="import">
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Stack gap="md">
              <Title order={4}>导入数据</Title>
              <Text size="sm" c="dimmed">
                支持 JSON 和 CSV 格式的数据文件导入
              </Text>

              <FileInput
                label="选择文件"
                placeholder="点击选择文件"
                accept=".json,.csv"
                onChange={handleImport}
                leftSection={<IconUpload size={16} />}
              />

              <Alert color="blue" title="格式说明">
                <Text size="sm">
                  JSON 格式: 对象数组，每个对象包含公司信息字段
                  <br />
                  CSV 格式: 第一行为表头，后续为数据行
                </Text>
              </Alert>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="add">
          <form onSubmit={handleSave}>
            <Card withBorder shadow="sm" radius="md" padding="lg">
              <Stack gap="md">
                <Title order={4}>添加数据源</Title>

                <TextInput
                  label="数据源名称"
                  placeholder="例如：BOSS直聘 API"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.currentTarget.value })
                  }
                  required
                />

                <Select
                  label="类型"
                  placeholder="请选择类型"
                  data={[
                    { value: "bing", label: "Bing 搜索" },
                    { value: "serpapi", label: "SerpApi" },
                    { value: "custom", label: "自定义" },
                  ]}
                  value={form.type}
                  onChange={(val) =>
                    val && setForm({ ...form, type: val as DataSource["type"] })
                  }
                />

                <Group justify="flex-end">
                  <Button type="submit" loading={loading}>
                    保存
                  </Button>
                </Group>
              </Stack>
            </Card>
          </form>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportProgress(0);
        }}
        title="导入数据"
        centered
      >
        <Stack gap="md">
          <FileInput
            label="选择文件"
            placeholder="点击选择文件"
            accept=".json,.csv"
            onChange={handleImport}
            disabled={importing}
          />
          {importing && (
            <div>
              <Text size="sm" mb="xs">
                导入中...
              </Text>
              <Progress value={importProgress} animated />
            </div>
          )}
        </Stack>
      </Modal>
    </Container>
  );
};

export default DataSourceManager;
