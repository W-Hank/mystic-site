/* 解读引擎：按真实读牌法组合 —— 问题分域、牌位语义、正逆、元素尊贵、牌间关系、整体势、时机推断 */
window.MysticEngine = (function () {
  const D = window.TAROT_DATA;

  /* ---------- 牌库 ---------- */
  let _deck = null;
  function deck() {
    if (_deck) return _deck;
    const out = [];
    D.majors.forEach((c, i) => out.push({
      id: "M" + i, name: c.n, en: c.e, arcana: "major", num: c.no,
      el: c.el, kw: c.kw, rk: c.rk, u: c.u, v: c.v,
      suit: null, rank: null
    }));
    ["wands", "cups", "swords", "pentacles"].forEach(s => {
      const meta = D.suits[s];
      D.minors[s].forEach((m, i) => out.push({
        id: s[0].toUpperCase() + i, name: meta.cn + D.ranks[i],
        en: s.charAt(0).toUpperCase() + s.slice(1) + " " + D.ranks[i],
        arcana: "minor", num: i + 1, el: meta.el,
        kw: [m[0].split("、")[0], m[0].split("、")[1] || meta.theme],
        rk: [m[1].split("、")[0]],
        u: m[0], v: m[1], suit: s, rank: i + 1
      }));
    });
    _deck = out;
    return out;
  }

  function shuffle() {
    const d = deck().slice();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  /* ---------- 问题分域 ---------- */
  const DOMAINS = {
    love: { name: "感情", words: ["关系", "心意", "靠近", "距离", "对方", "回应", "温度"],
      kw: ["他", "她", "喜欢", "暗恋", "表白", "在一起", "朋友", "聊天", "微信", "消息", "约", "关系",
        "恋", "结婚", "复合", "异地", "crush", "暧昧", "追", "回不回", "搭理",
        "我们之间", "我们", "之间", "和他", "和她", "聊起来", "说话", "回应", "回消息", "交往", "认识"] },
    career: { name: "事业", words: ["推进", "位置", "资源", "机会", "格局"],
      kw: ["工作", "上班", "公司", "老板", "同事", "跳槽", "面试", "升职", "项目", "创业", "offer", "辞职", "事业", "领导", "团队"] },
    study: { name: "学业", words: ["投入", "进度", "状态", "方向", "结果"],
      kw: ["考试", "考", "专业", "论文", "导师", "毕业", "课程", "成绩", "考研", "留学", "学", "复习"] },
    money: { name: "财务", words: ["收支", "条件", "投入产出", "底子"],
      kw: ["钱", "收入", "投资", "买", "卖", "债", "工资", "财务", "理财", "亏", "赚", "预算"] },
    health: { name: "身心", words: ["体力", "情绪", "节律", "恢复"],
      kw: ["病", "身体", "健康", "睡", "医院", "手术", "减肥", "焦虑", "抑郁", "累", "失眠"] },
    general: { name: "当下", words: ["处境", "选择", "节奏", "走向"], kw: [] }
  };

  function classify(q) {
    const t = (q || "").toLowerCase();
    let best = "general", bs = 0;
    Object.keys(DOMAINS).forEach(k => {
      let s = 0;
      DOMAINS[k].kw.forEach(w => { if (t.indexOf(w) !== -1) s += w.length; });
      if (s > bs) { bs = s; best = k; }
    });
    return { key: best, score: bs };
  }

  function qType(q) {
    const t = q || "";
    if (/能不能|会不会|是否|要不要|该不该|值不值|有没有|可不可以|行不行|合适|好不好|稳不稳|有戏|成不成/.test(t)) return "yesno";
    if (/什么时候|何时|多久|多长|哪天|几时/.test(t)) return "when";
    if (/怎么|如何|怎样|怎么办|怎么才能/.test(t)) return "howto";
    if (/为什么|为何|怎么会/.test(t)) return "why";
    return "open";
  }

  function pickSpread(domain, type, n) {
    if (n === 1) return "one";
    if (n === 5) return domain === "love" ? "relation5" : "cross5";
    if (type === "yesno" || type === "howto") return "situation_action_outcome";
    return "past_present_future";
  }

  /* ---------- 牌位角色 ---------- */
  const ROLES = {
    one: ["answer"],
    past_present_future: ["past", "now", "future"],
    situation_action_outcome: ["now", "action", "outcome"],
    relation5: ["self", "other", "bond", "block", "outcome"],
    cross5: ["now", "block", "help", "advice", "outcome"]
  };

  const ROLE_LEAD = {
    past: "这一格看的是「因」——",
    now: "现状这一格说的是——",
    future: "照现在这个势头往下走，落点是——",
    action: "牌给出的动作是——",
    outcome: "结果这一格落在——",
    self: "你自己这一格，牌看到的是——",
    other: "对方那一格，牌看到的是——",
    bond: "你们之间真正的那条连接是——",
    block: "横在中间的东西是——",
    help: "能借的力在——",
    advice: "牌的建议是——",
    answer: ""
  };

  /* ---------- 单牌解读 ---------- */
  function readCard(card, role, domain, rev) {
    const txt = rev ? card.v : card.u;
    let lead = ROLE_LEAD[role] || "";
    if (role === "action" && HARD.has(card.id) && !rev)
      lead = "这一格没有出现一个可以照做的动作，出现的是个提醒——";
    const elNote = rev
      ? `（${card.name}${rev ? "逆" : ""}，属${card.el}，能量是向内收的）`
      : `（${card.name}，属${card.el}）`;
    return { lead, txt, elNote, full: `${lead}${txt}${elNote}` };
  }

  /* ---------- 牌间关系 ---------- */
  function relations(cards, revs) {
    const out = [];
    // 1. 同花色（同一股劲）—— 按花色归组，不重复说三遍
    const bySuit = {};
    cards.forEach(c => { if (c.suit) (bySuit[c.suit] = bySuit[c.suit] || []).push(c); });
    Object.keys(bySuit).forEach(sk => {
      const g = bySuit[sk];
      if (g.length < 2) return;
      if (g.length === cards.length && cards.length >= 3)
        out.push(`三张全落在${D.suits[sk].cn}——这不只是「有这方面的事」，是整件事已经被${D.suits[sk].theme}占满了。`);
      else
        out.push(`${g.map(c => c.name).join("、")}同属${D.suits[sk].cn}：说的是同一股劲，${D.suits[sk].theme}。这件事比你以为的更集中。`);
    });
    // 2. 元素相冲
    const clash = { "火水": "火想往前冲，水想往回退——这就是你现在反复的地方。", "水火": "水先压住了火，你心里想动，但情绪先把你按住了。", "风土": "风在上面绕，土在下面拖——想法很多，落地很少。", "土风": "土已经站住了，风还在挑毛病。别用'再想想'拖住已经能做的事。" };
    for (let i = 0; i < cards.length - 1; i++) {
      const k = cards[i].el + cards[i + 1].el;
      if (clash[k]) out.push(`「${cards[i].name}」到「${cards[i+1].name}」是${cards[i].el}遇${cards[i+1].el}：${clash[k]}`);
    }
    // 3. 大阿卡纳相邻 = 宿命串联
    for (let i = 0; i < cards.length - 1; i++) {
      const a = cards[i], b = cards[i + 1];
      if (a.arcana === "major" && b.arcana === "major" && Math.abs(a.num - b.num) === 1) {
        out.push(`${a.name}紧接${b.name}，是大牌连号——这不是一件随手的小事，它在你的人生线上有位置。`);
      }
    }
    // 4. 数字递进
    const minors = cards.filter(c => c.arcana === "minor");
    if (minors.length >= 2) {
      const asc = minors.every((c, i) => i === 0 || c.rank >= minors[i - 1].rank);
      if (asc && minors.length === cards.length) out.push("牌的数字是往上走的，说明事情在推进，不是停在原地。");
    }
    // 5. 逆位集中
    const nr = revs.filter(Boolean).length;
    if (nr >= Math.ceil(cards.length / 2) && cards.length > 1)
      out.push(`一半以上是逆位。逆位不等于坏，它的意思是「暂时卡住」——能量在，但没流向它该去的地方。`);
    // 6. 大牌比重
    const nm = cards.filter(c => c.arcana === "major").length;
    if (nm >= Math.ceil(cards.length / 2) && cards.length > 1)
      out.push("大阿卡纳占了半数以上：这件事的分量比表面看起来重，不太能用小技巧带过去。");
    return out.slice(0, 4);
  }

  /* 有些牌本身就是"硬的"，正位不等于好；逆位常常是"正在过去" */
  const HARD = new Set(["S1","S2","S3","S4","S5","S7","S8","S9","C3","C4","C6","C8","P4","P6","P8","W9","M12","M13","M15","M16","M18"]);
  function valence(c, rev) { return HARD.has(c.id) ? (rev ? 0.3 : -1) : (rev ? -1 : 1); }

  /* ---------- 整体势 ---------- */
  function tone(cards, revs, domain) {
    const nm = cards.filter(c => c.arcana === "major").length;
    const nr = revs.filter(Boolean).length;
    const el = {};
    cards.forEach(c => el[c.el] = (el[c.el] || 0) + 1);
    const top = Object.keys(el).sort((a, b) => el[b] - el[a])[0];
    let score = 0;
    cards.forEach((c, i) => { score += valence(c, revs[i]); });
    score /= cards.length;
    let verdict = "悬";
    if (score >= 0.67) verdict = "是";
    else if (score >= 0.2) verdict = "倾向是";
    else if (score <= -0.67) verdict = "否";
    else if (score <= -0.2) verdict = "倾向否";
    const elTone = {
      "火": "整体是火——主动、想动、耐不住等。",
      "水": "整体是水——情绪走在事实前面，你的感受比信息多。",
      "风": "整体是风——想得多、说得动，但还没落到实处。",
      "土": "整体是土——现实条件在起作用，慢，但一旦落地就稳。"
    }[top] || "";
    return { score, verdict, nm, nr, top, elTone, total: cards.length };
  }

  /* ---------- 建议：由末牌与势推出，不套模板 ---------- */
  function advice(cards, revs, tn, domain) {
    const last = cards[cards.length - 1];
    const lastRev = revs[revs.length - 1];
    const acts = {
      wands: "把动作做小、做具体；火系牌给的建议永远是「先动一下」，不是「先想明白」。",
      cups: "先处理情绪再处理事情；水系牌提醒你，你现在的判断里掺了对回应的渴望。",
      swords: "把话说清楚，一句就够；风系牌最怕的不是拒绝，是含糊。",
      pentacles: "给这件事一个可衡量的落点：时间、次数、一件事。土系牌只认具体。"
    };
    const out = [];
    const kwNote = `（${last.name}${lastRev ? "逆" : ""}：${(lastRev ? last.rk : last.kw).join("、")}）`;
    if (last.suit) {
      out.push(acts[last.suit] + kwNote);
    } else {
      const txt = lastRev ? last.v : last.u;
      out.push(`落到「${last.name}」${lastRev ? "逆位" : ""}：${txt}　它不给方法，它给一个必须面对的东西——${lastRev ? last.rk[0] : last.kw[0]}。`);
    }
    if (tn.verdict === "否" || tn.verdict === "倾向否")
      out.push("偏逆，卡住的是「姿态」不是「机会」。把这次动作的重量降下来，比把它做得更好更有效——先做一件不用她回应的事。");
    else if (tn.verdict === "是" || tn.verdict === "倾向是")
      out.push("牌面偏顺，问题不在能不能成，在你还在准备第几次。第三次准备之后还不动，通常是在等一个不会来的确定感。");
    else
      out.push("一半顺一半卡——这不是「能不能成」的问题，是「什么时候、以什么方式」的问题。别把「悬」读成「不行」。");
    const dom = {
      love: "感情里最容易被忽略的一条：对方回不回，测的是她的习惯，不是你的价值。",
      career: "事业上，先确认你争的是不是同一个位置——很多内耗是目标本身没对齐。",
      study: "学业上，进度比状态可靠；状态是结果，不是前提。",
      money: "财务上，先看清楚现金流，再谈机会。",
      health: "身心上，先把睡眠和吃饭稳住，其余判断都会变准。",
      general: "别在信息最少的时候做最重的决定。"
    }[domain];
    out.push(dom);
    return out.filter(Boolean);
  }

  /* ---------- 时机推断：花色定尺度，数字定远近，逆位顺延 ---------- */
  function timing(cards, revs) {
    const last = cards[cards.length - 1];
    const rev = revs[revs.length - 1];
    const scale = last.suit ? D.suits[last.suit].timeScale : "周到月";
    const near = last.arcana === "major"
      ? (last.num <= 7 ? "偏近" : last.num <= 14 ? "中等" : "偏远")
      : (last.rank <= 4 ? "偏近" : last.rank <= 9 ? "中等" : "偏远");
    let s = `末牌落在${last.name}，按花色推，这件事的量级是「${scale}」；位置${near}。`;
    s += rev ? "但它逆着——实际会比你预期的晚一档，别按最早的时间点去等。" : "顺着，可以按这个尺度去等回音。";
    return s;
  }

  /* ---------- 主入口 ---------- */
  function interpret(question, picked, revs) {
    const d = classify(question);
    const type = qType(question);
    const cards = picked;
    const tn = tone(cards, revs, d.key);
    const dname = DOMAINS[d.key].name;

    const perCard = cards.map((c, i) => {
      const role = (window.__roles || [])[i] || "answer";
      return Object.assign({ card: c, rev: revs[i], role }, readCard(c, role, d.key, revs[i]));
    });

    const rels = relations(cards, revs);

    // 末牌与整体的张力
    const lastC = cards[cards.length - 1], lastR = revs[revs.length - 1];
    const lv = valence(lastC, lastR);
    let tension = "";
    if (lv > 0 && tn.score < -0.2)
      tension = `这里有一处矛盾值得说清：走向那张是亮的（${lastC.name}），前面几张却在拖。说明结果本身不坏，坏在中间这段姿态——你现在做的那个动作，才是真正的变量。`;
    else if (lv < 0 && tn.score > 0.2)
      tension = `反过来的一处矛盾：前面几张都顺，最后一张却压着（${lastC.name}）。这是提醒——顺的时候最容易漏掉的那个动作，恰好决定落点。`;

    let head = "";
    if (type === "yesno") head = `你问的是「能不能」——牌面给的答案是「${tn.verdict}」。`;
    else if (type === "when") head = `你问的是时间。先看势，再看末牌。`;
    else if (type === "howto") head = `你问的是「怎么办」。牌不给方案，牌给的是你现在站在哪、以及下一步该落哪里。`;
    else head = `这个问题落在「${dname}」这一域。`;

    return {
      domain: dname, qtype: type, tone: tn, head,
      perCard, relations: rels, advice: advice(cards, revs, tn, d.key),
      timing: timing(cards, revs), tension
    };
  }

  return { deck, shuffle, classify, qType, pickSpread, interpret, spreads: D.spreads, ROLES };
})();
