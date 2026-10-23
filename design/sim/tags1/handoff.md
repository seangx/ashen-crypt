# Tag build handoff (prototype thread → design thread)

The commit is 058cce3, published as V48. It implements design/spec-tags.md.

## Implemented

### Generic stats
- New globals in 40_stats:
  - `P.projAdd` = gear `extra` (the SparkAdd affix, now "投射物 +#") + tree/unique `projAdd`. It is added to `W.extra` on weapons with the Projectile tag.
  - Gear `chain` (the SparkChain affix, now "弹射 +#", tag ProjectileCanChain) and tree `chain` are added to `W.chain` on weapons with ProjectileCanChain.
  - `aoeInc`: gear + tree + rune values are summed per weapon into `W.aoeInc`.
  - `P.durInc`: gear + tree/unique. `P.durMul` = max(0.1, 1 + durInc/100).
- **Spark**
  - Count = rune sparkN × attacks(W), where attacks = 1 + extra.
  - Bounces = `W.chain`. The rune's `sparkChain` is renamed to fx `chain` in runes.json.
  - Life = SP.life × durMul.
  - New `spark.maxAlive` 160: oldest sparks are removed first.
  - spinMax uses W.chain with chainStep.
- **Whirl:** whirlR × (1 + W.aoeInc/100). The AreaOfEffect rune fits TurbineBlades, so it now widens the whirl.
- **Dust devils**
  - Each spawn throws 1 + floor(OW.extra + P.projAdd) devils.
  - Cap = devilMax × (1 + that).
  - Speed × (1 + projSpd%).
  - Life × durMul.
  - Damage × tree `dmg:proj`. Devils count as projectiles, so the StormEye and HundredBones costs hit them. Say if you don't want that.
- **Ground effects:** fire trail, engine trail and mine pools last × durMul.
- **SpinCap** text is now "【持续施放】叠层上限 +#".

### Keystones
- whirlHeart applies to weapons with both Melee and AoE: TurbineBlades and Thorns.
- sparkHeart applies to any weapon with ProjectileCanChain, which covers most projectile guns.
  - New `spark.chainStepInc` 15: each bounce adds +15% to that hit. This works for spark bounces and for generic projectile chains.
  - The data still has heartMore 2.2; the spec said 1.8, and I left the data alone.
- In tree.json, `sparkChain` is renamed to `chain`: the 导雷 notable and the 织雷之心 add.
  - The tree text for chain is now "弹射 +N" everywhere, replacing "额外连锁".
  - Keystone texts are in rules.json (sparkHeart / whirlHeart), reworded to tags.
  - No other tree text names an archetype, because node texts are generated from their stat keys.

### Uniques (rules.json numbers)
| Unique | rules.json params | Behavior |
|---|---|---|
| StormEye | `areaEye` {aoeInc 25, pullR 2, pull 40} | rangeInc 15–25 kept; `projLess` 30 (tree more `dmg:proj` ×0.7); spinDecay removed. Whirl pulls continuously as before. Single AoE hits (nova, explosive projectile, mine, finale) pull normal mobs within aoeR×pullR toward the hit point once, by up to pull×0.3 px. |
| StormCrown | `chainCrown` {chain 1, stepInc 15} | The old sparkCrown is gone (no extra sparks or life). Spark fork on shocked targets is kept. Any bounced hit applies at least 1 shock stack. |
| HundredBones 百骨冠 | `projCrown` {extra 2, less 25} | PhantomCore base. |
| EverEmber 永燃冠 | `durCrown` {durInc 50, aoeInc -15} | NebulaCore base. |
| SkullSplitter 碎颅冠 | `meleeCrown` {chance 25, speedLess 10} | TitaniumCore base. Melee hits re-resolve once; W.dps × 1.25 for the sim. |

- The three new crowns are core uniques: req 20, w 40, no ladderOnly, no fixed affixes.
- Removed data keys: whirl eyeRng / eyeLifeAdd / eyeMaxAdd / pullR / pull, and spark crownAdd / crownLife / crownChain. The `_说明` strings for whirl and spark still describe the old crown and eye; please reword them.
- `tags.affixes` (IncreasedArea, IncreasedDuration) are merged in 10_data.
- tools/bis.js has a new `--core ID|none` flag that swaps the archetype's unique core.

## Sims (tags1/*.txt): sim median of 3 seeds, by seed batch
| | 90 min push | 90 min ladder | 600 min push | 600 min ladder |
|---|---|---|---|---|
| whirl, seeds 1–3 | 26 | 28 | 47 | 56 |
| whirl, seeds 4–6 | 30 | 37 | 54 | 59 |
| spark, seeds 1–3 | 34 | 40 | 46 | 57 |
| spark, seeds 4–6 | 34 | 43 | 46 | 54 |
| random, seeds 1–3 | 27 | 28 | 42 | 44 |
| random, seeds 4–6 | 30 | 34 | 44 | 44 |

- **Mid game:** spark is ahead of whirl at 90 min (push 34 vs about 28). Whirl at 90 min is about the same as random. Spark gets 4–5 sparks plus chains early.
- **600 min:** whirl and spark are within 10% of each other. Both are about 10–25% above random in push and about 30% above it in ladder.

## bis: ladder by core (single seed, ilvl 30 / 70 / 100; very noisy)
| Build | none | StormEye | StormCrown | HundredBones | EverEmber | SkullSplitter |
|---|---|---|---|---|---|---|
| whirl | 28 / 40 / 66 | 28 / 56 / 65 | 28 / 49 / 57 | 45 / 40 / 57 | 40 / 53 / 61 | 40 / 40 / 52 |
| spark | 22 / 43 / 53 | 31 / 51 / 40 | 37 / 52 / 54 | 22 / 46 / 49 | 40 / 54 / 54 | 31 / 46 / 54 |

- bis dps for whirl: none 315k vs SkullSplitter 397k vs StormEye 440k at 100.
- bis dps for spark: none 36.7M, StormCrown 42.4M, HundredBones 22.6M at 100. HundredBones's −25% projectile damage outweighs +2 projectiles, because spark already scales by count × chain.
- Wearing a unique core loses the rare core's defense: whirl ehp drops from 30.6k to 14k with most uniques. Ladder by ilvl is therefore mixed, and none vs unique is mostly an ehp-vs-dps tradeoff.
- EverEmber is positive for both builds at ilvl 30–70.
- HundredBones is weak on spark.
- SkullSplitter is a clear dps gain on whirl only.
