# 游雷（电球）流派：照流放之路 2 的电球做

用户 2026-10-23：先调研流放 2 的电球构筑，再给本项目加一个电球构筑。
数值和规则放在 mechanics.json 的 `spark`；名字和文字是原创的地窖题材（“游雷”“织雷之心”“雷冠”）。

## 参考：流放之路 2 的电球（Spark）
- 技能本体（poe2wiki Spark）：施法 0.7 秒；每次施放放出 4–9 颗电球（宝石 1–20 级）；电球贴地乱窜，持续 2 秒；同一次施放的电球每 0.66 秒最多打同一个敌人一次；可以边走边放。品质加弹速。冰灌注下变成 12–16 颗的环形。
- 升华：织风者（Stormweaver）。核心是“二度打击”（同一个敌人可叠两层感电，感电效果降低 25%），另有 Constant Gale、Force of Will、Tempest Caller、Storm's Recollection。
- 感电：受到的伤害 +20%。Overcharge 辅助：感电效果 +50%。
- 常用辅助：Efficiency、Projectile Acceleration、Pinpoint Critical、Deliberation、Arc on Critical；外加 Archmage、Orb of Storms（曝露）、火墙 / 冰霜炸弹做灌注。
- 装备：前期法杖，后期法杖换成短杖 + 法器；堆魔力和能量护盾，后期上混沌免疫（Chaos Inoculation）。
- 来源：
  - https://www.poe2wiki.net/wiki/Spark
  - https://www.poe2wiki.net/wiki/Stormweaver
  - https://www.poe2wiki.net/wiki/Shock
  - https://www.poe2wiki.net/wiki/Overcharge
  - rpgstash 0.3 电球织风者攻略、mobalytics 电球织风者构筑、pobarchives 上的电球 PoB

## 我们的版本
**底子**：雷灵（Zapper）。它本来就是 form proj + wander 的闪电弹，正好对应电球。

**三次形态跃迁**

| 阶段 | 来源 | 画面 | 机制 |
|---|---|---|---|
| 0 雷灵 | 雷灵武器 | 单颗游走的电弹 | 原样 |
| 1 游雷 | 游雷符文（Spark，武器槽，要投射物标签，需求 6 级） | 每次出手朝目标扇形放出一串乱窜的游雷 | 每串 4 颗起（符文每级 +4），每颗伤害 = 单发 × sparkMul（1.0–1.3），持续 2 秒，基础穿透 2，同一串对同一敌人每 0.66 秒最多打一次；每次出手耗 0.15 灯火 |
| 2 织雷 | 织雷之心（大型天赋，雷殛分支第一团，原“超导”位置） | 游雷更亮，感电在怪群里传开 | 雷灵伤害 ×2.2；游雷命中叠 2 层感电（对应“二度打击”）；感电的敌人死亡时把感电传给附近敌人（沿用超导）。代价：其他武器 ×0.5，非元素伤害总降 15% |
| 3 雷冠 | 独特头冠雷冠（需求 20 级，只在天梯 20 层以后掉） | 满屏游雷，碰到感电的敌人分叉 | 游雷 +3 颗、多飘 1 秒；游雷第一次打中感电的敌人时分叉成 2 颗（×0.6，分叉不再分叉）；感电效果 +20–40%（对应 Overcharge），护甲总降 15% |

**词条**：新增“游雷数量 +#”（sparkAdd，武器 / 核心，三档 1/2/3），对应宝石等级加电球数量。

**运动**：速度 = 武器弹速 × 0.7；每秒随机偏转最多 4 弧度；60 像素内有敌人时每秒拐 5 弧度过去；撞到场地边界反弹。

**资源**：每次出手固定扣灯火（对应法力消耗），命中不回。魂火词条就是资源端。

**防御**：沿用远程的距离和护盾，没有专门的减伤。所以电球的阵亡比旋风少，灯灭比旋风多，这是两种玩法的取舍。

## 数值和模拟（design/sim/spark1，3 个种子的中位数）
| 构筑 | 90 分钟 推层 / 天梯 | 600 分钟 推层 / 天梯 | 600 分钟 灯灭 / 阵亡 |
|---|---|---|---|
| 游雷 spark | 29 / 28 | 49 / 55 | 76 / 38 |
| 旋风 whirl | 30 / 33 | 50 / 59 | 32 / 93 |
| 随机 random | 24 / 25 | 43 / 45 | 55 / 56 |

成型上限（bis-spark.txt）：物品等级 30 / 70 / 100 时，天梯分别是 40 / 49 / 63 层，每串 10 / 17 / 18 颗游雷。
目标是略低于旋风、明显高于随机，现在达到了。调参记录：sparkMul 0.35–0.5 时只有 18 / 19 层，调到 1.0–1.3，同时 heartMore 1.6→2.2、soulPerCast 0.25→0.15。

## 怎么测
- `python3 tools/build.py`，然后 `node tools/sim.js --build spark --seeds 1,2,3 --minutes 90 --tree auto --craft auto`
- `node tools/bis.js --build spark`
- 截图：mockups/spark-v1-field.png、spark-v1-field2.png
