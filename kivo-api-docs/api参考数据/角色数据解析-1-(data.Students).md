根据你的要求，已对数据完成**TypeScript 类型提取**以及 JSON 数据的**长文本截断与数组抽样精简**处理。

---

### 一、 TypeScript 类型声明

```typescript
/**
 * 基础属性数值
 */
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

/**
 * 技能各等级效果描述与消耗
 */
export interface SkillInfo {
  cost: number;
  describe: string;
}

/**
 * 技能详情
 */
export interface Skill {
  derived_skills: any[];
  icon: string;
  info: SkillInfo[];
  is_passive_skill: boolean;
  link_student_id: number;
  max_level: number;
  preview: string;
  title: string;
  title_cn: string;
}

/**
 * 角色技能组
 */
export interface CharacterSkills {
  ex_skill: Skill[];
  passive_skill: Skill[];
}

/**
 * 专武强化等级节点信息
 */
export interface WeaponInfo {
  description: string;
  title: string;
}

/**
 * 专武/固有武器信息
 */
export interface Weapon {
  description: string;
  description_cn: string;
  icon: string;
  info: WeaponInfo[];
  name: string;
  name_cn: string;
  skill: Skill[];
}

/**
 * 角色战斗与培养数据
 */
export interface CharacterData {
  attack_attribute: string;
  basic: BasicStat[];
  battlefield_position: string;
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

/**
 * 图集相册
 */
export interface GalleryItem {
  images: string[];
  title: string;
}

/**
 * 礼物喜好数据
 */
export interface GiftData {
  favorability: number;
  id: number;
}

/**
 * 语音文本与音频资源
 */
export interface VoiceItem {
  category: string;
  description: string;
  file: string;
  text: string;
  text_original: string;
}

/**
 * 角色完整主档案 (Root Object)
 */
export interface CharacterProfile {
  age: number;
  avatar: string;
  birthday: string;
  body_shape: string;
  character_datas: CharacterData[];
  character_voice: string;
  character_voice_cn: string;
  contributor: any[];
  designer: string;
  family_name: string;
  family_name_cn: string;
  family_name_en: string;
  family_name_jp: string;
  family_name_kr: string;
  family_name_zh_tw: string;
  furniture: any | null;
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
  recollection_lobby_image: string;
  relation: number[];
  release_date: string;
  release_date_cn: string;
  release_date_global: string;
  school: number;
  sd_model_image: string;
  show_list: boolean;
  skin: string;
  skin_cn: string;
  skin_jp: string;
  skin_zh_tw: string;
  source: any[];
  special_appearance: boolean;
  spine: number[];
  voice: VoiceItem[];
  voice_cn: VoiceItem[];
  voice_kr: VoiceItem[];
  voice_pause_icon: string;
  voice_play_icon: string;
  weapon_type: string;
}
```

---

### 二、 脱水与精简后的 JSON 数据

```json
{
  "age": 15,
  "avatar": "",
  "birthday": "04-16",
  "body_shape": "Small",
  "character_datas": [
    {
      "attack_attribute": "Explosive",
      "basic": [
        {
          "accuracy": 923,
          "attack": 254,
          "cc_power": 100,
          "cc_res": 100,
          "crit": 205,
          "crit_dmg": 2,
          "crit_dmg_res": 0.5,
          "crit_res": 100,
          "defense": 24,
          "evasion": 194,
          "healing": 2530,
          "mag_count": 5,
          "max_hp": 2729,
          "range": 750,
          "recovery_boost": 1,
          "stability": 1948
        }
      ],
      "battlefield_position": "STRIKER",
      "character_id": 10020,
      "combat_style": "default",
      "cultivate_material": [
        40,
        46,
        48
      ],
      "defensive_attributes": "Heavy",
      "dev_name": "Koharu_default",
      "equipment": [
        4,
        6,
        7
      ],
      "favorite_equipment": 0,
      "indoor_adaptability": "B",
      "is_groupc_control": false,
      "limited": false,
      "outdoor_adaptability": "S",
      "rarity": 3,
      "skill": {
        "ex_skill": [
          {
            "derived_skills": [],
            "icon": "images/students/下江 小...[文本长度 69]",
            "info": [
              {
                "cost": 3,
                "describe": "令圆形范围内的我方单位回复治疗力101%...[文本长度 47]"
              },
              {
                "cost": 3,
                "describe": "令圆形范围内的我方单位回复治疗力116%...[文本长度 47]"
              },
              {
                "cost": 3,
                "describe": "令圆形范围内的我方单位回复治疗力147%...[文本长度 47]"
              }
            ],
            "is_passive_skill": false,
            "link_student_id": 0,
            "max_level": 5,
            "preview": "videos/students/下江 小...[文本长度 72]",
            "title": "神圣手榴弹",
            "title_cn": "神圣手榴弹"
          }
        ],
        "passive_skill": [
          {
            "derived_skills": [],
            "icon": "images/students/下江 小...[文本长度 69]",
            "info": [
              {
                "cost": 1,
                "describe": "令1名除自身外当前生命值低于50%的我方...[文本长度 43]"
              },
              {
                "cost": 1,
                "describe": "令1名除自身外当前生命值低于50%的我方...[文本长度 43]"
              },
              {
                "cost": 1,
                "describe": "令1名除自身外当前生命值低于50%的我方...[文本长度 43]"
              }
            ],
            "is_passive_skill": true,
            "link_student_id": 0,
            "max_level": 10,
            "preview": "",
            "title": "我、我会治疗你的！",
            "title_cn": "我来治疗！"
          },
          {
            "derived_skills": [],
            "icon": "images/students/下江 小...[文本长度 69]",
            "info": [
              {
                "cost": 1,
                "describe": "攻击力 提升14%"
              },
              {
                "cost": 1,
                "describe": "攻击力 提升14.7%"
              },
              {
                "cost": 1,
                "describe": "攻击力 提升15.4%"
              }
            ],
            "is_passive_skill": true,
            "link_student_id": 0,
            "max_level": 10,
            "preview": "",
            "title": "我已经在努力了！",
            "title_cn": "我也是很努力的！"
          },
          {
            "derived_skills": [],
            "icon": "images/students/下江 小...[文本长度 69]",
            "info": [
              {
                "cost": 1,
                "describe": "每30秒， 治疗力 提升21.5%(持续20秒)"
              },
              {
                "cost": 1,
                "describe": "每30秒， 治疗力 提升22.6%(持续20秒)"
              },
              {
                "cost": 1,
                "describe": "每30秒， 治疗力 提升23.7%(持续20秒)"
              }
            ],
            "is_passive_skill": true,
            "link_student_id": 0,
            "max_level": 10,
            "preview": "",
            "title": "因为是精英",
            "title_cn": "我可是精英！"
          }
        ]
      },
      "street_adaptability": "D",
      "team_position": "BACK",
      "type": "Healer",
      "weapons": {
        "description": "小春所使用的狙击步枪。<br>武器名称是...[文本长度 36]",
        "description_cn": "小春使用的狙击步枪。<br>枪名是小春还在正义实现部时起的。",
        "icon": "images/students/下江 小...[文本长度 38]",
        "info": [
          {
            "description": "无",
            "title": "无"
          },
          {
            "description": "「我已经在努力了！」升级为「我已经在努力了！+」",
            "title": "固有武器最大等级 Lv.30 → Lv....[文本长度 32]"
          },
          {
            "description": "在室外地形造成1.3倍伤害。处于掩体掩护...[文本长度 49]",
            "title": "固有武器最大等級 Lv.40 → Lv....[文本长度 45]"
          }
        ],
        "name": "Justice Black",
        "name_cn": "黑色正义",
        "skill": [
          {
            "derived_skills": [],
            "icon": "images/students/下江 小...[文本长度 69]",
            "info": [
              {
                "cost": 1,
                "describe": "攻击力 提升250/ 攻击力 提升14%"
              },
              {
                "cost": 1,
                "describe": "攻击力 提升263/ 攻击力 提升14.7%"
              },
              {
                "cost": 1,
                "describe": "攻击力 提升275/ 攻击力 提升15.4%"
              }
            ],
            "is_passive_skill": true,
            "link_student_id": 0,
            "max_level": 10,
            "preview": "",
            "title": "我已经在努力了！+",
            "title_cn": "我也是很努力的！+"
          }
        ]
      }
    }
  ],
  "character_voice": "赤尾光",
  "character_voice_cn": "小鱼干",
  "contributor": [],
  "designer": "DoReMi",
  "family_name": "下江",
  "family_name_cn": "下江",
  "family_name_en": "Shimoe",
  "family_name_jp": "下江",
  "family_name_kr": "시모에",
  "family_name_zh_tw": "下江",
  "furniture": null,
  "gallery": [
    {
      "images": [
        "images/students/下江 小...[文本长度 59]",
        "images/students/下江 小...[文本长度 59]",
        "images/students/下江 小...[文本长度 59]"
      ],
      "title": "初始立绘差分"
    },
    {
      "images": [
        "images/students/下江 小...[文本长度 60]",
        "images/students/下江 小...[文本长度 58]",
        "images/students/下江 小...[文本长度 58]"
      ],
      "title": "角色图像"
    }
  ],
  "gift_data": [
    {
      "favorability": 180,
      "id": 85
    },
    {
      "favorability": 60,
      "id": 271
    },
    {
      "favorability": 60,
      "id": 17
    }
  ],
  "given_name": "小春",
  "given_name_cn": "小春",
  "given_name_en": "Koharu",
  "given_name_jp": "コハル",
  "given_name_kr": "코하루",
  "given_name_zh_tw": "小春",
  "grade": "一年生",
  "height": 148,
  "hobby": "空想、妄想、收集色情杂志",
  "illustrator": "DoReMi",
  "introduction": "圣三一综合学园所属，补习部的一员。\n\n原...[文本长度 156]",
  "introduction_cn": "崔尼蒂补习部的一员。\n\n原本属于正义实现...[文本长度 128]",
  "is_install": true,
  "is_install_cn": true,
  "is_install_global": true,
  "is_npc": false,
  "main_relation": 14,
  "model": [
    45,
    408
  ],
  "momo_talk_signature": "禁止色色！！！",
  "more": "# 杂项趣闻\n\n## 钢桶蟹与裙子\n20...[文本长度 4764]",
  "nick_name": "",
  "recollection_lobby_image": "",
  "relation": [
    8,
    6,
    8
  ],
  "release_date": "2021-06-10",
  "release_date_cn": "2023-10-12",
  "release_date_global": "2022-02-08",
  "school": 2,
  "sd_model_image": "",
  "show_list": true,
  "skin": "",
  "skin_cn": "",
  "skin_jp": "",
  "skin_zh_tw": "",
  "source": [],
  "special_appearance": true,
  "spine": [
    334,
    491,
    1671
  ],
  "voice": [
    {
      "category": "lobby",
      "description": "Koharu_Title.ogg",
      "file": "voices/students/下江 小...[文本长度 58]",
      "text": "蔚蓝档案",
      "text_original": "ブルーアーカイブ。"
    },
    {
      "category": "battle",
      "description": "Koharu_Battle_Buffed_1.ogg",
      "file": "voices/students/下江 小...[文本长度 58]",
      "text": "OK!",
      "text_original": "OK!"
    },
    {
      "category": "battle",
      "description": "Koharu_Battle_BuffSelf_1.ogg",
      "file": "voices/students/下江 小...[文本长度 58]",
      "text": "要上了！",
      "text_original": "行くわよ！"
    }
  ],
  "voice_cn": [
    {
      "category": "battle",
      "description": "koharu_battle_in_1",
      "file": "voices/students/下江 小...[文本长度 58]",
      "text": "来，我们走吧。",
      "text_original": ""
    },
    {
      "category": "battle",
      "description": "koharu_battle_in_2",
      "file": "voices/students/下江 小...[文本长度 58]",
      "text": "出发！",
      "text_original": ""
    },
    {
      "category": "battle",
      "description": "koharu_battle_move_1",
      "file": "voices/students/下江 小...[文本长度 58]",
      "text": "很轻松吧！",
      "text_original": ""
    }
  ],
  "voice_kr": [
    {
      "category": "battle",
      "description": "koharu_battle_covered_1",
      "file": "voices/students/下江 小...[文本长度 58]",
      "text": "",
      "text_original": ""
    },
    {
      "category": "battle",
      "description": "koharu_battle_damage_1",
      "file": "voices/students/下江 小...[文本长度 57]",
      "text": "",
      "text_original": ""
    },
    {
      "category": "battle",
      "description": "koharu_battle_damage_2",
      "file": "voices/students/下江 小...[文本长度 57]",
      "text": "",
      "text_original": ""
    }
  ],
  "voice_pause_icon": "",
  "voice_play_icon": "",
  "weapon_type": "SR"
}
```