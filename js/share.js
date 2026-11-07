/* 分享卡：Canvas 手绘，无外部依赖 */
window.MysticShare = (function () {
  const W = 1080;
  const PAD = 84;
  const BG = "#0b0d14";

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 按字符宽度折行（中文逐字，英文按空格） */
  function wrap(ctx, text, maxW) {
    const out = [];
    let line = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "\n") { out.push(line); line = ""; continue; }
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    return out;
  }

  function build(data) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return null;

    const S = 2;               // 2x 高清
    const innerW = W - PAD * 2;

    /* 先量高度 */
    const meas = document.createElement("canvas").getContext && document.createElement("canvas").getContext("2d");
    if (!meas) return null;
    meas.font = "28px 'Noto Serif SC', serif";

    let h = PAD + 8;                                // 起点
    h += 92;                                        // 品牌 + 日期
    h += 84;                                        // 标题
    if (data.headline) h += 96;                     // 主字
    (data.rows || []).forEach(r => {
      h += 40;                                      // 小标
      h += wrap(meas, r.text, innerW).length * 44;
      h += 18;                                      // 行距
    });
    h += 40 + 26;                                   // 分隔线 + 间距
    h += wrap(meas, data.footer || "mystic · 塔罗 / 星盘 / 黄历 / 易经", innerW).length * 32;
    h += PAD;

    canvas.width = W * S;
    canvas.height = h * S;
    ctx.scale(S, S);

    /* 背景 */
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
    ctx.textBaseline = "top";
    ctx.fillText("MYSTIC", PAD, y);
    ctx.fillStyle = "#6f7286";
    ctx.font = "22px 'Noto Serif SC', serif";
    ctx.textAlign = "right";
    ctx.fillText(data.date || "", W - PAD, y);
    ctx.textAlign = "left";
    y += 92;

    /* 标题 */
    ctx.fillStyle = "#e8e4dc";
    ctx.font = "600 46px 'Noto Serif SC', serif";
    ctx.fillText(data.title || "", PAD, y);
    y += 84;

    /* 主字 */
    if (data.headline) {
      ctx.fillStyle = "#d8b98a";
      ctx.font = "600 54px 'Noto Serif SC', serif";
      ctx.fillText(data.headline, PAD, y);
      y += 96;
    }

    /* 内容行 */
    (data.rows || []).forEach(r => {
      ctx.fillStyle = "#8d7648";
      ctx.font = "600 22px 'Noto Serif SC', serif";
      ctx.fillText(r.label, PAD, y);
      y += 40;

      ctx.fillStyle = "#cfcbc2";
      ctx.font = "27px 'Noto Serif SC', serif";
      const lines = wrap(ctx, r.text, innerW);
      lines.forEach(ln => {
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
    wrap(ctx, data.footer || "mystic · 塔罗 / 星盘 / 黄历 / 易经", innerW).forEach(ln => {
      ctx.fillText(ln, PAD, y);
      y += 32;
    });

    return canvas;
  }

  function fileName(base) {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return (base || "mystic") + "-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + ".png";
  }

  function download(canvas, base) {
    if (!canvas) return false;
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(base);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (e) {
      return false;
    }
  }

  function share(canvas, base) {
    if (!canvas || !canvas.toBlob) return Promise.resolve(false);
    return new Promise(resolve => {
      canvas.toBlob(function (blob) {
        if (!blob) return resolve(false);
        const file = new File([blob], fileName(base), { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).then(() => resolve(true)).catch(() => resolve(false));
        } else resolve(false);
      }, "image/png");
    });
  }

  return { build: build, download: download, share: share };
})();
