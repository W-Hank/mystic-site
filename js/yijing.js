/* 易经：三枚铜钱起卦 + 六十四卦 + 朱熹《周易本义》变爻取用 */
window.MysticYijing = (function () {
  const D = window.YIJING;
  const byBin = {};
  D.list.forEach(function (h) { byBin[h.bin] = h; });

  const TRI_DE = { "乾": "健", "兑": "悦", "离": "丽", "震": "动", "巽": "入", "坎": "陷", "艮": "止", "坤": "顺" };
  const POS_MEAN = [
    "初爻在事情的最底下，还没成形，属于「刚起念」的阶段。",
    "二爻在内部，是一件事的根基，位置本身比较稳。",
    "三爻在内外交界，是最容易出错、也最容易用力过猛的地方。",
    "四爻刚进入外部，开始被人看见，位置不安。",
    "五爻是主位，力量最大，但也最讲究正当性。",
    "上爻已经到顶，过犹不及，通常意味着该收了。"
  ];

  /* 三枚铜钱：字面为阴(2)，背面为阳(3)，一掷之和为 6/7/8/9 */
  function toss() {
    let s = 0;
    for (let i = 0; i < 3; i++) s += (Math.random() < 0.5 ? 2 : 3);
    return s;
  }

  function linesOf(vals) {
    // 6 老阴(变) 7 少阳 8 少阴 9 老阳(变)
    return vals.map(function (v) { return (v === 7 || v === 9) ? 1 : 0; });
  }

  function cast(vals) {
    if (!vals) { vals = []; for (let i = 0; i < 6; i++) vals.push(toss()); }
    const benLines = linesOf(vals);
    const bianLines = vals.map(function (v, i) {
      if (v === 6) return 1;
      if (v === 9) return 0;
      return benLines[i];
    });
    const binBen = benLines.join("");
    const binBian = bianLines.join("");
    const ben = byBin[binBen], bian = byBin[binBian];
    const changes = [];
    vals.forEach(function (v, i) { if (v === 6 || v === 9) changes.push(i); });

    const rule = ruleOf(changes.length, ben, bian);
    const parts = buildParts(vals, ben, bian, changes, rule);

    return {
      vals: vals, benLines: benLines, bianLines: bianLines,
      ben: ben, bian: bian, changes: changes, rule: rule, parts: parts,
      changing: changes.length > 0
    };
  }

  function ruleOf(n, ben, bian) {
    const map = {
      0: "六爻都不动——只看本卦的卦辞。局面是稳的，眼下不会突变。",
      1: "一爻动——以这一爻的爻辞为主。整件事的转折就落在这一点上。",
      2: "两爻动——两爻都看，以上面那一爻为主。",
      3: "三爻动——本卦与变卦的卦辞都看：这是局面在整体翻转。",
      4: "四爻动——看变卦里两个不动的爻，以下面那个为主。",
      5: "五爻动——看变卦里唯一不动的那一爻。",
      6: "六爻全动——乾卦看「用九」，坤卦看「用六」，其余看变卦的卦辞。"
    };
    return { n: n, text: map[n] };
  }

  function yaoOf(hex, idx) {
    const y = hex.yao[idx] || "";
    return y;
  }

  function buildParts(vals, ben, bian, changes, rule) {
    const parts = [];
    const n = changes.length;

    if (n === 0) {
      parts.push({ label: "卦辞", text: ben.gua });
    } else if (n === 1) {
      const i = changes[0];
      parts.push({ label: "变爻（第 " + (i + 1) + " 爻）", text: yaoOf(ben, i) });
    } else if (n === 2) {
      const a = changes[0], b = changes[1];
      parts.push({ label: "次爻（第 " + (a + 1) + " 爻）", text: yaoOf(ben, a) });
      parts.push({ label: "主爻（第 " + (b + 1) + " 爻）", text: yaoOf(ben, b) });
    } else if (n === 3) {
      parts.push({ label: "本卦卦辞", text: ben.gua });
      parts.push({ label: "变卦卦辞", text: bian.gua });
    } else if (n === 4 || n === 5) {
      const still = [0, 1, 2, 3, 4, 5].filter(function (i) { return changes.indexOf(i) === -1; });
      if (n === 4) {
        parts.push({ label: "次爻（" + (still[0] + 1) + " 爻，看变卦）", text: yaoOf(bian, still[0]) });
        parts.push({ label: "主爻（" + (still[1] + 1) + " 爻，看变卦）", text: yaoOf(bian, still[1]) });
      } else {
        parts.push({ label: "唯一不动的那一爻（第 " + (still[0] + 1) + " 爻，看变卦）", text: yaoOf(bian, still[0]) });
      }
    } else {
      if (ben.name === "乾") parts.push({ label: "用九", text: ben.yao[6] || "见群龙无首，吉。" });
      else if (ben.name === "坤") parts.push({ label: "用六", text: ben.yao[6] || "利永贞。" });
      else parts.push({ label: "变卦卦辞", text: bian.gua });
    }
    return parts;
  }

  function readingLine(r) {
    const b = r.ben, v = r.bian;
    const structure = "上卦" + b.upper + "（" + TRI_DE[b.upper] + "），下卦" + b.lower + "（" + TRI_DE[b.lower] + "）——" +
      "外面是" + TRI_DE[b.upper] + "，里面是" + TRI_DE[b.lower] + "。";
    return structure;
  }

  return { cast: cast, toss: toss, byBin: function (bin) { return byBin[bin]; },
           TRI_DE: TRI_DE, POS_MEAN: POS_MEAN, readingLine: readingLine, list: D.list };
})();
