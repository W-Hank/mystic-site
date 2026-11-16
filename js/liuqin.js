/* 纳甲六爻：六亲 + 世应 + 用神
   规则取自通行纳甲法：八宫定五行，八宫卦序定世应，纳甲定地支，地支五行定六亲。 */
window.MysticLiuqin = (function () {
  const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const ZHI_WX = {
    子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
    午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水"
  };

  /* 八卦：底→顶，1 为阳 */
  const TRI = {
    乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0],
    巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0]
  };
  const TRI_WX = { 乾: "金", 兑: "金", 离: "火", 震: "木", 巽: "木", 坎: "水", 艮: "土", 坤: "土" };

  /* 纳甲：内卦三爻、外卦三爻的地支 */
  const NAJIA = {
    乾: [["子", "寅", "辰"], ["午", "申", "戌"]],
    震: [["子", "寅", "辰"], ["午", "申", "戌"]],
    坎: [["寅", "辰", "午"], ["申", "戌", "子"]],
    艮: [["辰", "午", "申"], ["戌", "子", "寅"]],
    坤: [["未", "巳", "卯"], ["丑", "亥", "酉"]],
    巽: [["丑", "亥", "酉"], ["未", "巳", "卯"]],
    离: [["卯", "丑", "亥"], ["酉", "未", "巳"]],
    兑: [["巳", "卯", "丑"], ["亥", "酉", "未"]]
  };

  const KEY = t => t.join("");
  const BIN2TRI = {};
  Object.keys(TRI).forEach(k => { BIN2TRI[KEY(TRI[k])] = k; });

  /* 生成八宫六十四卦：宫、世次、世应位置 */
  const palaceOf = {};   // bin -> {palace, wx, shi, ying, name}
  (function build() {
    Object.keys(TRI).forEach(palace => {
      const base = TRI[palace].concat(TRI[palace]); // 八纯卦：上下同
      const seq = [];
      const flip = (arr, idxs) => arr.map((v, i) => (idxs.indexOf(i) >= 0 ? 1 - v : v));

      seq.push({ lines: base.slice(), shiShi: 0 });                    // 本宫
      for (let n = 1; n <= 5; n++) {                                    // 一世～五世
        seq.push({ lines: flip(base, Array.from({ length: n }, (_, i) => i)), shiShi: n });
      }
      // 游魂：五世卦第四爻变回
      const wushi = flip(base, [0, 1, 2, 3, 4]);
      seq.push({ lines: wushi.map((v, i) => (i === 3 ? 1 - v : v)), shiShi: 6 });
      // 归魂：游魂的下三爻归位
      const youhun = wushi.map((v, i) => (i === 3 ? 1 - v : v));
      seq.push({ lines: base.slice(0, 3).concat(youhun.slice(3, 6)), shiShi: 7 });

      const SHI_POS = [5, 0, 1, 2, 3, 4, 3, 2];  // 六爻=index5；一世=index0 …
      seq.forEach(item => {
        const bin = item.lines.join("");
        if (palaceOf[bin]) return;
        const shiIdx = SHI_POS[item.shiShi];
        palaceOf[bin] = {
          palace: palace,
          wx: TRI_WX[palace],
          shiShi: item.shiShi,
          shi: shiIdx,
          ying: (shiIdx + 3) % 6
        };
      });
    });
  })();

  /* 六亲：以宫五行为「我」 */
  function relation(my, other) {
    const gen = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };  // 我生
    const ke = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };   // 我克
    if (my === other) return "兄弟";
    if (gen[my] === other) return "子孙";
    if (gen[other] === my) return "父母";
    if (ke[my] === other) return "妻财";
    if (ke[other] === my) return "官鬼";
    return "";
  }

  function analyze(benLines) {
    const bin = benLines.join("");
    const meta = palaceOf[bin];
    if (!meta) return null;

    const lower = BIN2TRI[benLines.slice(0, 3).join("")];
    const upper = BIN2TRI[benLines.slice(3, 6).join("")];
    if (!lower || !upper) return null;

    const lowerZhi = NAJIA[lower][0];
    const upperZhi = NAJIA[upper][1];
    const zhis = lowerZhi.concat(upperZhi);

    const lines = [];
    for (let i = 0; i < 6; i++) {
      const zhi = zhis[i];
      const wx = ZHI_WX[zhi];
      lines.push({
        idx: i,
        yang: benLines[i] === 1,
        zhi: zhi,
        wx: wx,
        liuqin: relation(meta.wx, wx),
        shi: i === meta.shi,
        ying: i === meta.ying
      });
    }

    return {
      palace: meta.palace,
      wx: meta.wx,
      shiShi: meta.shiShi,
      shi: meta.shi,
      ying: meta.ying,
      lower: lower,
      upper: upper,
      lines: lines
    };
  }

  /* 用神：按问题里的词猜该看哪一爻 */
  function yongshen(question, analysis) {
    const q = String(question || "");
    const YS = [
      { k: "妻财", re: /钱|工资|收入|生意|买卖|投资|奖金|债|财|价格|赚/ },
      { k: "官鬼", re: /工作|职位|升职|面试|考试|官|诉讼|官司|领导|客户|病|疾病/ },
      { k: "父母", re: /房|房子|合同|文书|证件|学业|学校|父母|长辈|车|手续/ },
      { k: "子孙", re: /孩子|怀孕|健康|身体|宠物|学生|徒弟|解忧/ },
      { k: "兄弟", re: /朋友|合伙|兄弟|同事|竞争|借钱/ }
    ];
    for (const y of YS) {
      if (y.re.test(q)) {
        const hits = analysis ? analysis.lines.filter(l => l.liuqin === y.k) : [];
        return { key: y.k, hits: hits, why: ysWhy(y.k) };
      }
    }
    return null;
  }

  function ysWhy(k) {
    return {
      妻财: "问钱、问生意，看妻财爻",
      官鬼: "问工作、考试、官司、病，看官鬼爻",
      父母: "问房子、合同、文书、学业，看父母爻",
      子孙: "问孩子、健康、宠物，看子孙爻",
      兄弟: "问朋友、合伙、竞争，看兄弟爻"
    }[k] || "";
  }

  return { analyze: analyze, yongshen: yongshen, ZHI_WX: ZHI_WX };
})();
