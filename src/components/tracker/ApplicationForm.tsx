import React, { useState, useEffect } from "react";
import {
  Stack,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
  Grid,
  Box,
} from "@mantine/core";
import {
  IconBriefcase,
  IconBuilding,
  IconUser,
  IconMail,
  IconCalendar,
  IconNotes,
} from "@tabler/icons-react";
import { ApplicationRecord } from "../../stores/useTrackerStore";
import { JobStatus } from "../../services/ai/AIServiceAdapter";

interface ApplicationFormProps {
  application?: ApplicationRecord | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = [
  { value: JobStatus.DISCOVERED, label: "已发现" },
  { value: JobStatus.EVALUATED, label: "已评估" },
  { value: JobStatus.APPLIED, label: "已投递" },
  { value: JobStatus.PHONE_SCREEN, label: "电话面试" },
  { value: JobStatus.TECHNICAL_INTERVIEW, label: "技术面试" },
  { value: JobStatus.ONSITE, label: "现场面试" },
  { value: JobStatus.OFFER, label: "收到Offer" },
  { value: JobStatus.ACCEPTED, label: "已接受" },
  { value: JobStatus.REJECTED, label: "已拒绝" },
  { value: JobStatus.WITHDRAWN, label: "已撤回" },
];

const ApplicationForm: React.FC<ApplicationFormProps> = ({
  application,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    job_title: "",
    company: "",
    status: JobStatus.DISCOVERED as JobStatus,
    notes: "",
    contact_person: "",
    contact_email: "",
    follow_up_date: "",
  });

  useEffect(() => {
    if (application) {
      setFormData({
        job_title: application.job_title,
        company: application.company,
        status: application.status,
        notes: application.notes || "",
        contact_person: application.contact_person || "",
        contact_email: application.contact_email || "",
        follow_up_date: application.follow_up_date || "",
      });
    }
  }, [application]);

  const handleTextInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.currentTarget.value,
      }));
    };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      notes: e.currentTarget.value,
    }));
  };

  const handleStatusChange = (value: string | null) => {
    if (value) {
      setFormData((prev) => ({
        ...prev,
        status: value as JobStatus,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack gap="md">
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              required
              label="职位名称"
              placeholder="请输入职位名称"
              leftSection={<IconBriefcase size={16} />}
              value={formData.job_title}
              onChange={handleTextInputChange("job_title")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              required
              label="公司名称"
              placeholder="请输入公司名称"
              leftSection={<IconBuilding size={16} />}
              value={formData.company}
              onChange={handleTextInputChange("company")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="状态"
              placeholder="请选择状态"
              data={STATUS_OPTIONS}
              value={formData.status}
              onChange={handleStatusChange}
              allowDeselect={false}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="跟进日期"
              type="date"
              leftSection={<IconCalendar size={16} />}
              value={formData.follow_up_date}
              onChange={handleTextInputChange("follow_up_date")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="联系人"
              placeholder="请输入联系人"
              leftSection={<IconUser size={16} />}
              value={formData.contact_person}
              onChange={handleTextInputChange("contact_person")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="联系邮箱"
              placeholder="请输入联系邮箱"
              leftSection={<IconMail size={16} />}
              type="email"
              value={formData.contact_email}
              onChange={handleTextInputChange("contact_email")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label="备注"
              placeholder="请输入备注信息"
              leftSection={<IconNotes size={16} />}
              minRows={3}
              maxRows={6}
              value={formData.notes}
              onChange={handleTextareaChange}
            />
          </Grid.Col>
        </Grid>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit">{application ? "更新" : "添加"}</Button>
        </Group>
      </Stack>
    </Box>
  );
};

export default ApplicationForm;
