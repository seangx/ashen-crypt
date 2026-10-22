# 灰烬守夜人 · 手绘（36x48）。剪影：小兜帽 → 宽披肩 → 束腰 → 外张的长摆，弩横在右腰，左手提魂灯。
import math
W, H = 38, 48
HOOD = [
 "..............00",
 ".............0dc0",
 "............0dedb0",
 "...........0deddcb0",
 "..........0deddccbb0",
 "..........0dedc111cb0",
 ".........0dedc11001cbb0",
 ".........0ddc10hhhhg0bb0",
 ".........0dec10hiIih0cb0",
 ".........0ddc10hkIkh0cbb0",
 ".........0dec10ghIhg0cbb0",
 "........0deddc10gihg01cbb0",
 "........0dedcc1100g0011cbb0",
]
def tone(i, n, y, folds, lift=0.0):
    u = i / max(1, n - 1)
    v = .98 - u * .9 + .17 * math.cos(math.tau * (i * folds / n + .1 + y * .015)) + lift
    return 'e' if v > .84 else 'd' if v > .6 else 'c' if v > .38 else 'b' if v > .15 else 'a'
def frame(bob=0, step=0, sway=0):
    g = [['.'] * W for _ in range(H)]
    def put(x, y, c):
        y += bob
        if 0 <= x < W and 0 <= y < H: g[y][x] = c
    def get(x, y):
        y += bob
        return g[y][x] if 0 <= x < W and 0 <= y < H else '.'
    def stamp(x, y, rows):
        for j, r in enumerate(rows):
            for i, c in enumerate(r):
                if c not in ' .': put(x + i, y + j, c)
    def band(y, l, r, folds, lift=0.0):
        put(l - 1, y, '0'); put(r + 1, y, '0')
        for x in range(l, r + 1): put(x, y, tone(x - l, r - l + 1, y, folds, lift))
    # 长摆（先画，在最底层）
    for y in range(27, 43):
        k = y - 27
        l = 7 - int(k * .32) - (sway if y > 35 else 0); r = 22 + int(k * .22)
        band(y, l, r, 3.2)
    hem = "0a0ba00a.0ba0b0.0a0ba0a00b"
    l42 = 7 - int(15 * .32) - sway
    for i, c in enumerate(hem):
        if c != '.': put(l42 + i, 43, c if c == '0' else 'a')
        if c not in '.0' and i % 3 == 1: put(l42 + i, 44, '0')
    # 前襟开口与腿
    for y in range(31, 43):
        w = (y - 31) // 3
        for x in range(14 - w, 16 + w): put(x, y, '1')
        put(13 - w, y, 'd'); put(16 + w, y, 'a')
    ll, rl = 12 - step, 16 + step
    for y in range(37, 45):
        put(ll, y, 'y'); put(ll + 1, y, 'x'); put(rl, y, 'x'); put(rl + 1, y, 'f')
    stamp(ll - 1, 45, ["0zyx0", ".000."]); stamp(rl - 1, 45, ["0yxf0", ".000."])
    # 躯干（束腰）
    for y in range(20, 27): band(y, 8, 21, 1.6, .05)
    # 腰带 + 金扣
    for x in range(8, 22): put(x, 25, 'y' if x % 4 else 'z'); put(x, 26, 'x')
    put(7, 25, '0'); put(22, 25, '0'); put(7, 26, '0'); put(22, 26, '0')
    stamp(13, 24, ["0r0", "rsq", "0q0"])
    # 披肩
    rows = {13: (6, 24), 14: (4, 26), 15: (3, 27), 16: (2, 28), 17: (2, 28), 18: (2, 28), 19: (2, 28), 20: (2, 28)}
    for y, (l, r) in rows.items(): band(y, l, r, 2.2, .16 - (y - 13) * .035)
    for (l, r), y in [((2, 6), 21), ((24, 28), 21), ((2, 5), 22), ((25, 28), 22), ((3, 4), 23), ((26, 27), 23)]:
        put(l - 1, y, '0'); put(r + 1, y, '0')
        for x in range(l, r + 1): put(x, y, 'c' if x < 10 else 'a')
    for x in (3, 4): put(x, 24, '0')
    for x in (26, 27): put(x, 24, '0')
    for x in range(7, 24): put(x, 21, 'a'); put(x, 20, 'b' if x > 15 else 'c')   # 披肩下缘
    for x in (6, 24): put(x, 21, '0')
    for x in range(8, 22): put(x, 22, 'a')
    stamp(4, 14, ["ee", ".eE", "..e"]); stamp(3, 16, ["e"])   # 左肩受光
    # 兜帽压在披肩上
    for j, r in enumerate(HOOD):
        for i, c in enumerate(r):
            if c != '.': put(i, j, c)
    for x in range(9, 23): put(x, 13, 'a' if x > 12 else 'b')
    stamp(8, 13, ["0"]); stamp(26, 13, ["0"])
    # 红披带：左肩 → 右腰，压在腰带下；末端两条流苏垂在右胯
    for k in range(11):
        x, y = 7 + k, 14 + k
        stamp(x, y, ["lpon" if k < 2 else "mpon"]); put(x + 4, y, 'l')
    stamp(18, 27, ["mnl", "mnl", "ml.", "m.l", "l..", "..l"])
    stamp(21, 27, ["nl", "ml", "l.", ".l"])
    # 胸口短链
    stamp(19, 15, ["r.r", ".q."])
    # 左臂：袖子垂下，手提魂灯
    for y in range(24, 27): stamp(3, y, ["0dc0" if y < 25 else "0cb0"])
    stamp(3, 27, ["0xy0", ".0x0"])
    for y in range(29, 32): put(4 + (sway if y > 30 else 0), y, 'h' if y % 2 else 'g')
    stamp(2 + sway, 32, [".0g0.", "0hih0", "gjkjg", "hkIkh", "gjkjg", "0hgh0", ".0g0."])
    # 右臂：袖口到弩把
    for y in range(21, 24): stamp(22, y, ["0bba0"])
    # 骨弩
    stamp(17, 19, [
        "...............0W0..",
        "..............0hwW0.",
        ".............0h.0wv0",
        "............0h...0wv0",
        "..0000000000h0000.0w0",
        ".0xyzzzzzyyhvvvvvvvvkk0",
        "0xyzzzzzzzzyyyyzzzzzw0",
        ".0xxyx0000xxyyyyyx0w0.",
        "..0xyx0..0rr00000.0wv0",
        "...0x0...0q0..h..0wv0",
        "....0.....0..h..0vu0",
        ".............h.0vu0",
        "..............0u0",
    ])
    stamp(21, 23, ["0xyz0", "xyzz0", "0xy0"])  # 皮手套
    put(15, 9, 'j'); put(19, 9, 'j')
    # 披肩褶皱
    for y in range(15, 21):
        for x, (hi, lo) in ((10 + (y - 15) // 3, ('d', 'b')), (20 + (y - 15) // 4, ('c', 'a'))):
            if get(x, y) in 'cdeb': put(x, y, hi); put(x + 1, y, lo)
    # 右侧烛光边缘光：长摆最右缘
    for y in range(32, 42):
        row = g[y + bob]
        for x in range(W - 1, 0, -1):
            if row[x] == '0' and row[x - 1] in 'abcd':
                put(x - 1, y, '3' if y % 4 else 'y'); break
    return [''.join(r) for r in g]
FRAMES = [frame(), frame(0, 1, 1), frame(-1, 0, 0), frame(0, -1, -1)]
