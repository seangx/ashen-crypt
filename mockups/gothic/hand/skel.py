# 骷髅兵 · 手绘（22x34）：锈铁肩甲、残破红腰布、锈剑；两帧走路。
BASE = [
 "......000000..........",
 ".....0wWWWWw0.........",
 "....0wWWWWWwv0........",
 "....0WWWWWwwvu0.......",
 "....0W000ww00u0.......",
 "....0w044wv04u0.......",
 "....0vw00W00vu0.......",
 ".....0vwwvwvu0........",
 ".....0w0w0w0t0........",
 "......0vtvtu0.........",
 ".......0vu0...........",
 "..00000hvu00000.......",
 ".0hiihg0u0ghhig0......",
 "0hiIihg0w0ghhgg0......",
 "0ghhgg0vWv0gggf0......",
 ".0vu00wv0vw00wu0......",
 ".0wu0w00w00w00vt0.....",
 ".0wu00wv0vw0.0vt0.....",
 ".0vu0.0w0w0..0vt0.....",
 ".0vt0.0vWv0..0ut0.....",
 ".0wu0..0w0...0wu0.....",
 ".0vu00nooonn0.0w0.....",
 "0wWv0onppoonm00v0.....",
 "0vu0.0moonml00hih0....",
 ".00..0nl0nlm.0hIh0....",
 ".....0wv00ml0.0hh0....",
 ".....0wu0.0wu00ih0....",
 "....0wv0...0wu0hh0....",
 "....0vu0...0vu0gh0....",
 "...0wv0.....0vu0g0....",
 "...0vt0.....0vt0h0....",
 "..0wWv0.....0wWv0.....",
 "..00000.....000000....",
]
# 第二帧：迈另一条腿
LEGS2 = [
 ".....0wv00ml0.0hh0....",
 ".....0wu0.0wu00ih0....",
 ".....0wv0.0wu0.hh0....",
 "....0wu0..0vu0.gh0....",
 "....0vu0...0vt0.g0....",
 "...0wvt0...0vt0.h0....",
 "...0wWv0....0wWv0.....",
 "...00000....00000.....",
]
F2 = BASE[:25] + LEGS2
FRAMES = [BASE, F2]
def ribs(f):
    g = [list(r.ljust(22, '.')) for r in f]
    for y in range(15, 21):
        for x in range(5, 13): g[y][x] = '1'
        g[y][4] = '0'; g[y][13] = '0'
    for y, (a, b) in ((15, (5, 12)), (17, (5, 12)), (19, (6, 11))):
        for x in range(a, b + 1): g[y][x] = 'W' if x < 8 else 'w' if x < 10 else 'v'
        g[y][a] = 'v'; g[y][b] = 't'
    for y in (16, 18, 20): g[y][8] = 'w'; g[y][9] = 'u'
    # 剑刃加长到脚边
    for y in range(23, 33): g[y][15] = 'h' if y < 31 else 'g'; g[y][16] = 'i' if y < 28 else 'h'; g[y][17] = '0'; g[y][14] = '0' if g[y][14] == '.' else g[y][14]
    g[32][15] = '0'; g[32][16] = '0'
    return [''.join(r) for r in g]
FRAMES = [ribs(f) for f in FRAMES]
