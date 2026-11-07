/* 分享卡：Canvas 手绘，无外部依赖 */
window.MysticShare = (function () {
  const W = 1080;
  const PAD = 84;
  const INNER = W - PAD * 2;
  const S = 2;

  function wrap(ctx, text, maxW) {
    const out = [];
    let line = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "\n") { out.push(line); line = ""; continue; }
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = ch; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  function ctx2d(w, h) {
    const cv = document.createElement("canvas");
    if (!cv.getContext) return null;
    const c = cv.getContext("2d");
    if (!c) return null;
    cv.width = w * S;
    cv.height = h * S;
    c.scale(S, S);
    return { cv, c };
  }

  /* 直接画六爻：不依赖字体里的 ䷀ 区段 */
  function drawHex(ctx, cx, top, bin, changes) {
    const barW = 210;
    const barH = 15;
    const gapY = 27;
    const left = cx - barW / 2;
    const ch = changes || [];
    for (let row = 0; row < 6; row++) {
      const idx = 5 - row;                       // bin 是自下而上
      const isYang = bin.charAt(idx) === "1";
      const dong = ch.indexOf(idx) !== -1;
      const y = top + row * gapY;
      ctx.fillStyle = dong ? "#c9a86a" : "#e6d3ac";
      if (isYang) {
        ctx.fillRect(left, y, barW, barH);
      } else {
        const half = (barW - 34) / 2;
        ctx.fillRect(left, y, half, barH);
        ctx.fillRect(left + half + 34, y, half, barH);
      }
    }
  }

  function build(data) {
    const probe = ctx2d(10, 10);
    if (!probe) return null;
    const meas = probe.c;

    const hasSymbol = !!data.hex;
    const tags = data.tags || [];
    const cols = data.cols || [];
    const rows = data.rows || [];

    /* ---- 量高 ---- */
    meas.font = "27px 'Noto Serif SC', serif";
    let h = PAD + 8 + 92;                                  // 品牌行
    if (hasSymbol) h += 190;                               // 卦画
    h += 84;                                               // 标题
    if (data.headline) h += 56;                            // 副标
    if (tags.length) {
      meas.font = "22px 'Noto Serif SC', serif";
      let tw = 0, lines = 1;
      tags.forEach(function (t) {
        const w = meas.measureText(t).width + 34;
        if (tw + w > INNER) { lines++; tw = w; } else tw += w;
      });
      h += lines * 52 + 10;
    }
    if (cols.length) {
      let maxItems = 0;
      cols.forEach(function (c) { maxItems = Math.max(maxItems, (c.items || []).length); });
      const perRow = 4;
      const itemLines = Math.max(1, Math.ceil(maxItems / perRow));
      h += 44 + itemLines * 46 + 24;
    }
    rows.forEach(function (r) {
      meas.font = "27px 'Noto Serif SC', serif";
      h += 40;
      h += wrap(meas, r.text, INNER).length * 44;
      h += 18;
    });
    h += 40 + 26;
    meas.font = "20px 'Noto Serif SC', serif";
    h += wrap(meas, data.footer || "mystic", INNER).length * 32;
    h += PAD;

    const made = ctx2d(W, h);
    if (!made) return null;
    const cv = made.cv, ctx = made.c;
    ctx.textBaseline = "top";

    /* ---- 背景 ---- */
    const g = ctx.createLinearGradient(0, 0, W, h);
    g.addColorStop(0, "#12162a");
    g.addColorStop(0.55, "#0b0d14");
    g.addColorStop(1, "#07080d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, h);

    /* 顶部细线 */
    ctx.strokeStyle = "rgba(201,168,106,.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, PAD - 26);
    ctx.lineTo(W - PAD, PAD - 26);
    ctx.stroke();

    let y = PAD + 8;

    /* 品牌 + 日期 */
    ctx.fillStyle = "#c9a86a";
    ctx.font = "600 24px 'Noto Serif SC', serif";
    ctx.textAlign = "left";
    ctx.fillText("MYSTIC", PAD, y);
    ctx.fillStyle = "#6f7286";
    ctx.font = "22px 'Noto Serif SC', serif";
    ctx.textAlign = "right";
    ctx.fillText(data.date || "", W - PAD, y);
    ctx.textAlign = "left";
    y += 92;

    /* 卦画 */
    if (hasSymbol) {
      drawHex(ctx, W / 2, y + 6, data.hex, data.changes);
      ctx.textAlign = "left";
      y += 190;
    }

    /* 标题 */
    ctx.fillStyle = "#e8e4dc";
    ctx.font = "600 46px 'Noto Serif SC', serif";
    ctx.textAlign = hasSymbol ? "center" : "left";
    ctx.fillText(data.title || "", hasSymbol ? W / 2 : PAD, y);
    y += 84;

    /* 副标 */
    if (data.headline) {
      ctx.fillStyle = "#a99a7e";
      ctx.font = "24px 'Noto Serif SC', serif";
      ctx.textAlign = hasSymbol ? "center" : "left";
      ctx.fillText(data.headline, hasSymbol ? W / 2 : PAD, y);
      y += 56;
    }
    ctx.textAlign = "left";

    /* 标签 */
    if (tags.length) {
      ctx.font = "22px 'Noto Serif SC', serif";
      let tx = PAD, ty = y;
      tags.forEach(function (t) {
        const tw = ctx.measureText(t).width + 34;
        if (tx + tw > W - PAD) { tx = PAD; ty += 52; }
        ctx.strokeStyle = "rgba(201,168,106,.45)";
        ctx.fillStyle = "rgba(201,168,106,.10)";
        const rr = 14;
        ctx.beginPath();
        ctx.moveTo(tx + rr, ty);
        ctx.arcTo(tx + tw, ty, tx + tw, ty + 38, rr);
        ctx.arcTo(tx + tw, ty + 38, tx, ty + 38, rr);
        ctx.arcTo(tx, ty + 38, tx, ty, rr);
        ctx.arcTo(tx, ty, tx + tw, ty, rr);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#c9a86a";
        ctx.fillText(t, tx + 17, ty + 8);
        tx += tw + 10;
      });
      y = ty + 52 + 10;
    }

    /* 两栏（如宜 / 忌） */
    if (cols.length) {
      const cw = (INNER - 24) / 2;
      cols.forEach(function (col, ci) {
        const cx = PAD + ci * (cw + 24);
        ctx.fillStyle = ci === 0 ? "#8fbf9a" : "#c98b8b";
        ctx.font = "600 22px 'Noto Serif SC', serif";
        ctx.fillText(col.label, cx, y);
        let iy = y + 44;
        let ix = cx;
        (col.items || []).forEach(function (it) {
          const tw = ctx.measureText(it).width + 26;
          if (ix + tw > cx + cw) { ix = cx; iy += 46; }
          ctx.fillStyle = "rgba(255,255,255,.05)";
          ctx.fillRect(ix, iy - 2, tw, 38);
          ctx.fillStyle = "#cfcbc2";
          ctx.font = "22px 'Noto Serif SC', serif";
          ctx.fillText(it, ix + 13, iy + 6);
          ix += tw + 8;
        });
      });
      y += 44 + Math.max(1, Math.ceil(Math.max.apply(null, cols.map(function (c) { return (c.items || []).length; })) / 4)) * 46 + 24;
    }

    /* 内容行 */
    rows.forEach(function (r) {
      ctx.fillStyle = "#8d7648";
      ctx.font = "600 22px 'Noto Serif SC', serif";
      ctx.fillText(r.label, PAD, y);
      y += 40;

      ctx.fillStyle = "#cfcbc2";
      ctx.font = "27px 'Noto Serif SC', serif";
      wrap(ctx, r.text, INNER).forEach(function (ln) {
        ctx.fillText(ln, PAD, y);
        y += 44;
      });
      y += 18;
    });

    /* 页脚 */
    y += 40;
    ctx.strokeStyle = "rgba(60,66,88,.8)";
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 26;

    ctx.fillStyle = "#6d7085";
    ctx.font = "20px 'Noto Serif SC', serif";
    wrap(ctx, data.footer || "mystic · 塔罗 / 星盘 / 黄历 / 易经", INNER).forEach(function (ln) {
      ctx.fillText(ln, PAD, y);
      y += 32;
    });

    return cv;
  }

  function fileName(base) {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return (base || "mystic") + "-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + ".png";
  }

  function download(canvas, base) {
    if (!canvas) return false;
    try {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = fileName(base);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (e) { return false; }
  }

  return { build: build, download: download };
})();
