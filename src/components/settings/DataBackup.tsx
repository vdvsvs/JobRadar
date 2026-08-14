import React, { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Group,
  Card,
  Alert,
  FileInput,
  Divider,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconDownload,
  IconUpload,
  IconCheck,
  IconX,
  IconDatabase,
} from "@tabler/icons-react";

const DataBackup: React.FC = () => {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportingSettings, setExportingSettings] = useState(false);
  const [importingSettings, setImportingSettings] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      if (window.electronAPI?.exportData) {
        const result = await window.electronAPI.exportData();
        if (result.success) {
          setSuccess(`数据已导出到: ${result.path}`);
        } else {
          setError("导出已取消");
        }
      } else {
        setError("导出功能不可用");
      }
    } catch (err) {
      setError("导出失败: " + (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setError("请选择要导入的文件");
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);

      if (window.electronAPI?.importDataBackup) {
        const result = await window.electronAPI.importDataBackup(data);
        if (result.success) {
          setSuccess(`成功导入 ${result.count} 条数据`);
          setImportFile(null);
        } else {
          setError("导入失败");
        }
      } else {
        setError("导入功能不可用");
      }
    } catch (err) {
      setError("导入失败: 文件格式错误或数据损坏");
    } finally {
      setImporting(false);
    }
  };

  const handleSettingsExport = async () => {
    setExportingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      if (window.electronAPI?.exportSettings) {
        const result = await window.electronAPI.exportSettings();
        if (result.success) {
          setSuccess(`设置已导出到: ${result.path}`);
        } else {
          setError("导出已取消");
        }
      } else {
        setError("设置导出功能不可用");
      }
    } catch (err) {
      setError("设置导出失败: " + (err as Error).message);
    } finally {
      setExportingSettings(false);
    }
  };

  const handleSettingsImport = async () => {
    setImportingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      if (window.electronAPI?.importSettings) {
        const result = await window.electronAPI.importSettings();
        if (result.success) {
          setSuccess("设置导入成功");
        } else {
          setError("导入已取消");
        }
      } else {
        setError("设置导入功能不可用");
      }
    } catch (err) {
      setError("设置导入失败: " + (err as Error).message);
    } finally {
      setImportingSettings(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            数据备份与恢复
          </Title>
          <Text c="dimmed">导出和导入您的数据和设置，防止数据丢失</Text>
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
        <Alert color="red" mb="lg" title="错误" icon={<IconX size={16} />}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          color="green"
          mb="lg"
          title="成功"
          icon={<IconCheck size={16} />}
        >
          {success}
        </Alert>
      )}

      <Stack gap="lg">
        {/* 数据备份 */}
        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Group gap="md" mb="md">
            <IconDatabase size={28} color="blue" />
            <div>
              <Title order={4}>数据备份</Title>
              <Text size="sm" c="dimmed">
                导出所有公司数据、评估结果和推荐记录
              </Text>
            </div>
          </Group>

          <Text size="sm" mb="md">
            导出的数据包含：公司信息、评估结果、推荐记录、数据源配置
          </Text>

          <Group>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleExport}
              loading={exporting}
              disabled={exporting}
            >
              导出数据
            </Button>
          </Group>
        </Card>

        {/* 数据恢复 */}
        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Group gap="md" mb="md">
            <IconUpload size={28} color="green" />
            <div>
              <Title order={4}>数据恢复</Title>
              <Text size="sm" c="dimmed">
                从备份文件恢复数据
              </Text>
            </div>
          </Group>

          <Text size="sm" mb="md">
            选择之前导出的 JSON 备份文件进行数据恢复
          </Text>

          <Stack gap="md">
            <FileInput
              label="选择备份文件"
              placeholder="点击选择 JSON 文件"
              accept=".json"
              value={importFile}
              onChange={setImportFile}
              leftSection={<IconUpload size={16} />}
            />

            <Group>
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={handleImport}
                loading={importing}
                disabled={!importFile || importing}
              >
                导入数据
              </Button>
            </Group>
          </Stack>
        </Card>

        <Divider label="设置备份" labelPosition="center" />

        {/* 设置备份 */}
        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Group gap="md" mb="md">
            <IconDatabase size={28} color="orange" />
            <div>
              <Title order={4}>设置备份</Title>
              <Text size="sm" c="dimmed">
                导出和导入应用设置（API Key、AI 配置等）
              </Text>
            </div>
          </Group>

          <Group>
            <Button
              variant="outline"
              leftSection={<IconDownload size={16} />}
              onClick={handleSettingsExport}
              loading={exportingSettings}
              disabled={exportingSettings}
            >
              导出设置
            </Button>
            <Button
              variant="outline"
              leftSection={<IconUpload size={16} />}
              onClick={handleSettingsImport}
              loading={importingSettings}
              disabled={importingSettings}
            >
              导入设置
            </Button>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
};

export default DataBackup;
