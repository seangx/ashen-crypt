/* 进战斗把主页整个隐藏（Sean t183u）：RUN 期间底栏、营地面板、主页窗口全收起，战斗区铺满整屏；
   底部 HUD（血球 / 灵魂球 / 齿轮 / 触发槽 / 经验条 / 提示）整体下移 NAV_H，摇杆区一直延伸到屏幕底。
   局中想看装备：齿轮面板里原有的「菜单」照旧能打开（之前就有）。打完 → 结算窗 → 关掉后 RUN 清空，主页回来。 */
{
  const P = MobileUI.prototype, _up = P.updateHud;
  const full = () => !!RUN; // 结算窗没有关闭键，底栏就是它的出口：RUN 一清空底栏就回来
  P.botH = function () { return full(this) ? 0 : NAV_H; };
  P.updateHud = function () {
    const run = !!RUN;
    if (run && !this._runFull) { // 刚进战斗：营地里开着的窗 / 弹窗 / 齿轮面板都关掉
      if (this.winId && this.winId !== 'summary') this.closeWin(true); else this.closePopup();
      this.setSide(false);
    }
    this._runFull = run;
    _up.call(this);
    const off = full(this) ? NAV_H : 0;
    if (this.navC) this.navC.setVisible(!full(this));
    for (const k of ['hpOrb', 'soulOrb', 'sideBtn', 'sideC', 'xpG', 'gdT', 'spinC', 'trigHudC', 'autoT', 'feedC']) {
      const o = this[k]; if (!o) continue; if (o._y0 === undefined) o._y0 = o.y; o.y = o._y0 + off;
    }
    if (this.sideBack) this.sideBack.setSize(W, H - this.botH());
  };
}
