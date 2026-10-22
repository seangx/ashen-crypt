import sys
hp, dmg, name = sys.argv[1], sys.argv[2], sys.argv[3]
s = open('game.html').read()
s = s.replace("const monHp = L => Math.pow(1.085, L - 1);", f"const monHp = L => Math.pow({hp}, L - 1);")
s = s.replace("const monDmg = L => Math.pow(1.07, L - 1);", f"const monDmg = L => Math.pow({dmg}, L - 1);")
s = s.replace("const t = clamp(a.tiers.length - N, 0, a.tiers.length - 1)",
  "let top = 0; a.tiers.forEach((x, i) => { if (it.ilvl >= x[2]) top = i; }); const t = clamp(top - (N - 1), 0, a.tiers.length - 1)")
open(name, 'w').write(s)
