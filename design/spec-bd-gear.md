# 详细规格：四个新流派、寒霜元素、流派装备与毕业节奏（设计线程）

2026-10-23 · 状态：**只是文档，未开工**。用户说“开工”之前，不改 data，也不交给程序。
用户 15:34：“改完出详细文档和数值然后提交”。

给用户看的两份稿：
- 流派名单与标签：https://claude.ai/artifact/NmfEoUwGUvKjDQamU4yd5U（副本 bd-roster.md）
- 流派装备与毕业体验：https://claude.ai/artifact/6W2K43DqNeg2rSUbXHeCgG（副本 bd-gear-endgame.md）

相关规格：
- spec-tags.md：标签体系。
- spec-pierce-chain.md：穿透、弹射（已按 10-24 定稿实现）。
> **2026-10-24 用户定稿（覆盖本文旧写法）**：投射物有寿命（游雷 3.5 秒，吃持续时间 / 投射物持续时间，弹速决定飞多远）；**穿透**是布尔，有就无限穿透（同一敌人有重复命中间隔）；**弹射**是投射物碰当前屏幕边反弹的次数，每次耗 1；没有单独的“反弹”属性，穿透和弹射不互斥、也没有弹射换伤害；闪电链类仍在敌人之间**连锁**；“投射物 +N”直接加颗数（游雷颗数 = 符文 sparkN + 投射物）。详见 spec-pierce-chain.md。

- spec-defense-v2.md：护盾、护甲、生命。

**约定**
- 下文的数值都是第一版，要用模拟调。
- 词条档位格式同 astro.json：`[[数值], 权重, 最低物品等级, 最高物品等级]`。
- 像素单位是游戏内像素（480×270 画面）。
- “原作单位”指 astro.json 里的 range / aoe。

---

## 1. 寒霜元素（用户 15:19 选定）

| 项 | 值 |
|---|---|
| key | `cold` |
| 名字 | 寒霜 |
| 颜色 | `#9fe3ff` |
| 位置 | ELEM 第六个：`['kin','exp','pla','ele','nuc','cold']` |

### 异常：冰缓 → 冻结（写进 mechanics.json `ailments`）

| key | 值 | 说明 |
|---|---|---|
| `chillPer` | 4 | 每层冰缓：移速、攻速 −4% |
| `chillMax` | 10 | 最多 10 层，也就是 −40% |
| `chillDur` | 2 | 秒。每次叠层刷新 |
| `freezeDur` | 1.0 | 秒。叠满 10 层就冻结：不能移动、不能攻击、不能放重击（已在蓄力的重击取消） |
| `freezeBossMul` | 0.3 | 精英和 Boss 的冻结时间 ×0.3 |
| `freezeImmune` | 4 | 秒。冻结结束后这么久不能再被冻结，层数清零 |

- 武器的 `ail_cold` 是每次命中叠 1 层冰缓的几率，规则同其他元素的 `ail_*`。
- “冰缓效果提高%”同时乘在每层的减速和冻结时间上。

### 抗性和伤害词条
格式和档位分别照抄同类的物理词条：

| 新词条 | 照抄 |
|---|---|
| `ColdResistance` | KineticResistance |
| `MaxColdResistance` | MaxKineticResistance |
| `FlatColdDamage` | FlatPlasmaDamage |
| `IncreasedColdDamage` | IncreasedPlasmaDamage |
| `MoreColdDamage`（chipE） | MorePlasmaDamage |
| `ChipColdResistance` | 其他元素的 chip 版 |

“元素”合并类的词条（Thermal：元素伤害、元素抗性）把寒霜算进去：额外获得的元素伤害从三等分改成四等分（火、圣光、闪电、寒霜）。

### 其他
- **怪物**：新增 `wraith` 霜魂，远程，el cold，属性同 archer，minL 12。弹打中叠 2 层冰缓，否则寒霜抗性没有意义。
- **法阵底子**：新增 `FrostNexus` 寒霜法阵（res cold，req 12，w 250），名字和图标走地窖题材。
- **天赋盘**：元素环加一格“寒霜”。等天赋盘重排时一起定，这里先不排。

---

## 2. 新的通用属性

新流派需要的通用属性。都是全局 stat，在 40_stats 汇总：

| stat | 含义 | 谁吃 |
|---|---|---|
| `delayInc` | 延迟伤害提高% | 有 `Delayed` 标签的命中 |
| `delayAdd` | 延迟 +秒 | 延迟类技能的预警时间 |
| `spawnAdd` | 派生 +N | 每次派生多出 N 个 |
| `projSlow` | 投射物速度降低% | 所有投射物的速度 × (1 − projSlow%)，下限 ×0.2。对寒魄球是收益（见 §4.3） |
| `frozenTaken` | 冻结的敌人受到的伤害提高% | 打冻结敌人时，进伤害的“提高”池 |
| `chainStep` | 每次弹射伤害 +% | 通用版的 chainStepInc，和织雷之心、雷冠叠加（相加） |
| `shieldDmg` | 盾牌伤害提高% | 有 `Shield` 标签的伤害 |
| `block` | 格挡% | 盾在手上时（没扔出去），护甲 × (1 + block%) |
| `ailEff:cold` 等 | 某元素异常效果提高% | 冰缓、感电、灼烧、疫病、碎骨、余震、致盲各一个 |
| `critChance` | 暴击率提高% | 已有 stat，新增头冠来源 |

**新标签**（astro.json 武器 tags 里用）：
- `Delayed`：延迟。
- `Nova`：新星，属于 AoE 的子类，也带 AoE。
- `Spawn`：派生。
- `Shield`：盾。

---

## 3. 词条改版（部位分工）

### 3.1 抗性收拢
- 物理、火焰、圣光、闪电、瘟疫、寒霜的抗性和抗性上限，`on` 改成只有 `["hub","shield"]`，去掉 core 和 engine。
- 法阵的抗性档位权重 ×1.5，弥补来源变少。

### 3.2 新词条

`on` 是能出现的部位。`tag` 是只对带该标签的武器生效，没写就是全局。

| id | 文字 | stat | P/S | on | tag | 档位 |
|---|---|---|---|---|---|---|
| ProjDamage | 投射物伤害提高 #% | dmg:proj inc | P | weapon, core | Projectile | [[8,14],1000,1] [[15,24],700,15] [[25,36],400,35] [[37,50],150,65] |
| AreaDamage2 | 范围伤害提高 #% | dmg:aoe inc | P | weapon, core | AoE | 同上 |
| MeleeDamage | 近战伤害提高 #% | dmg:melee inc | P | weapon, core | Melee | 同上 |
| DelayDamage | 延迟伤害提高 #% | delayInc | S | weapon, core | Delayed | [[10,18],1000,10] [[19,30],600,30] [[31,45],250,60] |
| SpawnAdd | 派生 +# | spawnAdd | S | weapon | Spawn | [[1],1000,20] [[2],300,55] |
| ProjSlow | 投射物速度降低 #% | projSlow | S | weapon, core | Projectile | [[8,14],1000,6] [[15,24],600,25] [[25,35],250,50] |
| FrozenTaken | 冻结的敌人受到的伤害提高 #% | frozenTaken | S | core, hub | — | [[10,18],1000,12] [[19,30],600,30] [[31,45],250,60] |
| ChainStep | 每次弹射伤害 +#% | chainStep | S | core | — | [[3,5],1000,10] [[6,8],500,35] [[9,12],200,65] |
| ShieldDamage | 盾牌伤害提高 #% | shieldDmg | P | shield | — | [[10,20],1000,1] [[21,35],700,20] [[36,55],350,45] [[56,80],120,70] |
| Block | 格挡 #%（盾在手上时护甲提高） | block | S | shield | — | [[5,10],1000,1] [[11,18],600,20] [[19,28],250,50] |
| CoreCrit | 暴击率提高 #% | critChance | P | core | — | [[10,20],1000,1] [[21,35],600,25] [[36,55],250,55] |
| MoveSpeed | 移动速度提高 #% | moveInc | P | engine | — | [[4,7],1000,1] [[8,12],600,20] [[13,18],250,50] |
| LampBurnLess | 灯火燃烧降低 #% | burnLess | S | engine | — | [[4,7],1000,5] [[8,12],600,25] [[13,18],250,55] |
| LampOnKill | 击杀回灯火 +#% | soulKillInc | S | engine | — | [[10,20],1000,5] [[21,35],500,30] [[36,50],200,60] |
| AilEffect | （元素）异常效果提高 #% | ailEff:el | S | hub | — | [[10,18],1000,6] [[19,30],600,25] [[31,45],250,55]。七个元素各一族，同族互斥 |
| ElemPen | （元素）穿抗 #% | pen:el | P | hub | — | [[3,5],1000,15] [[6,9],500,40] [[10,14],200,65] |

### 3.3 已有词条的调整

| 词条 | 调整 |
|---|---|
| SparkAdd（投射物 +#） | `on` 不变，仍然是武器和头冠。投射物 +1 依旧是高价值词条 |
| SparkChain（弹射 +#，碰屏幕边反弹次数，见 spec-pierce-chain.md） | 不变；`on` weapon、core。不再另加 GearChain，弹射只有这一族 |
| IncreasedArea / IncreasedDuration | 不变 |

### 3.4 空词条清理（老存档按 id 映射）

| 旧 | 新 |
|---|---|
| FlatMass | FlatLife |
| FlatTime | IncreasedDuration |
| DashDamage | MoveSpeed |
| DashRecharge | LampBurnLess |
| MinionMod、IncreasedMinionDamage、IncreasedMinionAttackSpeed | ProjDamage（武器）/ AreaDamage2（防具） |
| IncreasedMinionArmor（chip）、MoreMinionArmor、MoreMinionDamage（chipE） | 先保留，召唤流派回来时再用；`w` 改成 0，不再掉落 |

- 映射时数值按档位比例换算：旧档位在旧族里的位置，对到新族同位置的档。
- DashSlot 保留，它是遁靴的特色。

### 3.5 誓约词条（新）

- 每件装备最多一条。
- 不占前缀、后缀的名额，显示在词条最下面，用暗红色。
- 一条誓约 = 一个正面 + 一个负面，正面比同部位的普通高档词条强。
- **来源**
  - 天梯宝箱里的装备有 `oath.chestChance` 15% 带一条。
  - 新铸符“立誓” `oathGlyph`：天梯 ≥30 层的宝箱有 5% 掉一个。用在装备上，随机打一条这个部位能出的誓约，消耗 4 点锻造潜力。已有誓约就替换。
  - 普通掉落不出誓约。
- **数据位置**：新文件段 `craft.json` 的 `oath`：`{ chestChance 15, glyphLadder 30, glyphDrop 5, fpCost 4, list [...] }`。

| id | 正面 | 负面 | 部位 |
|---|---|---|---|
| OathFullShield | 护盾全满时伤害总增 25% | 护盾回复 −40% | shield, core |
| OathFrozen | 对冻结的敌人伤害总增 30% | 冰缓效果 −30% | core, hub |
| OathChainStep | 每次弹射伤害 +10% | 投射物 −1（最少 1） | core, weapon |
| OathDelay | 延迟类伤害总增 30% | 延迟 +0.3 秒 | core, weapon |
| OathArea | 范围提高 40% | 移速 −15% | core, engine |
| OathVolley | 投射物 +2 | 投射物伤害总降 30% | weapon, core |
| OathGlass | 伤害总增 20% | 生命上限 −25% | 任意 |
| OathLamp | 击杀回灯火 +60% | 灯火燃烧 +25% | engine |

- “总增”是独立乘区，和大天赋一样。负面也是独立乘区。

---

## 4. 四个新流派

每个流派一节，写底子、符文、大天赋、魂火、AI 和建议的数值。

所有流派共用的规则：
- 大天赋的代价都包含“其他武器伤害 ×`offhandMul` 0.5”，和旋风之心、织雷之心一样。
- 天赋盘位置等天赋盘重排时再定，这里只写放在哪个区。

### 4.1 陨火（陨石术）

**底子 `StarfallRod` 坠星杖**（武器）
- form `meteor`，el exp，tags `Weapon Hit Attack AttackSpeed AoE Delayed Range`。
- min / max = PlasmaNova 的 ×1.5。
- aps 0.5，crit 6，range 600，aoe 260，`ail_exp` 0.25。
- req 6，w 800。

**符文 `Meteor` 陨火符文**
- fit `["weapon","tag:Delayed"]`，req 6，w 900。
- fx：
  - `meteor` 1
  - `meteorMul` `["lp",1.4,2.0,2]`
  - `delay` 1.0
  - `ground` `{ dur 3, tick 0.5, pct 0.12 }`：火地每 tick 造成这次命中的 12%，算持续伤害，吃持续时间。
- **落点**：选 aoe 半径内敌人最多的点，按目标的速度 × 延迟预判。
- **预警**：落点画红橙色圈，有倒计时收缩边，和怪的重击区分颜色。
- **命中**：圈内一次命中，击退 20 像素，眩晕 `stun` 0.5 秒（精英 / Boss ×0.3）。

**大天赋 `starfall` 星坠雨**（范围区）
- 每次施放落 `n` 3 颗，散布半径 = aoe × 0.8。
- 每颗伤害 ×`mul` 0.45，范围 ×`aoeMul` 0.6，延迟 ×`delayMul` 0.6。
- 有 Delayed 标签的武器伤害 ×`heartMore` 2.0。
- 代价：其他武器 ×0.5；移速 −10%。

**特殊增伤**
- 延迟伤害提高（词条、末日冠、誓约）。
- 火地叠层（焦土法阵）。

**特殊防御**
- 落点击退和眩晕。
- 火地里的敌人伤害总降 `groundWeaken` 15%。

**魂火**
- 每次施放 `soulPerCast` 1.2。
- 一次命中击杀 ≥3 只时返还 `soulRefund` 0.6。

**AI**（auto.json `meteor`）
- `keepDist` 110：保持距离。
- `retreatAt` 3：3 只以上贴身就后撤再砸。
- 目标是最密的群。

### 4.2 圣盾掷（飞盾圣骑）

**底子 `SigilShield` 圣徽盾**（盾）
- 护甲成长 = TitaniumShield ×1.15。
- 隐性词条 ShieldDamage 20–40%。
- req 12，w 600。
- **盾可以插符文**：圣徽盾的槽数权重 `[1000, 600]`（1–2 槽）。其他盾仍然没有槽。

**符文 `ShieldThrow` 圣盾掷符文**
- fit `["shield"]`，req 12，w 700。
- 装上后，盾每 1/`aps` 秒自动扔一次（aps 1.2，吃攻速）。
- 单次伤害 = 盾的护甲 × `throwK` `["lp",0.45,0.8,2]` × (1 + 盾牌伤害% + 圣光伤害%)，元素圣光。
- `chain` `["step",3,6]`：基础弹射 3 次，6 级、12 级各 +1。走通用弹射：盾朝最近的敌人飞出，碰当前屏幕边反弹，每次耗 1 次。
- 盾自带穿透（无限穿透，同一敌人重复命中间隔同通用规则），一路穿过怪群；和弹射不互斥。
- 每弹一次伤害 +`chainStepInc` 10%。
- 速度 220 像素/秒；寿命按通用投射物规则（吃持续时间），弹射用完或寿命到了就飞回手上，回程不造成伤害。
- 盾飞出去的时候，盾的护甲照常算（殉道者之盾除外）。
- fx 带 `ail.pla` 0.2（致盲）。
- 盾在手上时 `block` 生效。在手上的时间约 = 飞行时间以外的时间，弹得越多，在手上越少。这就是取舍。

**大天赋 `echoShield` 回响圣盾**（投射物区和守备区的交界）
- 每次盾命中，在命中点炸一个半径 `r` 24 像素的圣光爆，伤害 ×`mul` 0.4，算范围。
- 盾伤害 ×`heartMore` 1.8。
- 代价：其他武器 ×0.5；生命上限 −10%。

**特殊增伤**
- 盾的护甲：防御高，伤害就高。
- 每次弹射递增。

**特殊防御**
- 格挡。
- 每次盾命中回护盾上限的 `shieldOnHit` 0.5%（殉道者之盾再加）。

**魂火**
- 每次投掷 `soulPerThrow` 0.4。
- 每次弹射（碰屏幕边反弹）后的命中返还 `soulPerChain` 0.06。

**AI**（auto.json `shield`）
- `keepDist` 70。
- 站在怪群边上，让盾有得弹。

### 4.3 寒魄球（冰封球）

**底子 `FrostOrb` 寒魄宝珠**（武器）
- form `orb`，el cold，tags `Weapon Hit Attack AttackSpeed Projectile Spawn AoE Range`。
- min / max = Zapper 的 ×1.2。
- aps 0.8，crit 6，`ail_cold` 0.3。
- req 6，w 800。

**符文 `FrostOrbRune` 寒魄符文**
- fit `["weapon","tag:Spawn"]`，req 6，w 900。
- **冰球**
  - 速度 `orbSpeed` 70 像素/秒 × (1 + 投射物速度% − projSlow%)，下限 ×0.2。
  - 寿命 `orbLife` 1.8 秒 × (1 + 持续时间%)。
  - 穿过敌人，碰到敌人也不停。
  - 本体对接触的敌人每 0.5 秒命中一次，×1.0。
- **冰片**
  - 每 `emit` 0.15 秒向四周均匀放出 `shardDirs` 3 片，每次旋转 40°。
  - 每片 ×`shardMul` `["lp",0.2,0.32,2]`。
  - 速度 160 像素/秒，寿命 0.45 秒，不穿透。
  - 派生 +N：每次多放 N 片。
  - 冰片算投射物，吃投射物伤害，但不吃“投射物 +N”。
- **终点**：寿命结束炸开一圈冰环，半径 36 像素，×1.0，算范围。
- **投射物 +N**：每次施放多放 N 颗冰球（直接相加），扇形 20° 散开。弹射 +N 让冰球在寿命内碰屏幕边反弹 N 次。
- **冰片总数** = 冰球数 × (寿命 ÷ emit) × 每次片数。所以数量、持续时间是相乘的；减速不加片数，但让冰片集中在怪群里，命中率更高（用户 15:32 的三条构筑方向）。
- 同屏冰片上限 `maxShards` 200，超出时最老的消失。

**大天赋 `shardChain` 碎冰连锁**（投射物区）
- 冰片命中敌人时，再派生 `n` 2 片（×`mul` 0.5，只派生一层；碎晶冠再加一层）。
- 有 Spawn 标签的武器伤害 ×`heartMore` 1.8。
- 代价：其他武器 ×0.5；非寒霜伤害总降 20%。

**特殊增伤**
- 冰片数（数量 × 持续时间）。
- 冻结的敌人受伤提高。

**特殊防御**
- 冰缓、冻结。
- 慢速冰球挡在前面，冰缓让怪走得更慢。

**魂火**
- 每次施放 `soulPerCast` 0.6。
- 冰片打中冻结的敌人时每片返还 0.02，每次施放最多返还 0.4。

**AI**（auto.json `orb`）
- `keepDist` 100。
- 朝最密的方向放。
- 有冬之心时：`keepDist` 60，跟在冰球后面推。

### 4.4 霜环（冰霜新星）

**底子 `FrostBell` 霜钟**（武器）
- 数值同 PlasmaNova（圣钟），el cold，`ail_cold` 0.5。
- tags 加 `Nova`。
- req 6，w 800。

**符文 `FrostNova` 霜环符文**
- fit `["weapon","tag:Nova"]`，req 6，w 900。
- fx：
  - `novaMul` `["lp",1.3,1.8,2]`
  - `chillStacks` 2：每次命中叠 2 层冰缓。圣钟插这个符文时，元素改成寒霜。
- 新星 0.6 aps，以自身为中心，半径 = aoe。
- 击退 12 像素。

**大天赋 `shatter` 碎冰**（范围区）
- 杀死冻结的敌人时，尸体向四周放 `n` 6 片冰片（×`mul` 0.35，冰片规则同寒魄球，算派生和投射物）。
- 冰片不再触发碎冰，避免无限链。
- 但冰片打死的冻结敌人会继续碎，这就是怪海里的一圈一圈。
- 有 Nova 标签的武器伤害 ×`heartMore` 1.8。
- 代价：其他武器 ×0.5；非寒霜伤害总降 20%。

**特殊增伤**
- 碎冰。
- 冻结的敌人受伤提高。

**特殊防御**
- 冻结的怪不能攻击。
- 新星击退。

**魂火**
- 每次新星 `soulPerCast` 0.3。
- 每冻结一只返还 0.15，每次最多 0.9。

**AI**（auto.json `nova`）
- 近战打法，同旋风斩的 melee。
- 冲进最密的群放环。

### 4.5 两个已上线流派的调整
- **旋风斩**：小旋风改带 `Spawn` 标签，吃“派生 +N”：每次甩出多 N 个。
- **游雷**：不变。

---

## 5. 新独特装备（uniques.json + rules.json）

- 文字按标签写。
- 数值写成 `[最小, 最大]`，掉落时随机。
- `lo` 是 ladderOnly 门槛：天梯达到这么多层后，这件才会在普通掉落里出现；之前只从天梯宝箱出。

| id | 名字 | kind / 底子 | req | w | lo | 规则 rule key | 数值 | 代价 |
|---|---|---|---|---|---|---|---|---|
| DoomCrown | 末日冠 | core / NebulaCore | 30 | 30 | 20 | `delayCrown` | 每多 0.1 秒延迟，延迟伤害总增 [10,14]%；延迟 +1 秒；范围提高 [20,30]% | 预警圈更早出现（怪更容易躲） |
| ScorchedCircle | 焦土法阵 | hub / AmberNexus | 24 | 40 |  | `groundStack` | 你的地面效果可以叠 3 层（同一位置叠加，各自计时） | 持续时间 −30% |
| MartyrShield | 殉道者之盾 | shield / SigilShield | 30 | 30 | 20 | `martyrThrow` | 弹射（碰屏幕边反弹）次数 ×2；每次命中回 [1.5,2.5]% 护盾 | 盾在飞时不算盾的护甲 |
| EchoCrown | 回音冠 | core / PhantomCore | 20 | 40 |  | `echoCrown` | 每次弹射（碰屏幕边反弹）后的命中在命中点小爆（半径 24 像素，×[0.25,0.35]，算范围） | 弹射 −1 |
| WinterHeart | 冬之心 | weapon / FrostOrb | 30 | 30 | 20 | `winterHeart` | 冰球速度 −70%；持续时间 +[80,100]%；冰片频率 ×1.5 | 每次施放魂火 ×1.5 |
| ShardCrown | 碎晶冠 | core / NebulaCore | 24 | 40 |  | `shardCrown` | 派生物再派生一层（每层 ×0.5）；冻结的敌人受到的伤害提高 [15,25]% | 投射物速度 −20%（寒魄球用起来是好处） |
| EverwinterCircle | 永冬法阵 | hub / FrostNexus | 30 | 30 | 20 | `autoNova` | 新星每 0.5 秒自动脉冲一次（×[0.5,0.65]），不再按攻速出手；脚下留 1.5 秒冰地，每秒叠 2 层冰缓 | 移速 −15% |
| CoffinShield | 冰棺盾 | shield / TitaniumShield | 20 | 40 |  | `coffin` | 每冻结一个敌人回 1% 护盾；冻结时间 +[20,35]% | 火焰抗性 −20% |
| VortexTreads | 旋涡之履 | engine / Thruster | 20 | 40 |  | `vortexTreads` | 叠满层时移速 +30%、受到的伤害 −10%（永冬自动脉冲期间算满层） | 没有层数时移速 −20% |

现有的五顶冠（风暴之眼、雷冠、百骨冠、永燃冠、碎颅冠）不变。

**每件的受益流派**（模拟要验证，至少对两个流派是正收益）

| 独特 | 受益流派 |
|---|---|
| 末日冠 | 陨火（以后加延迟引爆类） |
| 焦土法阵 | 陨火、永冬 |
| 殉道者之盾 | 圣盾掷 |
| 回音冠 | 圣盾掷、游雷 |
| 冬之心 | 寒魄球（形态件，例外） |
| 碎晶冠 | 寒魄球、霜环（碎冰）、旋风斩（小旋风） |
| 永冬法阵 | 霜环、圣钟 |
| 冰棺盾 | 寒魄球、霜环 |
| 旋涡之履 | 旋风斩、霜环（永冬） |

---

## 6. 现有武器底子的隐性倾向

每把补一个隐性词条，显示在底子属性下面，不占词条位：

| 底子 | 隐性 |
|---|---|
| 骨弩 Cannon | 穿透（已有 pierce，改成布尔） |
| 穿心弩 Railgun | 穿透；投射物速度 +30% |
| 雷灵 Zapper | 弹射 +1（碰屏幕边反弹） |
| 飞镰 Shuriken | 投射物持续时间提高 20% |
| 回旋骨刃 TurbineBlades | 范围提高 15% |
| 圣钟 PlasmaNova | 范围提高 10% |
| 火油罐 Rocket | 范围伤害提高 15% |
| 喷火颅 FlameThrower | 持续伤害提高 20% |
| 疫星仪 Orbitron | 派生 +1（螺旋弹打中时分出一颗） |
| 散骨铳 Blastgun | 投射物伤害提高 15% |
| 三种陷阱 | 延迟伤害提高 20%（陷阱改带 Delayed 标签） |
| 骨刺 Spikes、撞城骨锤 Hullbreaker | 近战伤害提高 20% |

其余底子实现时补，原则是一个底子一个倾向，别重样。

---

## 7. 毕业节奏（数值目标）

| 阶段 | 时间 | 推层 / 天梯 | 门槛 | 追求 |
|---|---|---|---|---|
| 开荒 | 0–1 小时 | 推层 1–15 | 新底子 req 6，符文 req 6 | 底子 + 流派符文 |
| 成型 | 1–4 小时 | 推层 15–35，天梯 10–25 | 大天赋（天赋点约 25）；ladderOnly 20 的形态独特 | 第二、三次跃迁 |
| 精修 | 4–15 小时 | 天梯 25–50 | 铁砧高档；天梯 30 的立誓铸符；天梯 40 的传奇融合 | 标签词条高档、誓约 |
| 毕业 | 15 小时以后 | 天梯 50 以上 | 溢彩顶档（只从宝箱出）；传奇潜力 3–4 | 天梯排名、第二个流派 |

**模拟验证**（tools/sim.js、bis.js，`--build meteor|shield|orb|nova`）

| 目标 | 数值 |
|---|---|
| 成型（ilvl 30）构筑 vs 乱配，秒伤 × 有效生命 | ≥ 3 倍 |
| 毕业（ilvl 100）构筑 vs 乱配 | 30–100 倍 |
| 六个流派毕业天梯 | 相差 ≤ 10% |
| 传奇融合前后 | 天梯 +15–25% |
| 溢彩顶档前后 | 天梯约 +10% |
| 誓约前后 | 天梯约 +5–10% |
| 换掉形态件（冬之心、殉道者之盾、永冬、末日冠） | 天梯 −30% 以上 |
| 冰系的冻结 | 前沿最低生命比远程乱配高（冻结在起防御作用） |

**各流派的 craftPref**（做装偏好，模拟用）
- 陨火：DelayDamage > AreaDamage2 > IncreasedArea > FlatExplosive > AilEffect:exp
- 圣盾掷：ShieldDamage > IncreasedArmor > SparkChain（弹射 +#，屏幕边反弹）> ChainStep > Block
- 寒魄球：SparkAdd（投射物 +N）> IncreasedDuration > ProjSlow > SpawnAdd > FrozenTaken > FlatCold
- 霜环：IncreasedArea > FrozenTaken > AilEffect:cold > FlatCold > ShieldRegen

---

## 8. 实现时的顺序建议（开工后）

1. ~~寒霜元素和冰缓 / 冻结，以及霜魂怪~~ **已完成**（2026-10-24）。偏差：玩家只吃冰缓不会被冻结；更多寒霜伤害的 key 是 ChipMoreColdDamage；抗性收窄和 AilEffect 留给第 2 步。
2. 通用属性（§2）和词条改版（§3），含老存档映射。这一步不依赖新流派，可以先上，用旋风斩 / 游雷 / 乱配跑一轮。
3. ~~穿透 / 弹射（spec-pierce-chain.md）~~ **已完成**（2026-10-24，按用户定稿：无限穿透 + 屏幕边弹射，无反弹属性）。圣盾掷依赖它。
4. 四个新流派，一个一个上：霜环（复用圣钟形态，最省）→ 陨火 → 寒魄球 → 圣盾掷。每上一个跑一次模拟，交回设计线程。
5. 新独特、誓约、隐性倾向。
6. 天赋盘重排（流派和标签定了以后）。

## 9. 待定（不影响写数据）
- 立誓铸符的掉率 5% 偏高还是偏低，等天梯产出模拟。
- 暴击：头冠只给暴击率，暴击伤害仍在印记。
- 配装存档 / 一键切换：等仓库系统。
