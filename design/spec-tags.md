# 实现规格：构筑围绕标签（设计线程）

用户 2026-10-23 02:45：“独特装备适用范围都太窄了，应该是投射物+、范围+、弹射+这种 tag 式的”“不光是独特装备，是整个 bd 体系应该是围绕着 tag 的”。03:09：“你自己 review 吧，没问题就开始实现”。
给用户看的方案：Claude Doc “独特装备标签化” https://claude.ai/artifact/NGXU78Jd35NRB7xDKjvDXW

## 原则
- 流派 = 标签组合 + 自己的外形（形态由核心符文和武器决定）。有多强，由通用标签属性决定。
- 所有词条、符文、天赋、大天赋、独特装备的文字和生效条件只写标签（投射物 Projectile、范围 AoE、弹射 ProjectileCanChain、穿透、近战 Melee、持续 DoT/cont、陷阱 Mine、持续施放 = 会叠层的技能），不点名流派或某把武器的 form/wander。
- 武器上的独特装备照旧绑定底子（它就是那把武器）。

## 1. 流派机制吃通用属性（40_stats / 50_combat）
| 现在 | 改成 |
|---|---|
| 游雷数量 `W.sparkN`（符文 sparkN + P.raw.sparkAdd + 雷冠 crownAdd） | 一次放出的颗数 = 符文 sparkN × (1 + W.extra)。也就是通用“投射物 +N”（W.extra，含 Multiple 类符文、词条）直接按倍数加串。去掉 sparkAdd 的专门结算 |
| 游雷弹射 `W.sparkChain`（符文、P.raw.sparkChain、TA.sparkChain、crownChain） | 用通用 `W.chain`：连锁符文、链电天赋（TA.chain）、独特装备的 chain 都生效。游雷符文的 sparkChain 改成符文 fx.chain。弹射的伤害、范围、寿命（chainMul / chainR / chainLife）照旧 |
| 旋风判定半径 whirlR = W.rng × (1 + 层×rngPer) × 风暴之眼 | 再乘 (1 + 范围提高%)，范围提高 = 符文 aoeInc + 新的全局 `aoeInc`（词条、天赋、独特）。这样“范围 +%”对旋风、圣钟、陷阱、火罐都生效 |
| 小旋风（旋风之心） | 算投射物：每次甩出 1 + W.extra 个；速度 × (1 + projSpd%)；存在时间 × (1 + 持续时间%)；同屏上限 devilMax × (1 + W.extra) |
| 游雷 life、小旋风 devilLife、法师火圈以外的玩家地面效果（毒云、火痕等） | × (1 + 持续时间%)。新全局属性 `durInc`（持续时间提高%） |
| 旋势层数上限词条 SpinCap | 保留，文字改成“【持续施放】叠层上限 +#” |

性能：游雷同屏上限 `spark.maxAlive` = 160（超过时不再生成新的，最老的先消失）。

## 2. 大天赋
- 旋风之心 `whirlHeart`：生效条件从 `form === 'orbit'` 改成“武器同时有 Melee 和 AoE 标签”。文字写“【近战·范围】……”。
- 织雷之心 `sparkHeart`：生效条件从 `b.wander` 改成“武器有 ProjectileCanChain 标签”。效果：这类武器伤害 ×heartMore（1.8），每弹射一次伤害 +`chainStepInc` 15%（叠加）；代价不变（其他武器 ×offhandMul）。文字写“【投射物·弹射】……”。
- 雷链 / 链电等原本就按 chain 写的，不动。

## 3. 词条（mechanics.json 的 whirl.affixes / spark.affixes）
- `SparkAdd`（游雷数量 +#）→ 文字“投射物 +#”，stat 改成 `extra`（全局，对有 Projectile 标签的武器生效）。id 不变，老存档继续用。
- `SparkChain`（游雷弹射 +#）→ 文字“弹射 +#”，stat 改成 `chain`（全局，对有 ProjectileCanChain 标签的武器生效）。id 不变。
- 新词条放在 mechanics.defense.affixes 同格式的新段 `tags.affixes`（由设计线程写数据）：`IncreasedArea` 范围提高 #%（aoeInc，全局）、`IncreasedDuration` 持续时间提高 #%（durInc，全局）。程序只要在 10_data.js 里合并 `tags.affixes`，并在 40_stats 里汇总 aoeInc / durInc 两个全局 stat。

## 4. 独特装备（uniques.json + 16_uniques.js，规则文字放 rules.json）
| 独特 | 新规则（rule key） |
|---|---|
| 风暴之眼 StormEye | `areaEye`：【范围】范围提高 25%；你的范围伤害命中时，把命中点 pullR 倍半径内的普通怪往命中点拉（旋风的命中点就是角色，所以和现在一样）。代价 `projLess` 30：投射物伤害总降 30%。去掉 spinDecay |
| 雷冠 StormCrown | `chainCrown`：【弹射】弹射 +1；每弹一次这一下伤害 +15%；被弹到的敌人感电（沿用分叉规则：第一次打中感电的敌人时分叉 forkN 颗）。代价 armorLess 15 保留 |
| 百骨冠（新，core，PhantomCore 底） | `projCrown`：【投射物】投射物 +2；投射物伤害总降 25% |
| 永燃冠（新，core，NebulaCore 底） | `durCrown`：【持续】持续时间提高 50%；范围提高 −15% |
| 碎颅冠（新，core，TitaniumCore 底） | `meleeCrown`：【近战】近战命中 25% 几率再结算一次；移速 −10% |
- 三件新的 req 20，w 40，不限天梯。名字、图标走地窖题材。数值写进 rules.json，设计线程会调。

## 5. 天赋树
天赋小点和大天赋里写着流派名字的文字全部改成标签写法（导雷 sparkChain 节点改成 chain）。程序改完把清单发回来，设计线程复核。

## 6. 模拟
- sim.js / bis.js 的 --build spark 和 --build whirl 照旧可用（做装偏好仍按 craftPref，改成新的词条 id）。
- 改完跑 90 / 600 分钟，seeds 分批 1,2,3 / 4,5,6，三种 build（whirl / spark / random），交回设计线程调数。目标：旋风斩和游雷推层差距 10% 以内，都明显高于乱配；新独特装备在模拟里至少对两个流派是正收益（bis 比较戴 / 不戴）。
