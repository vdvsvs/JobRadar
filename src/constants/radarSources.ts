import type { ScanConfig } from "../stores/useJobScanStore";

export type RadarSourcePreset = Omit<
  ScanConfig,
  "id" | "created_at" | "last_scanned_at"
>;

export const RADAR_SOURCE_PRESETS: RadarSourcePreset[] = [
  {
    portal_name: "国务院国资委",
    portal_type: "custom",
    url_pattern: "https://www.sasac.gov.cn",
    keywords: ["招聘", "校招"],
    is_active: true,
    scan_interval_hours: 6,
  },
  {
    portal_name: "中国人社部",
    portal_type: "custom",
    url_pattern: "https://www.mohrss.gov.cn",
    keywords: ["招聘", "就业"],
    is_active: true,
    scan_interval_hours: 6,
  },
  {
    portal_name: "企业官网",
    portal_type: "custom",
    url_pattern: "https://career.tencent.com",
    keywords: ["校园招聘", "社会招聘"],
    is_active: true,
    scan_interval_hours: 4,
  },
  {
    portal_name: "微信公众号",
    portal_type: "custom",
    url_pattern: "https://weixin.sogou.com",
    keywords: ["校招", "招聘"],
    is_active: false,
    scan_interval_hours: 3,
  },
  {
    portal_name: "国聘网",
    portal_type: "custom",
    url_pattern: "https://www.iguopin.com",
    keywords: ["Java", "后端"],
    is_active: true,
    scan_interval_hours: 1,
  },
  {
    portal_name: "Boss直聘",
    portal_type: "custom",
    url_pattern: "https://www.zhipin.com",
    keywords: ["Java", "后端"],
    is_active: true,
    scan_interval_hours: 1,
  },
  {
    portal_name: "前程无忧",
    portal_type: "custom",
    url_pattern: "https://www.51job.com",
    keywords: ["Java", "后端"],
    is_active: true,
    scan_interval_hours: 1,
  },
  {
    portal_name: "智联招聘",
    portal_type: "custom",
    url_pattern: "https://www.zhaopin.com",
    keywords: ["Java", "后端"],
    is_active: true,
    scan_interval_hours: 1,
  },
];
