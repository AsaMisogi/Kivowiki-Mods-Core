# KivoWiki 数据模型

字段是基于实测响应和工作区样本归纳的 TypeScript 草案。接口可能返回额外字段；生产代码应允许未知字段存在。可空字段使用 `| null`，但服务端也可能用空字符串表示“没有资源”。

## 通用类型

```ts
export interface ApiEnvelope<T = unknown> {
  code?: number;
  codename?: string;
  data?: T;
  message?: string;
  success: boolean;
  time?: number;
  version?: string;
}

export interface Paginated<T> {
  max_page: number;
  [resourceKey: string]: T[] | number | Record<string, number> | null;
}

export type ResourceUrl = string;
export type UnixSeconds = number;
```

## 角色列表项

```ts
export interface StudentListItem {
  id: number;
  skin: string;
  skin_jp: string;
  skin_cn: string;
  skin_zh_tw: string;
  family_name: string;
  given_name: string;
  family_name_jp: string;
  given_name_jp: string;
  family_name_cn: string;
  given_name_cn: string;
  avatar: ResourceUrl;
  school: number;
  main_relation: number;
}
```

## 角色详情

```ts
export interface BasicStat {
  accuracy: number;
  attack: number;
  cc_power: number;
  cc_res: number;
  crit: number;
  crit_dmg: number;
  crit_dmg_res: number;
  crit_res: number;
  defense: number;
  evasion: number;
  healing: number;
  mag_count: number;
  max_hp: number;
  range: number;
  recovery_boost: number;
  stability: number;
}

export interface SkillLevelInfo {
  cost: number;
  describe: string;
}

export interface Skill {
  derived_skills: unknown[];
  icon: ResourceUrl;
  info: SkillLevelInfo[];
  is_passive_skill: boolean;
  link_student_id: number;
  max_level: number;
  preview: ResourceUrl;
  title: string;
  title_cn: string;
}

export interface CharacterSkills {
  ex_skill: Skill[];
  passive_skill: Skill[];
}

export interface WeaponInfo {
  description: string;
  title: string;
}

export interface Weapon {
  description: string;
  description_cn: string;
  icon: ResourceUrl;
  info: WeaponInfo[];
  name: string;
  name_cn: string;
  skill: Skill[];
}

export interface CharacterData {
  attack_attribute: string;
  basic: BasicStat[];
  battlefield_position: 'STRIKER' | 'SPECIAL' | string;
  character_id: number;
  combat_style: string;
  cultivate_material: number[];
  defensive_attributes: string;
  dev_name: string;
  equipment: number[];
  favorite_equipment: number;
  indoor_adaptability: string;
  is_groupc_control: boolean;
  limited: boolean;
  outdoor_adaptability: string;
  rarity: number;
  skill: CharacterSkills;
  street_adaptability: string;
  team_position: string;
  type: string;
  weapons: Weapon;
}

export interface GalleryItem {
  images: ResourceUrl[];
  title: string;
}

export interface GiftData {
  favorability: number;
  id: number;
}

export interface VoiceItem {
  category: string;
  description: string;
  file: ResourceUrl;
  text: string;
  text_original: string;
}

export interface CharacterProfile {
  age: number;
  avatar: ResourceUrl;
  birthday: string;
  body_shape: string;
  character_datas: CharacterData[];
  character_voice: string;
  character_voice_cn: string;
  contributor: unknown[];
  designer: string;
  family_name: string;
  family_name_cn: string;
  family_name_en: string;
  family_name_jp: string;
  family_name_kr: string;
  family_name_zh_tw: string;
  furniture: unknown | null;
  gallery: GalleryItem[];
  gift_data: GiftData[];
  given_name: string;
  given_name_cn: string;
  given_name_en: string;
  given_name_jp: string;
  given_name_kr: string;
  given_name_zh_tw: string;
  grade: string;
  height: number;
  hobby: string;
  illustrator: string;
  introduction: string;
  introduction_cn: string;
  is_install: boolean;
  is_install_cn: boolean;
  is_install_global: boolean;
  is_npc: boolean;
  main_relation: number;
  model: number[];
  momo_talk_signature: string;
  more: string;
  nick_name: string;
  recollection_lobby_image: ResourceUrl;
  relation: number[];
  release_date: string;
  release_date_cn: string;
  release_date_global: string;
  school: number;
  sd_model_image: ResourceUrl;
  show_list: boolean;
  skin: string;
  skin_cn: string;
  skin_jp: string;
  skin_zh_tw: string;
  source: unknown[];
  special_appearance: boolean;
  spine: number[];
  voice: VoiceItem[];
  voice_cn: VoiceItem[];
  voice_kr: VoiceItem[];
  voice_pause_icon: ResourceUrl;
  voice_play_icon: ResourceUrl;
  weapon_type: string;
}
```

注意：历史样本中出现过 `is_groupc_control` 这一疑似拼写错误；列表过滤器使用的是 `is_group_control`。读取详情时应兼容服务端原始字段，不要在反序列化时静默丢弃它。

## 学校、关系和物品

```ts
export interface School {
  id: number;
  name: string;
  name_cn: string;
  description: string;
  logo: ResourceUrl;
  preview_image: ResourceUrl;
  map: unknown[];
  related: number[];
  students?: StudentListItem[];
  declare_uuid?: string;
}

export interface Relation {
  id: number;
  name: string;
  name_cn: string;
  image: ResourceUrl;
  description: string;
  filter_whitelist: unknown[];
  main_students?: unknown[] | null;
  secondary_students?: unknown[] | null;
}

export interface Item {
  id: number;
  type: string;
  icon: ResourceUrl;
  rarity: number;
  name: string;
  description: string;
  article_id: number;
  gift?: { students: unknown[] | null };
  furniture?: { comfort: number; students: unknown[] | null };
}
```

## 内容和媒体

```ts
export interface ArticleListItem {
  id: number;
  title: string;
  cover: ResourceUrl;
  state: number;
  summary: string;
  created_at: UnixSeconds;
  updated_at: UnixSeconds;
}

export interface Article extends ArticleListItem {
  body: string;
  declare_uuid?: string;
  enable_supplementary?: boolean;
  supplementary_uuid?: string;
}

export interface News {
  id: number;
  title: string;
  image: ResourceUrl;
  body?: string;
  url: string;
}

export interface Music {
  id: number;
  title: string;
  cover: ResourceUrl;
  author: string;
  album: string;
  use: string;
  original_file_name: string;
  introduction?: string;
  file?: ResourceUrl;
  lrc_file?: ResourceUrl;
}

export interface ComicChapterSummary {
  id: number;
  title: string;
  source: string | null;
}

export interface Comic {
  id: number;
  title: string;
  author: string;
  cover: ResourceUrl;
  type: string;
  introduction?: string;
  chapter?: ComicChapterSummary[];
}

export interface ComicImage {
  id: number;
  pagen_number: number;
  file: ResourceUrl;
}

export interface ComicChapter extends ComicChapterSummary {
  images: ComicImage[];
}

export interface GalleryImage {
  image: ResourceUrl;
  introduction: string;
}

export interface GalleryCategory {
  name: string;
  introduction: string;
  images: GalleryImage[];
}

export interface Gallery {
  id: number;
  title: string;
  introduction: string;
  categorys: GalleryCategory[];
}

export interface TimelineEvent {
  id: number;
  line_type: string;
  title: string;
  image: ResourceUrl;
  body_summary?: string;
  body?: string;
  type: string;
  url: string;
  start_time: UnixSeconds;
  end_time: UnixSeconds;
  created_at?: UnixSeconds;
  updated_at?: UnixSeconds;
}

export interface Bulletin {
  id: number;
  title: string;
  body?: string;
  created_at: UnixSeconds;
  updated_at: UnixSeconds;
}
```

## 资源和快捷数据

```ts
export interface Model {
  id: number;
  name: string;
  type: string;
  model_file: ResourceUrl;
  mtl_file: ResourceUrl;
  texture: ResourceUrl[];
}

export interface Spine {
  id: number;
  name: string;
  remark: string;
  type: string;
  skel_file: ResourceUrl;
  atlas_file: ResourceUrl;
  images: ResourceUrl[];
}

export interface ServerSchedule {
  start_date: UnixSeconds;
  end_date: UnixSeconds;
  banner: ResourceUrl;
}

export interface LuckyItem {
  type: string;
  id: number;
}

export interface Statistics {
  users_number: number;
  pictures_number: number;
  students_number: number;
}
```
