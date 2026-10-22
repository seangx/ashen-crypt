# 第二期（铁砧做装）数据字段 · v14

所有数值都在 `/mnt/project-files/game/data/`。改完运行 `python3 tools/build.py`。

## 新表 craft.json
- `anvil`：潜力花费，格式是 [最少, 最多]。
  - `add` [1,4]
  - `upgrade` [1,4]，另加 floor(新档位 / `upgradeTierDiv` 3)，档位从最低档数 1 起
  - `refine` [1,3]
  - `strip` [1,3]
- `shatter`：每条词条给 `perAffix` 1 个碎片，档位 ≥ `bonusTier` 3 的再多给 `bonus` 1 个。
- `glyphs`：`hopeChance` 0.5，`list` 是四种铸符（id、名字、颜色）。

## loot.json
- `drop.shard` 0.04：每只怪掉碎片的几率，精英 ×eliteMul。`drop.die` 已删除。
- `affixCount.rare` [3,4]；`limit.magic` [1,1]；`limit.rare` [2,2]（铁砧也按这个上限）。
- `fp`：锻造潜力。normal [10,20]，magic [15,25]，rare [20,35]。
- `exalted`：`topTiers` 2，`minTiers` 5（你确认过的默认值）。
- `legendary`：`potential` [0,2]，`ladder` [1,3]。
- `dice` 表已删除。

## progression.json
- `bossLoot.dice` 改名为 `bossLoot.shards`，值仍是 4（Boss 必掉的碎片数）。
- `starter.dice` 已删除。
- `unlocks`：
  - `craft` {depth 5}
  - `craftAdv` {depth 15}（洗数值和移除）
  - `feed` {ladder 20}
  - `fuse` {ladder 40}
  - 新增条件类型 `ladder`，按天梯最高通过层数判断。

## ladder.json
- `reward` 的 `diceBase` 和 `dicePerN` 换成了：
  - `shardsBase` 4，`shardsPerN` 5
  - `glyphBase` 10，`glyphPerN` 0.5
  - `exaltedFrom` 30，`exaltedPerN` 1，`exaltedMax` 40
- `tiers.firstIlvlBonus` 换成 `firstGlyphs` 2。段位首次奖励现在只给铸符，不再给稀有装备。
- 你的天梯调数（pointsBase 150 等）保留未动。

## runes.json
- `feed.mul` 0.8

## atlas.json
键名没改，只改了说明文字：
- 命盘和墓图词条的 `dice` 现在是“词条碎片掉落提高”。
- `twin` 现在是“几率词条碎片掉两个”。

## 规格里没写、由我决定的地方
1. 档位标签改成从下往上数（T1 最低），跟《最后纪元》和你说的“新档位”一致。档位颜色：溢彩档是青绿色，铁砧能做到的最高档是橙色。
2. 混沌符换出来的新词条，档位会被压到它自己的可制作上限以内。
3. 天梯宝箱的溢彩装备一定是稀有装备。这件装备如果没有能出溢彩的词条族，会把一条词条换成能出的。
4. 独特装备的固定词条仍然按物品等级取档，可能落在溢彩档。
5. 熔铸转移过来的词条不检查和独特装备的固定词条是否同组。
6. 印记（芯片）也能上铁砧。
7. 天梯宝箱里的独特装备，传奇潜力用 `legendary.ladder` 重新随机。
8. 旧存档迁移：
   - 丢弃骰子和魂萃词条。
   - 已有装备按稀有度补一个锻造潜力，独特装备补上传奇潜力。
   - 现在有 1 条词条的稀有装备，下次上铁砧时会按词条数变成罕见。

## 模拟
加 `--craft auto`（贪心策略）：
1. 先熔铸（解锁后）。
2. 拆掉背包里的装备（印记和独特装备除外）。
3. 给身上每件装备反复做“秒伤 × (护甲 + 灵障)”提升最大的加词条或升档，直到没有提升或潜力用完。有希望符就附带。

### 结果（种子 1，90 分钟，--tree auto --ladder every:5）

| | 不做装 | --craft auto |
|---|---|---|
| 推层 | 30 | 29 |
| 天梯最高 | 28（解锁 31） | 27（解锁 29） |
| 结束时秒伤 | 15.7k | 11.1k |
| 碎片 | 囤了 707 个没用 | — |
| 铁砧次数 | — | 加词条 26，升档 49 |

- 碎片分散在大约 100 个词条族上，所以有用的族很难攒够。
- 贪心策略的目标是“秒伤 × 有效生命”，加的偏向防御。换装用的是另一个分数（秒伤 + 护甲 + 灵障），做过的装备不容易被新掉落替换。
- 天梯的失败仍然全是死亡。

种子 2，60 分钟，--craft auto：推层 26，天梯最高 23。
