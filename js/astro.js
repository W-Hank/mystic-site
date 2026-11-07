/* 星位计算：太阳/月亮/水星/金星/火星/木星/土星 + 上升 + 主要相位
   算法：JPL 近似开普勒根数（1800–2050）+ Meeus 月球简化级数 + 标准上升点公式
   精度：行星黄经约 ±0.3°，月亮约 ±0.4°，星座层面足够；上升点依赖出生时间与经纬度 */
window.MysticAstro = (function () {

  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  const SIGNS = [
    { cn: "白羊", en: "Aries", el: "火", mode: "基本", ruler: "火星", kw: ["直", "快", "先动"],
      d: "第一反应永远是「那我先上」。不太会等，也不太会藏。" },
    { cn: "金牛", en: "Taurus", el: "土", mode: "固定", ruler: "金星", kw: ["稳", "慢", "实在"],
      d: "信得过的是手感和时间，不是承诺。决定慢，但定了就不太动。" },
    { cn: "双子", en: "Gemini", el: "风", mode: "变动", ruler: "水星", kw: ["说", "换", "好奇"],
      d: "靠说话和交换信息靠近人。兴趣来得快，走神也快。" },
    { cn: "巨蟹", en: "Cancer", el: "水", mode: "基本", ruler: "月亮", kw: ["护", "软", "记"],
      d: "先看你会不会伤人，再决定要不要让你靠近。壳很厚，里面很软。" },
    { cn: "狮子", en: "Leo", el: "火", mode: "固定", ruler: "太阳", kw: ["亮", "给了就要被看见"],
      d: "愿意给，但不能被当成理所当然。面子是真的重要。" },
    { cn: "处女", en: "Virgo", el: "土", mode: "变动", ruler: "水星", kw: ["细", "挑", "做"],
      d: "用「帮上忙」来表达在意。挑剔往往是紧张，不是嫌弃。" },
    { cn: "天秤", en: "Libra", el: "风", mode: "基本", ruler: "金星", kw: ["权衡", "体面", "不好拒绝"],
      d: "在意关系里的平衡和体面，所以最难说的是「不」。" },
    { cn: "天蝎", en: "Scorpio", el: "水", mode: "固定", ruler: "冥王星", kw: ["深", "全或无", "看穿"],
      d: "要么不进，进了就全给。最不能忍的是被糊弄。" },
    { cn: "射手", en: "Sagittarius", el: "火", mode: "变动", ruler: "木星", kw: ["远", "直", "跑"],
      d: "喜欢把人往更大的世界里带。被管住就想跑。" },
    { cn: "摩羯", en: "Capricorn", el: "土", mode: "基本", ruler: "土星", kw: ["忍", "担", "慢热"],
      d: "先看这件事靠不靠得住，再谈喜不喜欢。热得很慢，但很久。" },
    { cn: "水瓶", en: "Aquarius", el: "风", mode: "固定", ruler: "天王星", kw: ["疏", "独特", "讲理"],
      d: "需要被理解，不需要被照顾。亲密里也要留一条自己的通道。" },
    { cn: "双鱼", en: "Pisces", el: "水", mode: "变动", ruler: "海王星", kw: ["融", "感", "退"],
      d: "很容易感到别人的情绪，也因此容易先退一步。" }
  ];

  const EL_NOTE = {
    火: "火象：靠行动和热度推进，怕的是没反应。",
    土: "土象：靠具体和稳定推进，怕的是空承诺。",
    风: "风象：靠对话和信息推进，怕的是沉闷。",
    水: "水象：靠情绪共鸣推进，怕的是被敷衍。"
  };

  function toJD(y, m, d, h, mi, tzHours) {
    const ut = h + mi / 60 - tzHours;
    let Y = y, M = m;
    if (M <= 2) { Y -= 1; M += 12; }
    const A = Math.floor(Y / 100), B = 2 - A + Math.floor(A / 4);
    const jd0 = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5;
    return jd0 + ut / 24;
  }

  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  /* JPL 近似根数：a, e, I, L, peri(ϖ), node(Ω) + 每世纪变率 */
  const EL = {
    mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593,
              0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    venus:   [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255,
              0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    earth:   [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0,
              0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    mars:    [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
              0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
              -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    saturn:  [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448,
              -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]
  };

  function helio(key, T) {
    const e0 = EL[key];
    const a = e0[0] + e0[6] * T;
    const e = e0[1] + e0[7] * T;
    const I = (e0[2] + e0[8] * T) * D2R;
    const L = norm(e0[3] + e0[9] * T);
    const peri = norm(e0[4] + e0[10] * T);
    const node = norm(e0[5] + e0[11] * T);
    const M = norm(L - peri) * D2R;
    const w = (peri - node) * D2R;
    // Kepler
    let E = M;
    for (let i = 0; i < 12; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xv = a * (Math.cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const v = Math.atan2(yv, xv), r = Math.hypot(xv, yv);
    const u = v + w;
    const x = r * (Math.cos(node * D2R) * Math.cos(u) - Math.sin(node * D2R) * Math.sin(u) * Math.cos(I));
    const y = r * (Math.sin(node * D2R) * Math.cos(u) + Math.cos(node * D2R) * Math.sin(u) * Math.cos(I));
    const z = r * Math.sin(u) * Math.sin(I);
    return { x, y, z };
  }

  function geoLon(key, jd) {
    const T = (jd - 2451545.0) / 36525;
    const p = helio(key, T), e = helio("earth", T);
    const dx = p.x - e.x, dy = p.y - e.y;
    const j2000 = Math.atan2(dy, dx) * R2D;
    // J2000 黄道 → 当日黄道（岁差），占星用的是当日黄道
    const prec = 1.396971 * T + 0.0003086 * T * T;
    return norm(j2000 + prec);
  }

  function sunLon(jd) {
    const n = jd - 2451545.0;
    const L = 280.460 + 0.9856474 * n;
    const g = (357.528 + 0.9856003 * n) * D2R;
    return norm(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  }

  function moonLon(jd) {
    const n = jd - 2451545.0;
    const Lp = 218.316 + 13.176396 * n;
    const M = (134.963 + 13.064993 * n) * D2R;
    const M1 = (357.529 + 0.98560028 * n) * D2R;
    const F = (93.272 + 13.229350 * n) * D2R;
    const Dm = (297.850 + 12.190749 * n) * D2R;
    return norm(Lp + 6.289 * Math.sin(M) + 1.274 * Math.sin(2 * Dm - M)
      + 0.658 * Math.sin(2 * Dm) + 0.214 * Math.sin(2 * M)
      - 0.186 * Math.sin(M1) - 0.114 * Math.sin(2 * F));
  }

  function obliquity(jd) {
    const T = (jd - 2451545.0) / 36525;
    return 23.439291 - 0.0130042 * T;
  }

  function ascendant(jd, latDeg, lonDegEast) {
    const gmst = norm(280.46061837 + 360.98564736629 * (jd - 2451545.0));
    const lst = norm(gmst + lonDegEast);
    const ramc = lst * D2R;
    const eps = obliquity(jd) * D2R;
    const phi = latDeg * D2R;
    const y = Math.cos(ramc);
    const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
    return norm(Math.atan2(y, x) * R2D);
  }

  function signOf(lon) {
    const i = Math.floor(norm(lon) / 30) % 12;
    const deg = norm(lon) % 30;
    return { i, sign: SIGNS[i], deg: Math.floor(deg), min: Math.round((deg - Math.floor(deg)) * 60) };
  }

  /* 相位 */
  const ASPECTS = [
    { n: "合", en: "conjunction", a: 0, orb: 8, kind: "合相" },
    { n: "六分", en: "sextile", a: 60, orb: 4, kind: "六分相" },
    { n: "四分", en: "square", a: 90, orb: 6, kind: "四分相" },
    { n: "三分", en: "trine", a: 120, orb: 6, kind: "三分相" },
    { n: "对冲", en: "opposition", a: 180, orb: 8, kind: "对冲相" }
  ];

  function aspectBetween(a, b) {
    let d = Math.abs(norm(a) - norm(b));
    if (d > 180) d = 360 - d;
    for (const asp of ASPECTS) {
      const off = Math.abs(d - asp.a);
      if (off <= asp.orb) return { asp, orb: off, exact: d };
    }
    return null;
  }

  function natal(y, m, d, h, mi, tz, lat, lon, hasTime, hasPlace) {
    const jd = toJD(y, m, d, h, mi, tz);
    const sun = sunLon(jd), moon = moonLon(jd);
    const bodies = [
      { key: "sun", cn: "太阳", lon: sun },
      { key: "moon", cn: "月亮", lon: moon },
      { key: "mercury", cn: "水星", lon: geoLon("mercury", jd) },
      { key: "venus", cn: "金星", lon: geoLon("venus", jd) },
      { key: "mars", cn: "火星", lon: geoLon("mars", jd) },
      { key: "jupiter", cn: "木星", lon: geoLon("jupiter", jd) },
      { key: "saturn", cn: "土星", lon: geoLon("saturn", jd) }
    ];
    let asc = null;
    if (hasTime && hasPlace !== false) asc = { key: "asc", cn: "上升", lon: ascendant(jd, lat, lon) };
    const all = asc ? bodies.concat([asc]) : bodies;
    all.forEach(b => { const s = signOf(b.lon); b.sign = s.sign; b.signIdx = s.i; b.deg = s.deg; b.min = s.min; });
    const asps = [];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const r = aspectBetween(all[i].lon, all[j].lon);
        if (r) asps.push({ a: all[i].cn, b: all[j].cn, kind: r.asp.kind, n: r.asp.n, orb: r.orb });
      }
    asps.sort((x, y) => x.orb - y.orb);
    // 只有日期时，算出这天的月亮会不会跨星座
    let moonSpan = null;
    if (!hasTime) {
      const jd0 = toJD(y, m, d, 0, 0, tz);
      const i0 = signOf(moonLon(jd0)).i, i1 = signOf(moonLon(jd0 + 0.9999)).i;
      moonSpan = { varying: i0 !== i1, a: SIGNS[i0].cn, b: SIGNS[i1].cn };
    }
    return { jd, bodies: all, aspects: asps.slice(0, 8), hasTime, moonSpan };
  }

  /* ---------- 解读 ---------- */
  function reading(ch) {
    const b = {}; ch.bodies.forEach(x => b[x.key] = x);
    const sun = b.sun, moon = b.moon, asc = b.asc;
    const out = [];
    out.push(`太阳${sun.sign.cn}（${sun.deg}°${sun.min}′）：${sun.sign.d}`);
    out.push(`月亮${moon.sign.cn}（${moon.deg}°${moon.min}′）：${moon.sign.d}月亮落${moon.sign.el}象，情绪上的第一需求是${moon.sign.kw.join("、")}。` +
      (moon.sign.el === "水" ? "这类人不舒服的时候不会说，会先缩小自己。" : moon.sign.el === "土" ? "这类人靠具体的东西确认安全，比如稳定的节奏和说到做到。" : moon.sign.el === "风" ? "这类人需要能一起说话的对象，沉默比争执更让他们退。" : "这类人情绪来得直接，最怕被晾着。"));
    if (asc) out.push(`上升${asc.sign.cn}（${asc.deg}°${asc.min}′）：这是她/他给外人的第一层壳——${asc.sign.d}不认识的人看到的是这一面，熟人看到的是月亮那一面。`);
    if (!ch.hasTime) {
      if (ch.moonSpan && ch.moonSpan.varying)
        out.push(`注意：只知道日期时，这天的月亮在${ch.moonSpan.a}与${ch.moonSpan.b}之间移动，单看月亮定不下来，这一项先别当依据；上升也不排——上升点一天转一整圈，缺了时间算出来的是假的。`);
      else
        out.push(`日期已经够定月亮（${moon.sign.cn}）。但没有出生时间就不排上升：上升点一天转一整圈，缺了时间算出来的那一格全是假的。`);
    }
    const gap = Math.abs(norm(sun.lon) - norm(moon.lon));
    const gd = gap > 180 ? 360 - gap : gap;
    if (gd > 60 && gd < 120) out.push(`日月中距（约${Math.round(gd)}°），说明这个人的「外在表达」和「内在需求」不完全一致——你需要同时照顾两张脸，只看一张会判断错。`);
    else out.push(`日月夹角约${Math.round(gd)}°，内外比较一致，你看到的差不多就是真的，不用太费劲去猜她的言外之意。`);
    return out;
  }

  function aspectLine(asps) {
    if (!asps.length) return "主要天体之间没有紧相位，性格比较分散，不太受单一模式支配。";
    const a = asps[0];
    const map = {
      "合相": `${a.a}与${a.b}合相（容许度${a.orb.toFixed(1)}°）——这两股力量是拧在一起的，分不开，也容易互相放大。`,
      "对冲相": `${a.a}与${a.b}对冲（容许度${a.orb.toFixed(1)}°）——力量在两头拉，这个人身上有很明显的矛盾感。`,
      "四分相": `${a.a}与${a.b}四分（容许度${a.orb.toFixed(1)}°）——内在有摩擦，通常是靠反复试错才长出来的那部分。`,
      "三分相": `${a.a}与${a.b}三分（容许度${a.orb.toFixed(1)}°）——这两块是顺的，用起来几乎不费力。`,
      "六分相": `${a.a}与${a.b}六分（容许度${a.orb.toFixed(1)}°）——稍微用点力就能联动，是个可用的通道。`
    };
    return map[a.kind] || "";
  }


  /* ---------- 每日行运 ---------- */
  const P_CN = { sun: "太阳", moon: "月亮", mercury: "水星", venus: "金星", mars: "火星", jupiter: "木星", saturn: "土星" };
  const P_W = { sun: 0.5, moon: 0.8, mercury: 0.6, venus: 0.9, mars: -0.7, jupiter: 1, saturn: -1 };

  function bodyLon(key, jd) {
    if (key === "sun") return sunLon(jd);
    if (key === "moon") return moonLon(jd);
    return geoLon(key, jd);
  }

  function retro(key, jd) {
    if (key === "sun" || key === "moon") return false;
    let d = norm(bodyLon(key, jd + 0.5) - bodyLon(key, jd - 0.5));
    if (d > 180) d -= 360;
    return d < 0;
  }

  function moonPhase(jd) {
    const ang = norm(moonLon(jd) - sunLon(jd));
    const names = ["新月", "娥眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"];
    const i = Math.floor(((ang + 22.5) % 360) / 45);
    return { angle: ang, name: names[i], illum: Math.round((1 - Math.cos(ang * D2R)) / 2 * 100) };
  }

  const ASP_W = { "合相": 0.5, "六分相": 0.6, "三分相": 1, "四分相": -0.9, "对冲相": -0.7 };

  function aspectsTo(lonPoint, jd) {
    const out = [];
    ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].forEach(k => {
      const r = aspectBetween(bodyLon(k, jd), lonPoint);
      if (r) out.push({ key: k, cn: P_CN[k], kind: r.asp.kind, n: r.asp.n, orb: r.orb });
    });
    out.sort((a, b) => a.orb - b.orb);
    return out;
  }

  function dip(a) {
    let base = ASP_W[a.kind];
    if (a.kind === "合相") base = P_W[a.key] > 0 ? 0.8 : -0.8;
    return base * Math.abs(P_W[a.key]) * Math.max(0.15, 1 - a.orb / 9);
  }

  function scoreOf(asps) { return asps.reduce((s, a) => s + dip(a), 0); }

  function toneOf(score) {
    if (score >= 1.1) return "顺";
    if (score >= 0.35) return "偏顺";
    if (score > -0.35) return "平";
    if (score > -1.1) return "偏卡";
    return "卡";
  }

  const NOTE = {
    venus: ["关系上的阻力最小，适合示好、约人、把话说软一点。",
            "别在感情上做大决定——容易把客气当成意思。"],
    jupiter: ["有扩张的口子，敢试的事今天试。",
              "容易高估，别答应超出能力的事。"],
    mars: ["有劲，适合啃硬骨头。",
           "容易起摩擦，话别说满。"],
    saturn: ["结构感好，适合定规矩、做长期安排。",
             "慢、堵、容易被压——今天适合做基础活，别求结果。"],
    mercury: ["沟通顺，适合发消息、谈事、把话说清楚。",
              "容易说错话、对不上频道——重要的话写完放十分钟再发。"],
    moon: ["情绪面顺，适合轻松相处。",
           "情绪起伏大，别在低落的时候做判断。"],
    sun: ["被看见的一天，适合站出来。",
          "会被注意到但不一定舒服，今天低调点。"]
  };

  function lineFor(asps, score) {
    if (!asps.length) return "今天没有紧相位——不是好也不是坏，是没什么在推你，节奏由你自己定。";
    const sorted = asps.slice().sort((a, b) => dip(b) - dip(a));
    const pick = score >= 0 ? sorted[0] : sorted[sorted.length - 1];
    const positive = dip(pick) >= 0;
    const note = (NOTE[pick.key] || ["", ""])[positive ? 0 : 1];
    return P_CN[pick.key] + pick.n + "你（容许度 " + pick.orb.toFixed(1) + "°）——" + note;
  }

  function dailySign(signIdx, jd) {
    const pt = signIdx * 30 + 15;
    const asps = aspectsTo(pt, jd);
    const sc = scoreOf(asps);
    return { signIdx, score: sc, tone: toneOf(sc), line: lineFor(asps, sc), asps: asps.slice(0, 3) };
  }

  function dailyForChart(ch, jd) {
    const ph = moonPhase(jd);
    const ms = signOf(moonLon(jd));
    const hits = [];
    const seen = new Set();
    const natalPts = ch.bodies.filter(b => b.key !== "asc").map(b => ({ key: b.key, cn: b.cn, lon: b.lon }));
    ["moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn"].forEach(tk => {
      const tl = bodyLon(tk, jd);
      natalPts.forEach(np => {
        if (np.key === tk) return;
        const pk = [tk, np.key].sort().join("-");
        if (seen.has(pk)) return;
        const r = aspectBetween(tl, np.lon);
        if (r && r.orb <= 5) { seen.add(pk); hits.push({ t: P_CN[tk], n: r.asp.n, kind: r.asp.kind, orb: r.orb, to: np.cn }); }
      });
    });
    hits.sort((a, b) => a.orb - b.orb);
    const asc = ch.bodies.find(b => b.key === "asc");
    const house = asc ? (((ms.i - asc.signIdx) + 12) % 12 + 1) : null;
    const retros = ["mercury", "venus", "mars", "jupiter", "saturn"].filter(k => retro(k, jd));
    return { phase: ph, moonSign: ms, house, hits: hits.slice(0, 5), retros };
  }

  const STEMS = "甲乙丙丁戊己庚辛壬癸", BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  function jdnOf(y, m, d) { return Math.floor(toJD(y, m, d, 12, 0, 0) + 0.5); }
  const GZ_REF = jdnOf(2026, 11, 7);
  function ganzhiOf(y, m, d) {
    const i = (((jdnOf(y, m, d) - GZ_REF) % 60) + 60 + 21) % 60;
    return STEMS[i % 10] + BRANCHES[i % 12];
  }

  function nowJD() { return Date.now() / 86400000 + 2440587.5; }

  // 本命盘 + 此刻的行运（jdNow 不传就是现在）
  function daily(y, m, d, h, mi, tz, lat, lon, hasTime, jdNow) {
    const jd = (jdNow == null) ? nowJD() : jdNow;
    const chart = natal(y, m, d, h, mi, tz, lat, lon, hasTime);
    const t = dailyForChart(chart, jd);
    t.jd = jd;
    t.chart = chart;
    return t;
  }

  function signGrid(jd) {
    const rows = SIGNS.map((sg, i) => dailySign(i, jd));
    const order = rows.slice().sort((a, b) => b.score - a.score);
    order.forEach((r, idx) => {
      r.rank = idx + 1;
      r.heat = idx < 3 ? "top" : (idx >= rows.length - 3 ? "bottom" : "mid");
    });
    return rows;
  }


  /* ---------- 分域运势：太阳星座当第一宫，整宫制 ---------- */
  const DOMAIN_DEF = {
    love:   { name: "爱情", houses: [5, 7] },
    career: { name: "事业", houses: [10, 6] },
    study:  { name: "学业", houses: [9, 3] },
    money:  { name: "财运", houses: [2, 8] },
    health: { name: "健康", houses: [6, 1] }
  };
  const DOMAIN_ORDER = ["love", "career", "study", "money", "health"];
  const PW = { venus: 1, jupiter: 1, moon: 0.4, sun: 0.3, mercury: 0.2, mars: -0.6, saturn: -0.8 };

  const GOOD_LINE = {
    venus: "适合示好、把话说软一点",
    jupiter: "有往外扩的口子，敢试的今天试",
    moon: "情绪面顺，轻松相处就好",
    sun: "容易被看见，站出来不亏",
    mercury: "沟通顺，适合谈、适合问"
  };
  const BAD_LINE = {
    mars: "容易起摩擦，话别说满",
    saturn: "被压着，求快没用，先把基础活做完",
    moon: "情绪起伏大，别在低落时做判断",
    mercury: "容易说岔、对不上频道，重要的话写完再发",
    sun: "会被注意到但不一定舒服，今天低调点",
    venus: "容易把客气当成意思，别急着下判断",
    jupiter: "容易高估，别答应超出能力的事"
  };

  const DOMAIN_NOUN = { "爱情": "感情这块", "事业": "工作这块", "学业": "学习这块", "财运": "钱这块", "健康": "身体这块" };
  // 每域三种说法：吉星 / 中性星 / 凶星
  const DOMAIN_TEXT = {
    "爱情": {
      good: "阻力最小，适合主动一点",
      midGood: "有余裕，可以往前放一点",
      mid: "不咸不淡，顺其自然",
      bad: "隔着一层，别急着要回应"
    },
    "事业": {
      good: "有个往外扩的口子，敢试",
      midGood: "稳中有进，适合把手上的事推进一格",
      mid: "平着走，别强求突破",
      bad: "还压在下面，别硬推，先把基础活做完"
    },
    "学业": {
      good: "吸收得快，适合啃难点",
      midGood: "状态够用，按计划走就行",
      mid: "平着走，把欠的补上",
      bad: "坐不太住，把任务切小一点"
    },
    "财运": {
      good: "有进项或机会，可以谈",
      midGood: "收支平稳，适合做规划",
      mid: "平着走，先把账记清",
      bad: "别做大额决定，先看现金流"
    },
    "健康": {
      good: "状态在线，适合动一动",
      midGood: "体力够用，注意作息",
      mid: "平着走，别熬夜",
      bad: "容易累，别硬撑"
    }
  };
  const BENEFIC = { venus: 1, jupiter: 1 };
  const MALEFIC = { mars: 1, saturn: 1 };

  function domainOf(signIdx, jd, def) {
    let s = 0, best = null;
    Object.keys(PW).forEach(k => {
      const ps = signOf(bodyLon(k, jd)).i;
      const h = ((ps - signIdx) + 12) % 12 + 1;
      if (def.houses.indexOf(h) === -1) return;
      const w = PW[k];
      s += w * 0.9;
      if (!best || Math.abs(w) > Math.abs(best.w)) best = { key: k, house: h, w };
    });

    const asps = aspectsTo(signIdx * 30 + 15, jd);
    asps.forEach(a => { s += dip(a) * 0.45; });

    let where = "", positive = true;
    if (best) {
      where = "走在你第" + best.house + "宫";
      positive = best.w > 0;
    } else if (asps.length) {
      const a = asps.slice().sort((x, y) => Math.abs(dip(y)) - Math.abs(dip(x)))[0];
      best = { key: a.key, house: null, w: dip(a) >= 0 ? 1 : -1 };
      where = a.n + "你的" + SIGNS[signIdx].cn;
      positive = dip(a) >= 0;
    }

    const stars = Math.max(1, Math.min(5, Math.round(3 + s * 1.1)));
    const noun = DOMAIN_NOUN[def.name] || def.name;
    let line;
    if (!best) {
      line = noun + "今天没什么在动——不推也不拦，按你自己的节奏来。";
    } else {
      const t = DOMAIN_TEXT[def.name] || { good: "顺", midGood: "平稳", mid: "平稳", bad: "有点阻力" };
      const tail = stars >= 4 ? (BENEFIC[best.key] ? t.good : t.midGood)
        : (stars <= 2 ? t.bad : t.mid);
      line = P_CN[best.key] + where + "——" + noun + tail + "。";
    }
    return { key: def.name, stars, score: s, line };
  }

  function signFull(signIdx, jd) {
    const dm = {};
    DOMAIN_ORDER.forEach(k => { dm[k] = domainOf(signIdx, jd, DOMAIN_DEF[k]); });
    const arr = DOMAIN_ORDER.map(k => dm[k]);
    const avg = arr.reduce((a, b) => a + b.stars, 0) / arr.length;
    const top = arr.slice().sort((a, b) => b.stars - a.stars)[0];
    const low = arr.slice().sort((a, b) => a.stars - b.stars)[0];
    return { signIdx, domains: dm, avg: Math.round(avg * 10) / 10, top, low };
  }

  function allSignsFull(jd) {
    const rows = SIGNS.map((sg, i) => signFull(i, jd));
    const order = rows.slice().sort((a, b) => b.avg - a.avg);
    order.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  }


  /* ---------- 周期运势：按周期采样 + 按周期给星体加权 ---------- */
  const PERIOD_W = {
    day:   { sun: 1, moon: 1, mercury: 1, venus: 1, mars: 1, jupiter: 0.7, saturn: 0.7 },
    week:  { sun: 1, moon: 0.6, mercury: 1, venus: 1, mars: 1, jupiter: 0.9, saturn: 0.9 },
    month: { sun: 0.8, moon: 0.3, mercury: 0.9, venus: 1, mars: 1, jupiter: 1.1, saturn: 1.1 },
    year:  { sun: 0.8, moon: 0, mercury: 0.3, venus: 0.6, mars: 0.4, jupiter: 1.5, saturn: 1.5 }
  };

  const HOUSE_MEAN = {
    1: "你自己、状态、身体的第一反应",
    2: "钱、资源、安全感",
    3: "说话、日常往来、近距离的沟通",
    4: "家、根、心里那块底",
    5: "喜欢的东西、表达、玩乐与心动",
    6: "日常琐事、工作流程、身体",
    7: "关系里对面那个人、合作、一对一",
    8: "深处的事、共有、别人给你的东西",
    9: "远方、意义、学习与信念",
    10: "台面、名声、事业的位置",
    11: "朋友、圈子、群体",
    12: "收尾、独处、看不见的部分"
  };

  const PLANET_MEAN = {
    venus: "金星管关系、审美和价值感——它落在哪个宫，哪一块就比较容易「被接住」",
    jupiter: "木星管扩张和机会——它到的地方通常有增量，但也容易高估",
    saturn: "土星管限制和结构——它压的地方需要慢工，急不得",
    mars: "火星管行动和摩擦——它进哪一宫，哪一块既有推动力也有火气",
    mercury: "水星管沟通和交易——它所在的地方，话说得通，也容易说错",
    moon: "月亮管情绪和日常——它两天半换一个宫，所以日与日之间的差别主要来自它",
    sun: "太阳管自我和显眼处——它照到哪里，哪里就容易被看见"
  };

  const CONCRETE = {
    "爱情": "具体到动作：做一件对方不需要费力回应的小事——一条有具体内容的信息，而不是一句「在吗」。",
    "事业": "具体到动作：把今天最想推进的那件事写成一句话，发给相关的人，比在脑子里推演一整天有效。",
    "学业": "具体到动作：先啃最难的那一段，别从会做的题开始。",
    "财运": "具体到动作：先把最近一周的支出过一遍，再决定要不要花。",
    "健康": "具体到动作：睡够、喝水、走一段路。剩下的都是次要的。"
  };

  /* 单一职责：只算分数与主导星，供 periodDomain / 走势图 / 分位校准共用 */
  function scoreOf(signIdx, def, jds, W) {
    let score = 0;
    const info = {};
    const aspAgg = {};
    const keys = Object.keys(W).filter(k => W[k] > 0);

    jds.forEach(jd => {
      keys.forEach(k => {
        const ps = signOf(bodyLon(k, jd)).i;
        const h = ((ps - signIdx) + 12) % 12 + 1;
        if (def.houses.indexOf(h) === -1) return;
        score += PW[k] * W[k] * 0.9 / jds.length;
        const rec = info[k] || (info[k] = { houses: [], n: 0 });
        if (rec.houses.indexOf(h) === -1) rec.houses.push(h);
        rec.n++;
      });
      aspectsTo(signIdx * 30 + 15, jd).forEach(a => {
        if (!W[a.key]) return;
        // 相位必须计入分数——否则宫位空着的领域每天都恒为 0
        score += dip(a) * W[a.key] * 0.45 / jds.length;
        const r = aspAgg[a.key] || (aspAgg[a.key] = { sum: 0, names: {} });
        r.sum += dip(a) * W[a.key];
        r.names[a.n] = (r.names[a.n] || 0) + 1;
      });
    });

    let best = null;
    Object.keys(info).forEach(k => {
      const rec = info[k];
      const strength = Math.abs(PW[k]) * W[k] * (rec.n / jds.length);
      if (!best || strength > best.strength)
        best = { key: k, houses: rec.houses.slice().sort((a, b) => a - b), w: PW[k], strength };
    });
    if (!best) {
      Object.keys(aspAgg).forEach(k => {
        const r = aspAgg[k];
        const avg = r.sum / jds.length;
        const strength = Math.abs(avg);
        if (strength < 0.08) return;
        const names = Object.keys(r.names).sort((a, b) => r.names[b] - r.names[a]);
        if (!best || strength > best.strength)
          best = { key: k, houses: [], w: avg > 0 ? 1 : -1, strength, aspName: names[0] };
      });
    }
    return { score, best };
  }

  /* 星级 = 当日分数在该星座该领域「近一年」分布中的位置 */
  const _cal = {};
  function calOf(signIdx, def) {
    const key = signIdx + "|" + def.name;
    if (_cal[key]) return _cal[key];
    const now = Date.now() / 86400000 + 2440587.5;
    const arr = [];
    for (let i = -182; i <= 182; i += 2) arr.push(scoreOf(signIdx, def, [now + i], PERIOD_W.day).score);
    arr.sort((a, b) => a - b);
    _cal[key] = arr;
    return arr;
  }

  function pctStars(signIdx, def, score) {
    const arr = calOf(signIdx, def);
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < score) lo = mid + 1; else hi = mid;
    }
    const p = lo / arr.length;
    if (p >= 0.95) return 5;
    if (p >= 0.75) return 4;
    if (p >= 0.25) return 3;
    if (p >= 0.05) return 2;
    return 1;
  }

  /* 走势图用：逐日的原始分数（连续值，不做星级量化） */
  function dailyScores(signIdx, jds) {
    return jds.map(jd => {
      const o = {};
      let sum = 0;
      DOMAIN_ORDER.forEach(k => {
        const sc = scoreOf(signIdx, DOMAIN_DEF[k], [jd], PERIOD_W.day).score;
        o[k] = sc;
        sum += sc;
      });
      o.overall = sum / DOMAIN_ORDER.length;
      return o;
    });
  }

  function periodDomain(signIdx, def, jds, W, when) {
    const WW = when || "";
    const r = scoreOf(signIdx, def, jds, W);
    const score = r.score, best = r.best;

    const stars = pctStars(signIdx, def, score);
    const noun = DOMAIN_NOUN[def.name] || def.name;
    const t = DOMAIN_TEXT[def.name] || { good: "顺", midGood: "平稳", mid: "平稳", bad: "有点阻力" };
    const tail = stars >= 4 ? (BENEFIC[best && best.key] ? t.good : t.midGood)
      : (stars <= 2 ? t.bad : t.mid);

    const NONE_LINE = {
      "爱情": "这段时间没有谁在推这一块，关系按你主动到什么程度走。",
      "事业": "工作这块没有外力介入，节奏由你自己定。",
      "学业": "学习这块没有干扰也没有加成，全看你自己的计划排得怎么样。",
      "财运": "钱这块没有大的进出，适合做盘算而不是做决定。",
      "健康": "身体这块没有明显消耗也没有加成，稳着来就行。"
    };

    let line;
    if (!best) {
      line = WW + (NONE_LINE[def.name] || "这一块暂时没有外力，按你自己的节奏来。");
    } else if (!best.houses.length) {
      line = WW + P_CN[best.key] + (best.aspName || "") + "你的" + SIGNS[signIdx].cn + "——" + noun + tail + "。";
    } else {
      const hs = best.houses;
      const where = hs.length === 1
        ? "在你第" + hs[0] + "宫"
        : "在你第" + hs[0] + "到第" + hs[hs.length - 1] + "宫之间";
      line = WW + P_CN[best.key] + where + "——" + noun + tail + "。";
    }

    let detail;
    if (!best) {
      detail = WW + "你这一域对应的宫位里没有行星停留——没有外力推它，也没有外力拦它。这种情况结果基本由你自己的动作决定，星象在这里几乎不构成变量。";
    } else if (!best.houses.length) {
      detail = WW + P_CN[best.key] + "和你的" + SIGNS[signIdx].cn + "形成" + (best.aspName || "角度") +
        "，但角度比较松（不在宫位里）。这属于「有一点点影响」的程度，可以当参考，不建议拿它当依据。" + CONCRETE[def.name];
    } else {
      const hs = best.houses;
      const h = hs[0];
      const whereTxt = hs.length === 1
        ? "在你第" + h + "宫"
        : "在你第" + hs[0] + "到第" + hs[hs.length - 1] + "宫之间移动";
      detail = WW + P_CN[best.key] + whereTxt + "。第" + h + "宫管的是「" + (HOUSE_MEAN[h] || "这一块") +
        "」，" + PLANET_MEAN[best.key] + "。所以" + noun + tail + "。" + CONCRETE[def.name];
    }

    return { key: def.name, stars, score, line, detail };
  }

  function signsForPeriod(jds, periodKey, when) {
    const W = PERIOD_W[periodKey] || PERIOD_W.day;
    const rows = SIGNS.map((sg, i) => {
      const dm = {};
      DOMAIN_ORDER.forEach(k => { dm[k] = periodDomain(i, DOMAIN_DEF[k], jds, W, when); });
      const arr = DOMAIN_ORDER.map(k => dm[k]);
      const raw = arr.reduce((a, b) => a + b.score, 0) / arr.length;
      const avg = Math.round(Math.max(1, Math.min(5, 3 + raw * 2.2)) * 10) / 10;
      const top = arr.slice().sort((a, b) => b.stars - a.stars)[0];
      const low = arr.slice().sort((a, b) => a.stars - b.stars)[0];
      return { signIdx: i, domains: dm, avg, raw, top, low };
    });
    return rows;
  }

  return { natal, reading, aspectLine, signOf, sunLon, moonLon, ascendant, toJD, SIGNS, aspectBetween, daily, signGrid, dailySign, retro, moonPhase, ganzhiOf, bodyLon, nowJD, signFull, allSignsFull, DOMAIN_DEF, DOMAIN_ORDER, signsForPeriod, PERIOD_W, dailyScores, scoreOf };
})();
