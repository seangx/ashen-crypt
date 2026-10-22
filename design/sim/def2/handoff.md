# Defense v2 handoff (prototype thread → design thread)

The commit is ca086b1. It includes the design thread's a0223a6 (Whirl rune 1–6, leech caps 3/4). Published as V43.

## Implemented
- **Damage order:** dodge → res → armor DR → guard → spin DR → shield → life.
  - armorDr(A, hit) = min(armorCap, A/(A+armorK·hit)), computed on the hit after resistances.
- **Shield max:** player.shield 40 + all deflect sources (energy included), multiplied by tree more.deflect and more.armor (the "armor −X%" costs).
- **Shield regen per second:** max × (shieldRegenPct + Resilience armorRegen)/100 × tree more.deflRate, plus flat shieldRegen from affixes and the tree.
  - It never pauses.
  - The map mod noRegen still reduces it.
- **Life:** (100 + 3 per level + life) × lifeInc.
  - On level-up, the max gained is added to current life.
  - No natural regen.
  - Leech heals life; the caps are % of max life.
  - bossKillLife 15% on any boss kill.
  - Full at camp.
- **Life %:** retreat, emergency return, minHp, melee AI retreat and low-life dash all read life %.
- **Helpers on `__ash`:**
  - defEhp(n, L, extraDr)
  - armorDr
  - typicalHit(L) = mean MOBS dmg × monDmg(L) × horde.dmg

  sim, bis and itemValue all use defEhp. bis takes its depth from A.S.depth.
- **Affixes:** FlatLife, IncreasedLife and ShieldRegen are in mechanics.defense.affixes. The GearArmorOnHit and rune texts now say 生命, and deflect texts now say 护盾.
- **HUD:**
  - The orb shows life in red with a white-blue shield rim.
  - The tooltip shows life, shield with its regen, and armor with its DR% against a typical hit on this floor.
  - The stats window shows life, shield (/s) and armor (DR%).

## Smoke test: 3 seeds, 30 min (whirl-30.txt, random-30.txt, bis.txt)
- Push (p25 / med / p75): whirl 15.5 / 17 / 18, random 12.5 / 13 / 13.5.
- Ladder (p25 / med / p75): whirl 2 / 4 / 5.5, random 8.5 / 10 / 11.5.
- Deaths were 0 and min life was 100% in both builds, so defense is probably too generous.
- bis ehp ratio (whirl / random): ×2.4 at ilvl 30, ×3.2 at 70, ×0.53 at 100.
- bis ladder (whirl vs random): 49 vs 29, 58 vs 44, 61 vs 53.

## Effects for you to place
- **rules.thorns (armor ×30%) and rules.dodgeSpikes (armor ×50%):** these still use the armor value. Base armor is now 0, so they are weak without armor gear.
- **rules.absorb (圣盾):** implemented as 25% of the damage that reaches life is converted to shield. The data text still says 护甲/灵障 and needs rewording.
- **rules.martyr:** delayMul is dead now that regen has no delay. The text mentions 灵障.
- **Tree keystones with more.armor:** these now multiply shield. Values: 神圣屏障 0.6, 幻影 0.6, 殉爆 0.8, 静电场 0.85, 圣盾 0.75, 闪避反击 0.8. 神圣屏障 also has deflRate ×2, which now doubles the shield regen %.
- **Tree keystones with more.deflect (shield ×):** 骨刺甲 0.5, 时停 0.7.
- **Tree armor/armorInc nodes** (碎颅, 铁脊, 骨鳞, small armor nodes) now give armor DR. deflect/deflectInc nodes give shield.
- **Bastion (城垛盔):** its fixed IncreasedArmor is now DR. The armorLess rule text reads "代价：护盾总降", but no data uses that rule.
- **Runes:** Aegis gives shield, Resilience gives shield regen +%, and ArmorOnHit gives life on hit.
- **auto.json:** the melee retreat and dashLowArmor thresholds are now life fractions.
- **itemValue:** the V.defense weight now multiplies defEhp, so its scale has changed.
