/* 营地“当前目标”横幅（system-v2 §8）：顶栏丝带下面一行小字，点开看这一阶段的 3 个目标和完成情况 */
{
  const _bh = MobileUI.prototype.buildHud, _uh = MobileUI.prototype.updateHud;
  MobileUI.prototype.buildHud = function () {
    _bh.call(this);
    this.goalT = T(this, W / 2, 23, '', { size: 8, align: 'center', color: '#ffd9a0', parent: this.topC });
    zoneOn(this, this.topC, 30, 20, W - 60, 13, () => { if (RUN) return; const g = stageGoals();
      this.ask(`当前目标 · ${g.stage}`, () => {}, '知道了', g.goals.map(([t, ok]) => `${ok ? '✓' : '·'} ${t}`).join('\n') + (g.need ? `\n面板提示：${g.need}最缺` : '')); });
  };
  MobileUI.prototype.updateHud = function () {
    _uh.call(this); if (!this.goalT) return;
    if (RUN || this.winId) { if (this.goalT.text) this.goalT.setText(''); return; }
    if ((this.goalAt || 0) > G.time && this.goalT.text) return; this.goalAt = G.time + 1; // 每秒算一次
    const s = '目标：' + stageGoals().line; if (this.goalT.text !== s) this.goalT.setText(s);
  };
}
