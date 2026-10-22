# 实现规格：防御改成 护盾 / 生命 / 护甲 三条分工（设计线程）

用户 2026-10-22 14:24：“护甲应该改成护盾，bd 倾向走秒回，血量的回复走吸血，护甲应该是负责减伤。”
之前用户还说过：防御端不够丰富，相当于只有血量（14:22）；吸血太超模，可以完全放弃防御端（14:18）。
对用户的说明在 Claude Doc “防御端设计”（https://claude.ai/artifact/HxCnTAa3ibypP758n26m75），这里写的是给程序的规格。

## 1. 三条
| 名字 | 是什么 | 怎么回 |
|---|---|---|
| 护盾 | 第一道血条（合并原来的灵障） | 每秒回复，挨打也照常回复（不再有挨打后停 2 秒的设定） |
| 生命 | 第二道血条，归零就阵亡 | 推关和天梯里不自然回复；只靠吸血和打掉守关 Boss；回营地回满 |
| 护甲 | 只是减伤数值，不再是血条 | — |

## 2. 受伤结算顺序（hurtPlayer）
闪避 → 抗性 → 护甲减伤 → 流派减伤（近战守势、旋势减伤、现有天赋的承伤降低）→ 护盾 → 生命。
- 护甲减伤 = 护甲 / (护甲 + `defense.armorK` × 这一下的伤害)，最多 `defense.armorCap`%。初值 armorK 5，armorCap 85。
  举例：护甲 300 时，挨 30 点减 67%，挨 100 点减 38%，挨 300 点减 17%。效果是克怪海碎伤，对重击作用小。
- 护盾吸收在先，剩下的扣生命。生命 ≤ 0 阵亡。
- 紧急撤回和“最低血量”的统计都改成看生命比例（RUN.descent.minHp、returnHp、returnHpNow、melee retreat、lightRetreat 都看生命）。

## 3. 数值 key
progression.player：
- `life` 100，`lifePerLevel` 3（每升一级生命上限 +3）
- `shield` 40（基础护盾上限）
- `shieldRegenPct` 8（每秒回护盾上限的 8%）
- 原来的 `armor` 100 改成 0（护甲现在是减伤，基础为 0）；原 `deflectRate` 删除

mechanics.defense：
- `armorK` 5，`armorCap` 85
- `leechHitCap` 3、`leechCapPct` 4 沿用，但现在回的是生命，上限按生命上限算
- `bossKillLife` 15：打掉守关 Boss（推关每层、天梯）回 15% 生命
- `deflectDelay` 删除

## 4. 旧的东西怎么归位
| 原来 | 现在 |
|---|---|
| 装备底子 armor、FlatArmor、IncreasedArmor、质量的护甲加成（massArmor）| 护甲（减伤）|
| 装备底子 deflect、FlatDeflectorShield、IncreasedDeflectorShield、能量的灵障加成 | 护盾上限 |
| 复骨力场 Resilience（armorRegen：每秒回护甲上限 %）| 护盾每秒回复 +%（在 shieldRegenPct 上加）|
| 吸髓符文 ArmorOnHit、GearArmorOnHit 词条、旋身符文 armorOnHit | 命中回生命（吸血）。文字改成“命中时回复 # 点生命” |
| 灵障相关的天赋和规则（absorb、martyr 等）| 改成作用在护盾上 |
| 天赋和独特里写“护甲”的效果 | 程序列一张清单发回设计线程，由设计线程逐条定归位。默认：按护甲值计算的效果（荆棘、闪避尖刺这类）继续用护甲值；“护甲 −X%”这类代价改成护盾 −X% |

## 5. 新词条（放在 mechanics.defense.affixes，格式同 whirl.affixes，在 10_data.js 一起合并）
- `FlatLife`：“+# 生命”，P，on core/engine/shield，tiers 同 FlatArmor（4–10 … 81–120）
- `IncreasedLife`：“生命提高 #%”，P，on core/hub/shield，tiers 同 IncreasedArmor（5–10 … 51–70）
- `ShieldRegen`：“护盾每秒回复 #”，S，on core/engine/hub，tiers [1,3] 1000 ilvl1；[4,6] 800 ilvl10；[7,10] 400 ilvl25；[11,16] 200 ilvl45；[17,24] 100 ilvl70
加进掉落池，旋风斩 craftPref 由设计线程改。

## 6. 画面
左边血球：红色是生命，外面一圈白蓝色是护盾。提示里写生命、护盾、护盾每秒回复、护甲和对当前层普通怪一下伤害的减伤%。
吸血封顶的说明照旧。

## 7. 模拟
- sim / bis 的有效生命改成：(生命 + 护盾 + 护盾回复 × 5) ÷ (1 − 对当前层普通怪一下伤害的总减伤)。
- 做完后先跑 3 个种子确认没崩，然后交回设计线程。设计线程负责调数，目标：
  1. 90 分钟旋风斩推层明显高于乱配，600 分钟前沿阵亡每小时不超过 2 次。
  2. 拆层测试：成型装备去掉任意一层（护甲、护盾回复、吸血），推层下降 15% 以上。
