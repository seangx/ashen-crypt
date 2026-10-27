# 灰烬地窖 · 设计文档索引

2026-10-27 整理。这里只留**当前有效**的设计。过期的文档已经删除，删除前的最后版本在 git 提交 `67eee72`（`git show 67eee72:design/<文件名>`）。代码注释里提到的旧规格（spec-tags、spec-legacy-cleanup、spec-tree-defense 等）都已经实现，也在那个提交里。

**不兼容老存档**：新版本直接清档，所有文档都不写迁移。

## 阅读顺序
| # | 文档 | 管什么 | 状态 |
|---|---|---|---|
| 1 | [system-v2.md](system-v2.md) | 总纲：核心循环、伤害模型、触发器的补充决定、元素（含附加特效和元素独特）、成长四段、解锁表、实现顺序 | 未开工 |
| 2 | [spec-trigger-slots.md](spec-trigger-slots.md) | 触发器的完整规格（用户设计）：条件、孔、技能石和辅助石、防循环、掉落、手机 UI | 未开工 |
| 3 | [gear-v2.md](gear-v2.md) | 装备：部位、招牌、词条池（约 60 族）、副手、独特的随机词条、属性石 | 未开工 |
| 4 | [unique-reels.md](unique-reels.md) | 骸骨轮盘：推层每 5 层一次独特三选一（老虎机表现） | 方案稿 |
| 5 | [defense-v3.md](defense-v3.md) | 防御：护甲 / 抗性公式、条件减伤、回复、坚韧面板、自动战斗下的威胁、精英词缀 | 未开工 |
| 6 | [lamp-v2.md](lamp-v2.md) | 灯火：光照半径、三档灯态、灯火构筑、天梯灯灭即结束 | 未开工 |

冲突时的优先级：system-v2 > 其余专题文档 > spec-trigger-slots。

## 其他
- `mockups-v5/`：手机竖屏界面的定稿效果图（`index.html?p=…`）。
- `tables/现有内容总表.xlsx`：**现在代码里**的装备、技能石、辅助符文、词条、独特、誓约、铸符，用来对照。重新生成：`cd game && python3 tools/build.py`，然后 `node design/tables/dump.js`（输出 content.json），再 `python3 design/tables/mkxlsx.py`。
- 模拟工具在 `game/tools/`（sim.js、bis.js），不在 design 下。
