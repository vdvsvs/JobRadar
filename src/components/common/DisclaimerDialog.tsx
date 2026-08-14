import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  Checkbox,
  Alert,
  Divider,
  ScrollArea,
  Box,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconShieldCheck,
  IconInfoCircle,
  IconKey,
  IconBrain,
} from "@tabler/icons-react";

const DISCLAIMER_ACCEPTED_KEY = "career-assistant-disclaimer-accepted-v1";
const DISCLAIMER_REOPEN_EVENT = "career-assistant:reopen-disclaimer";

interface DisclaimerDialogProps {
  /** 受控模式：由父组件管理打开状态 */
  opened?: boolean;
  /** 确认回调 */
  onAccept?: () => void;
  /** 取消回调 */
  onClose?: () => void;
}

/**
 * 免责公告弹窗
 *
 * 用户首次启动应用时弹出，要求确认已了解：
 * 1. 个人使用声明（仅供学习研究，不得商业用途）
 * 2. API Key 与 URL 配置提示（密钥本地存储，注意安全）
 * 3. 风控安全提示（爬虫/OCR 抓取可能触发网站风控）
 *
 * 确认后写入 localStorage，后续启动不再弹出（可在设置页重置）。
 */
export const hasAcceptedDisclaimer = (): boolean => {
  try {
    return localStorage.getItem(DISCLAIMER_ACCEPTED_KEY) === "true";
  } catch {
    return false;
  }
};

export const resetDisclaimer = (): void => {
  try {
    localStorage.removeItem(DISCLAIMER_ACCEPTED_KEY);
  } catch {
    // ignore
  }
};

/** 从任意页面触发重新打开免责公告（通过全局事件） */
export const reopenDisclaimer = (): void => {
  window.dispatchEvent(new CustomEvent(DISCLAIMER_REOPEN_EVENT));
};

const DisclaimerDialog: React.FC<DisclaimerDialogProps> = ({
  opened,
  onAccept,
  onClose,
}) => {
  // 初始化：非受控模式（opened === undefined）时，首次启动未确认则自动弹
  const [internalOpened, setInternalOpened] = useState(() => {
    if (opened === undefined) {
      return !hasAcceptedDisclaimer();
    }
    return opened;
  });
  const [checks, setChecks] = useState({
    personalUse: false,
    apiKeySafety: false,
    riskControl: false,
  });

  // 受控模式：同步父组件 opened
  useEffect(() => {
    if (opened !== undefined) {
      setInternalOpened(opened);
    }
  }, [opened]);

  // 监听全局重新打开事件（从设置页触发）
  useEffect(() => {
    const handler = () => setInternalOpened(true);
    window.addEventListener(DISCLAIMER_REOPEN_EVENT, handler);
    return () => window.removeEventListener(DISCLAIMER_REOPEN_EVENT, handler);
  }, []);

  const allChecked =
    checks.personalUse && checks.apiKeySafety && checks.riskControl;

  const handleAccept = () => {
    if (!allChecked) return;
    try {
      localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "true");
    } catch {
      // ignore
    }
    setInternalOpened(false);
    onAccept?.();
  };

  const handleClose = () => {
    setInternalOpened(false);
    onClose?.();
  };

  return (
    <Modal
      opened={internalOpened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <IconAlertTriangle size={24} color="var(--mantine-color-orange-6)" />
          <Text fw={700} size="lg">
            使用前公告 - 请仔细阅读
          </Text>
        </Group>
      }
      size="lg"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <ScrollArea.Autosize mah={400}>
        <Stack gap="md">
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            title="重要声明"
          >
            本软件为开源项目，仅供<strong>个人学习与研究</strong>
            使用。使用本软件即表示你已知晓并接受以下所有条款。
          </Alert>

          <Box>
            <Group gap="sm" mb="xs">
              <IconInfoCircle size={18} color="var(--mantine-color-blue-6)" />
              <Text fw={600}>一、个人使用声明</Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              1.
              本软件面向大学生求职辅助场景，提供职业评估、简历管理、职位抓取、智能推荐等功能。
              <br />
              2. 软件本身免费开源，<strong>不得用于任何商业用途</strong>
              ，不得转售或捆绑销售。
              <br />
              3.
              用户应自行承担使用本软件产生的一切后果，开发者不对任何直接或间接损失负责。
              <br />
              4. 软件提供的评估结果和推荐建议仅供参考，不构成专业职业咨询意见。
            </Text>
          </Box>

          <Divider />

          <Box>
            <Group gap="sm" mb="xs">
              <IconKey size={18} color="var(--mantine-color-green-6)" />
              <Text fw={600}>二、API Key 与 URL 配置提示</Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              1. 使用 AI 功能需自行配置第三方 AI 服务商的 API Key 和 Base
              URL（如 DeepSeek、OpenAI、智谱等）。
              <br />
              2. API Key 会以<strong>加密形式存储在本地</strong>（electron-store
              加密），不会上传到任何服务器。
              <br />
              3. 请妥善保管你的 API
              Key，切勿泄露给他人。如怀疑泄露，请立即在服务商后台重置。
              <br />
              4. 调用第三方 API 产生的费用由用户自行承担，开发者不承担任何 API
              调用费用。
              <br />
              5. 请确保填入的 Base URL 正确无误，错误的 URL 会导致 AI
              功能无法使用。
            </Text>
          </Box>

          <Divider />

          <Box>
            <Group gap="sm" mb="xs">
              <IconShieldCheck
                size={18}
                color="var(--mantine-color-orange-6)"
              />
              <Text fw={600}>三、风控安全提示</Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              1. 本软件的"职位获取"功能通过<strong>视觉 OCR 抓取</strong>
              识别招聘网页截图中的职位信息。
              <br />
              2. 该功能会打开内嵌浏览器加载招聘网站页面，
              <strong>可能触发招聘网站的风控机制</strong>
              （如验证码、账号封禁等）。
              <br />
              3. 请勿频繁或批量抓取，建议遵守目标网站的 robots.txt 和服务条款。
              <br />
              4. 抓取的内容仅用于个人求职参考，
              <strong>不得再分发或用于商业用途</strong>。<br />
              5. 如因抓取行为导致账号被封禁或其他纠纷，由用户自行承担后果。
              <br />
              6.
              软件已内置招聘网站域名白名单（zhipin/liepin/51job/lagou），仅允许访问已知招聘网站。
            </Text>
          </Box>

          <Alert
            color="blue"
            variant="light"
            icon={<IconBrain size={18} />}
            title="AI 分析说明"
          >
            软件中的 AI
            洞察、公司评估、职位推荐等功能由第三方大语言模型生成，可能存在不准确或偏见性内容，请理性参考。
          </Alert>

          <Divider label="请逐项确认" labelPosition="center" />

          <Stack gap="sm">
            <Checkbox
              label="我已阅读并理解「个人使用声明」，了解本软件仅供个人学习研究使用"
              checked={checks.personalUse}
              onChange={(e) =>
                setChecks({ ...checks, personalUse: e.currentTarget.checked })
              }
            />
            <Checkbox
              label="我已阅读并理解「API Key 配置提示」，了解密钥本地加密存储及费用自理"
              checked={checks.apiKeySafety}
              onChange={(e) =>
                setChecks({ ...checks, apiKeySafety: e.currentTarget.checked })
              }
            />
            <Checkbox
              label="我已阅读并理解「风控安全提示」，了解抓取行为可能触发风控并自行承担后果"
              checked={checks.riskControl}
              onChange={(e) =>
                setChecks({ ...checks, riskControl: e.currentTarget.checked })
              }
            />
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={handleClose}>
              暂不使用
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!allChecked}
              leftSection={<IconShieldCheck size={16} />}
            >
              我已了解全部内容，确认使用
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
};

export default DisclaimerDialog;
