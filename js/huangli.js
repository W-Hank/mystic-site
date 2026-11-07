/* 黄历：解包 2024–2035 数据 + 干支/建除/冲煞/彭祖/节气 */
window.MysticHuangli = (function () {
  const H = window.HUANGLI;

  const STEMS = "甲乙丙丁戊己庚辛壬癸";
  const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

  const JQ = ["立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
    "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"];

  const YELLOW = { "青龙": 1, "明堂": 1, "金匮": 1, "天德": 1, "玉堂": 1, "司命": 1 };

  const PENG_GAN = ["甲不开仓 财物耗散", "乙不栽植 千株不长", "丙不修灶 必见灾殃", "丁不剃头 头必生疮",
    "戊不受田 田主不祥", "己不破券 二比并亡", "庚不经络 织机虚张", "辛不合酱 主人不尝",
    "壬不泱水 更难提防", "癸不词讼 理弱敌强"];
  const PENG_ZHI = ["子不问卜 自惹祸殃", "丑不冠带 主不还乡", "寅不祭祀 神鬼不尝", "卯不穿井 水泉不香",
    "辰不哭泣 必主重丧", "巳不远行 财物伏藏", "午不苫盖 屋主更张", "未不服药 毒气入肠",
    "申不安床 鬼祟入房", "酉不会客 醉坐颠狂", "戌不吃犬 作怪上床", "亥不嫁娶 不利新郎"];

  const SHA = { "子": "南", "丑": "东", "寅": "北", "卯": "西", "辰": "南", "巳": "东",
                "午": "北", "未": "西", "申": "南", "酉": "东", "戌": "北", "亥": "西" };

  const MONTH_CN = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
  const DAY_CN = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

  let bytes = null;
  function load() {
    if (bytes) return bytes;
    const bin = atob(H.data);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  const START_UTC = Date.UTC(2024, 0, 1);

  function idxOf(y, m, d) {
    const i = Math.round((Date.UTC(y, m - 1, d) - START_UTC) / 86400000);
    return (i >= 0 && i < H.days) ? i : -1;
  }

  function jqIndexOf(sunLon) {
    return Math.floor(((((sunLon - 315) % 360) + 360) % 360) / 15);
  }

  function day(y, m, d) {
    const i = idxOf(y, m, d);
    if (i < 0) return null;

    const b = load(), o = i * 9;
    const mc = b[o], ld = b[o + 1], go = b[o + 2];
    const god = H.gods[go >> 4], officer = H.officers[go & 15];
    const yiBits = (b[o + 3] << 16) | (b[o + 4] << 8) | b[o + 5];
    const jiBits = (b[o + 6] << 16) | (b[o + 7] << 8) | b[o + 8];
    const yi = [], ji = [];
    H.items.forEach(function (w, k) {
      if (yiBits & (1 << k)) yi.push(w);
      if (jiBits & (1 << k)) ji.push(w);
    });

    const A = window.MysticAstro;
    const gz = A.ganzhiOf(y, m, d);
    const gan = gz.charAt(0), zhi = gz.charAt(1);
    const gi = STEMS.indexOf(gan), zi = BRANCHES.indexOf(zhi);

    const chatZhi = BRANCHES[(zi + 6) % 12];

    const jd0 = A.toJD(y, m, d, 0, 0, 8);
    const jd1 = A.toJD(y, m, d, 23.9, 0, 8);
    const k0 = jqIndexOf(A.sunLon(jd0)), k1 = jqIndexOf(A.sunLon(jd1));

    const lm = mc > 12 ? mc - 12 : mc;
    const isLeap = mc > 12;

    return {
      solar: { y: y, m: m, d: d },
      lunarMonth: lm,
      lunarMonthLeap: isLeap,
      lunarDay: ld,
      lunarText: (isLeap ? "闰" : "") + MONTH_CN[lm - 1] + "月" + DAY_CN[ld - 1],
      ganzhiDay: gz,
      ganzhiYear: A.ganzhiOf(y, 1, 1),
      god: god,
      godKind: YELLOW[god] ? "黄道" : "黑道",
      officer: officer,
      clash: "冲" + ZODIAC[(zi + 6) % 12] + "（" + chatZhi + "）",
      sha: "煞" + (SHA[zhi] || ""),
      pengGan: PENG_GAN[gi],
      pengZhi: PENG_ZHI[zi],
      peng: PENG_GAN[gi] + "；" + PENG_ZHI[zi],
      jieqi: (k0 !== k1) ? JQ[k1] : "",
      jieqiNow: JQ[k1],
      yi: yi,
      ji: ji
    };
  }

  function range(y, m, d, n) {
    const out = [];
    const base = new Date(y, m - 1, d);
    for (let i = 0; i < n; i++) {
      const t = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const r = day(t.getFullYear(), t.getMonth() + 1, t.getDate());
      if (r) { r.date = t; out.push(r); }
    }
    return out;
  }

  return { day: day, range: range, JQ: JQ, MONTH_CN: MONTH_CN, DAY_CN: DAY_CN,
           minYear: 2024, maxYear: 2035, items: H.items };
})();
