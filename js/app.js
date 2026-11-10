(function () {
  const $ = s => document.querySelector(s);
  const E = window.MysticEngine, A = window.MysticAstro;

  /* ================= Tab ================= */
  document.querySelectorAll('nav button').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('nav button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
      $('#panel-' + b.dataset.tab).classList.add('on');
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
  });

  /* ================= 塔罗 ================= */
  const OPTIONS = [
    { k: "auto", name: "自动匹配", desc: "按你的问题自动选题数与牌阵" },
    { k: "one", name: "一张 · 直问", desc: "此刻的答案。适合已经想清楚、只差一个确认" },
    { k: "past_present_future", name: "三张 · 时间线", desc: "过去的因 · 此刻的实况 · 正在形成的走向" },
    { k: "situation_action_outcome", name: "三张 · 状况 行动 结果", desc: "该做什么，以及照此下去的落点" },
    { k: "relation5", name: "五张 · 关系", desc: "你 · 对方 · 连接 · 阻碍 · 走向" },
    { k: "cross5", name: "五张 · 十字", desc: "现状 · 阻碍 · 助力 · 建议 · 结果" }
  ];

  let state = { q: "", spreadKey: "auto", count: 3, deck: [], picked: [], revs: [] };

  function renderSpreads() {
    const box = $('#spreads');
    const d = E.classify(state.q), t = E.qType(state.q);
    const rec = E.pickSpread(d.key, t, 3);
    box.innerHTML = "";
    OPTIONS.forEach(o => {
      const el = document.createElement("div");
      el.className = "spread" + (o.k === state.spreadKey ? " on" : "");
      const isRec = (o.k === rec) || (o.k === "auto");
      el.innerHTML = `<b>${o.name}${isRec && o.k === rec ? ' <span style="color:var(--gold);font-size:11px">· 推荐</span>' : ""}</b><small>${o.desc}</small>`;
      el.onclick = () => { state.spreadKey = o.k; renderSpreads(); };
      box.appendChild(el);
    });
  }

  $('#q').addEventListener("input", e => { state.q = e.target.value; renderSpreads(); });

  function bindEnter(el, action) {
    if (!el) return;
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.shiftKey) return;                       // Shift+Enter 换行
      if (e.isComposing || e.keyCode === 229) return; // 输入法候选中
      e.preventDefault();
      action();
    });
  }

  function needQuestion(inputEl, errEl, msg) {
    const v = (inputEl && inputEl.value || "").trim();
    if (v.length >= 2) { if (errEl) errEl.textContent = ""; return v; }
    if (errEl) errEl.textContent = msg;
    if (inputEl && inputEl.focus) inputEl.focus();
    return "";
  }

  Array.prototype.forEach.call([['#q', '#qErr'], ['#yjQ', '#yjErr'], ['#heQ', '#heErr']], function (p) {
    const el = document.querySelector(p[0]);
    const er = document.querySelector(p[1]);
    if (el && er) el.addEventListener('input', function () { er.textContent = ""; });
  });

  bindEnter($('#q'), function () { $('#toPick').click(); });
  bindEnter($('#yjQ'), function () {
    if (window.__yjLocked) { yjHint(); return; }
    $('#yjCast').click();
  });
  bindEnter($('#heQ'), function () {
    if (window.__heLocked) { heHint(); return; }
    $('#heGo').click();
  });
  renderSpreads();

  function resolveSpread() {
    const d = E.classify(state.q), t = E.qType(state.q);
    if (state.spreadKey === "auto") {
      const k = E.pickSpread(d.key, t, 3);
      return k;
    }
    return state.spreadKey;
  }

  $('#toPick').onclick = () => {
    if (!needQuestion($('#q'), $('#qErr'), "先写一句你真正想问的话——牌是照着问题翻的。")) {
      $('#q').style.borderColor = "#8a5a5a";
      return;
    }
    $('#q').style.borderColor = "";
    const sk = resolveSpread();
    state.resolved = sk;
    state.count = E.spreads[sk].n;
    state.deck = E.shuffle();
    state.picked = []; state.revs = [];
    $('#step-ask').hidden = true;
    $('#step-pick').hidden = false;
    $('#step-read').hidden = true;
    $('#pickQ').textContent = state.q;
    renderGrid();
    updateCounter();
  };

  function renderGrid() {
    const g = $('#grid');
    g.innerHTML = "";
    state.deck.forEach((c, i) => {
      const d = document.createElement("div");
      d.className = "back";
      d.dataset.i = i;
      d.onclick = () => toggle(i, d);
      g.appendChild(d);
    });
  }

  function updateCounter() {
    $('#counter').textContent = `已选 ${state.picked.length} / ${state.count}`;
  }

  function toggle(i, el) {
    if (el.classList.contains("taken")) {
      el.classList.remove("taken");
      state.picked = state.picked.filter(x => x !== i);
      updateCounter();
      return;
    }
    if (state.picked.length >= state.count) return;
    el.classList.add("taken");
    state.picked.push(i);
    updateCounter();
    if (state.picked.length === state.count) {
      setTimeout(reveal, 420);
    }
  }

  function reveal() {
    const cards = state.picked.map(i => state.deck[i]);
    const revs = cards.map(() => Math.random() < 0.32);
    state.revs = revs;

    const sk = state.resolved;
    window.__roles = E.ROLES[sk];
    const r = E.interpret(state.q, cards, revs);
    const spread = E.spreads[sk];

    $('#step-pick').hidden = true;
    $('#step-read').hidden = false;

    $('#rq').textContent = "「" + state.q + "」";
    $('#rmeta').innerHTML =
      `<span class="tag gold">${spread.name}</span>` +
      `<span class="tag">问题域 · ${r.domain}</span>` +
      `<span class="tag">牌势 · ${r.tone.verdict}</span>` +
      `<span class="tag">${r.tone.nm} 张大牌 / ${r.tone.nr} 张逆位</span>`;

    $('#rverdict').innerHTML =
      `<div style="margin-bottom:8px">${r.head}</div>
       <div style="color:#b9b5ac;font-size:14.5px">${r.tone.elTone}</div>`
      + (r.tension ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid (window.MysticTheme?window.MysticTheme.v("line","rgba(60,66,88,.6)"):"rgba(60,66,88,.6)");color:#d8b98a;font-size:14.5px">${r.tension}</div>` : "");

    // 牌阵图
    $('#rcards').innerHTML = cards.map((c, i) => `
      <div class="mini">
        <span class="${revs[i] ? "rev" : "up"}">${revs[i] ? "逆" : "正"}</span>
        <div class="pos">${spread.pos[i]}</div>
        <div class="nm">${c.name}</div>
        <div class="el">${c.en}　·　${c.el}　·　${c.arcana === "major" ? "大阿卡纳" : "小阿卡纳"}</div>
      </div>`).join("");

    // 逐位
    $('#rper').innerHTML = r.perCard.map((p, i) => `
      <div class="cardread">
        <div class="top">
          <b>${p.card.name}</b>
          <i>${spread.pos[i]}　·　${p.rev ? "逆位" : "正位"}　·　${p.card.kw.join(" / ")}</i>
        </div>
        <p>${p.lead}${p.txt}<em>${p.elNote}</em></p>
      </div>`).join("");

    $('#rrels').innerHTML = r.relations.length
      ? r.relations.map(x => `<li>${x}</li>`).join("")
      : `<li>这几张牌之间没有明显的对冲或呼应，各自独立——说明事情此刻还是分开的几块，还没有连成一条线。</li>`;

    $('#radv').innerHTML = r.advice.map(x => `<li>${x}</li>`).join("");
    $('#rtime').textContent = r.timing;
    saveCard("tr", {
      date: todayStr(),
      title: "塔罗 · " + spread.name,
      headline: cards[0].name + (revs[0] ? "（逆）" : ""),
      rows: [
        { label: "问题", text: state.q },
        { label: "牌面", text: cards.map(function (c, i) { return spread.pos[i] + "：" + c.name + (revs[i] ? "（逆）" : ""); }).join("；") },
        { label: "解读", text: r.perCard.map(function (p) { return p.lead + p.txt; }).join("") },
        { label: "建议", text: r.advice.join(" ") },
        { label: "时机", text: r.timing }
      ],
      footer: "塔罗不具备可验证的预测力，本页只作反思工具 · 牌意据 Waite 1911 / Pollack 1980"
    }, "tarot");

    const tp = document.querySelector('#panel-tarot');
    if (tp && tp.scrollIntoView) tp.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function tarotBack(clearQ) {
    $('#step-read').hidden = true;
    $('#step-pick').hidden = true;
    $('#step-ask').hidden = false;
    state.picked = []; state.revs = [];
    if (clearQ) {
      $('#q').value = '';
      state.q = '';
      $('#qErr').textContent = '';
    }
    if ($('#q').focus) $('#q').focus();
  }

  $('#again').onclick = () => {
    if (!confirm('同一件事只建议抽一次。再抽一次等于重问，结果不作数——确定继续？')) return;
    tarotBack(false);
  };

  const tb = document.querySelector('#tarotBack');
  if (tb) tb.onclick = () => tarotBack(true);

  /* ================= 星盘 ================= */
  const PLACES = [
    { country: "中国", cities: [["北京", 39.90, 116.41], ["上海", 31.23, 121.47], ["广州", 23.13, 113.26], ["深圳", 22.54, 114.06],
    ["天津", 39.13, 117.20], ["重庆", 29.56, 106.55], ["成都", 30.57, 104.07], ["杭州", 30.27, 120.15],
    ["南京", 32.06, 118.80], ["武汉", 30.59, 114.31], ["西安", 34.34, 108.94], ["苏州", 31.30, 120.62],
    ["长沙", 28.23, 112.94], ["郑州", 34.75, 113.62], ["青岛", 36.07, 120.38], ["沈阳", 41.80, 123.43],
    ["大连", 38.91, 121.61], ["哈尔滨", 45.80, 126.53], ["长春", 43.82, 125.32], ["济南", 36.65, 117.12],
    ["合肥", 31.82, 117.23], ["福州", 26.07, 119.30], ["厦门", 24.48, 118.09], ["南昌", 28.68, 115.86],
    ["昆明", 25.04, 102.72], ["贵阳", 26.65, 106.63], ["南宁", 22.82, 108.32], ["海口", 20.04, 110.32],
    ["兰州", 36.06, 103.83], ["西宁", 36.62, 101.78], ["银川", 38.49, 106.23], ["乌鲁木齐", 43.83, 87.62],
    ["拉萨", 29.65, 91.14], ["呼和浩特", 40.84, 111.75], ["石家庄", 38.04, 114.51], ["太原", 37.87, 112.55],
    ["宁波", 29.87, 121.55], ["温州", 28.00, 120.67], ["无锡", 31.49, 120.31], ["常州", 31.81, 119.97],
    ["南通", 31.98, 120.89], ["徐州", 34.26, 117.19], ["扬州", 32.39, 119.42], ["绍兴", 30.00, 120.58],
    ["嘉兴", 30.75, 120.76], ["金华", 29.08, 119.65], ["台州", 28.66, 121.42], ["珠海", 22.27, 113.58],
    ["佛山", 23.02, 113.12], ["东莞", 23.02, 113.75], ["中山", 22.52, 113.39], ["惠州", 23.11, 114.42],
    ["汕头", 23.35, 116.68], ["湛江", 21.27, 110.36], ["桂林", 25.27, 110.29], ["柳州", 24.33, 109.41],
    ["三亚", 18.25, 109.51], ["洛阳", 34.62, 112.45], ["开封", 34.80, 114.31], ["邯郸", 36.63, 114.54],
    ["唐山", 39.63, 118.18], ["保定", 38.87, 115.46], ["秦皇岛", 39.94, 119.60], ["烟台", 37.46, 121.45],
    ["潍坊", 36.71, 119.16], ["淄博", 36.81, 118.06], ["临沂", 35.10, 118.36], ["济宁", 35.41, 116.59],
    ["泰安", 36.20, 117.09], ["威海", 37.51, 122.12], ["芜湖", 31.33, 118.43], ["蚌埠", 32.92, 117.39],
    ["九江", 29.71, 116.00], ["赣州", 25.83, 114.93], ["宜昌", 30.69, 111.29], ["襄阳", 32.04, 112.14],
    ["荆州", 30.33, 112.24], ["岳阳", 29.36, 113.13], ["株洲", 27.83, 113.13], ["衡阳", 26.89, 112.57],
    ["常德", 29.03, 111.70], ["绵阳", 31.46, 104.68], ["德阳", 31.13, 104.40], ["宜宾", 28.77, 104.62],
    ["遵义", 27.73, 106.93], ["曲靖", 25.49, 103.80], ["大理", 25.61, 100.27], ["丽江", 26.86, 100.23],
    ["景洪", 22.01, 100.80], ["天水", 34.58, 105.72], ["包头", 40.66, 109.84], ["鄂尔多斯", 39.61, 109.78],
    ["大庆", 46.59, 125.10], ["齐齐哈尔", 47.35, 123.92], ["吉林", 43.84, 126.55], ["鞍山", 41.11, 122.99],
    ["锦州", 41.10, 121.13], ["丹东", 40.00, 124.35], ["香港", 22.32, 114.17], ["澳门", 22.20, 113.54],
    ["台北", 25.03, 121.57], ["高雄", 22.63, 120.30], ["台中", 24.15, 120.67], ["新竹", 24.80, 120.97]
    ] }
  ];

  function pinyinSort(list) {
    return list.slice().sort(function (x, y) {
      try { return x[0].localeCompare(y[0], "zh-Hans-CN"); }
      catch (e) { return x[0] < y[0] ? -1 : 1; }
    });
  }
  const sel = $('#bcity');
  const coordMap = {};
  const emptyOpt = document.createElement("option");
  emptyOpt.value = ""; emptyOpt.textContent = "— 不填 —";
  sel.appendChild(emptyOpt);

  let vidx = 0;
  PLACES.forEach(function (grp) {
    const og = document.createElement("optgroup");
    og.label = grp.country;
    pinyinSort(grp.cities).forEach(function (c) {
      const o = document.createElement("option");
      const v = String(vidx++);
      o.value = v;
      o.textContent = c[0];
      coordMap[v] = [c[1], c[2]];
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  sel.value = "";

  sel.onchange = () => {
    if (sel.value === "") { $('#blat').value = ""; $('#blon').value = ""; return; }
    const c = coordMap[sel.value];
    if (!c) return;
    $('#blat').value = c[0]; $('#blon').value = c[1];
  };

  $('#calc').onclick = () => {
    const y = +$('#by').value, m = +$('#bm').value, d = +$('#bd').value;
    const h = +$('#bh').value || 0, mi = +$('#bmin').value || 0, tz = +$('#btz').value || 8;
    const latRaw = ($('#blat').value || "").trim(), lonRaw = ($('#blon').value || "").trim();
    const hasCoord = latRaw !== "" && lonRaw !== "";
    const lat = hasCoord ? +latRaw : 0, lon = hasCoord ? +lonRaw : 0;
    const err = document.querySelector('#calcErr');

    if (!y || !m || !d) {
      err.textContent = "年、月、日都要填——至少填月和日才能排。";
      return;
    }
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      err.textContent = "月份或日期不太对，检查一下。";
      return;
    }
    err.textContent = "";

    const hasTime = !document.querySelector('#notime').checked;
    const placeOpen = document.querySelector('#place').open && hasCoord;
    const ch = A.natal(y, m, d, h, mi, tz, lat, lon, hasTime, placeOpen);
    $('#astroOut').hidden = false;

    $('#bods').innerHTML = ch.bodies.map(b => `
      <div class="bod">
        <span class="bn">${b.cn}</span>
        <span class="bs">${b.sign.cn} ${b.deg}°${String(b.min).padStart(2, "0")}′</span>
        <span class="bd">${b.sign.el} · ${b.sign.mode} · 主星${b.sign.ruler}</span>
      </div>`).join("");

    $('#asps').innerHTML = ch.aspects.length
      ? ch.aspects.map(a => `<span class="asp">${a.a}${a.n}${a.b}　${a.orb.toFixed(1)}°</span>`).join("")
      : `<span class="asp">无主要相位</span>`;

    $('#aread').innerHTML = readingHTML(A.reading(ch), A.aspectLine(ch.aspects));

    drawWheel(ch, hasTime && placeOpen);
    saveCard("np", {
      date: todayStr(),
      title: "本命盘 " + ch.bodies[0].sign.cn + "日 / " + ch.bodies[1].sign.cn + "月" + (ch.bodies.find(function (b) { return b.key === "asc"; }) ? " / " + ch.bodies.find(function (b) { return b.key === "asc"; }).sign.cn + "升" : ""),
      headline: y + " 年 " + m + " 月 " + d + " 日 " + h + ":" + String(mi).padStart(2, "0"),
      rows: ch.bodies.map(function (b) {
        return { label: b.cn, text: b.sign.cn + " " + b.deg + "°" + String(b.min).padStart(2, "0") + "′　" + b.sign.el + " · " + b.sign.mode + " · 主星" + b.sign.ruler };
      }),
      footer: "行星位置 JPL 近似根数 + Meeus 月球级数，精度经 pyephem 校验（<0.2°）；宫位含义采 Lilly 1647"
    }, "natal");
    const ao = $('#astroOut');
    if (ao && ao.scrollIntoView) ao.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ================= 今日（实时，无需输入） ================= */
  const PCN = { mercury: "水星", venus: "金星", mars: "火星", jupiter: "木星", saturn: "土星" };
  const CARD = {};
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
  }
  function saveCard(key, data, base) {
    data._base = base;
    CARD[key] = data;
  }
  window.__CARD = CARD;

  function makeCard(key) {
    const d = CARD[key];
    if (!d || !window.MysticShare) return;
    const cv = window.MysticShare.build(d);
    if (!cv) return;
    window.MysticShare.download(cv, d._base || key);
  }
  const PHASE_NOTE = {
    "新月": [
      "适合起头，不适合催结果。",
      "今天是开头，不是验收日；把第一步落下就行。",
      "种下去就好，别当天就扒开看。"
    ],
    "娥眉月": [
      "刚起步，力气还小，别急着要回应。",
      "势头在长，但还撑不起一次正面冲突。",
      "适合试探性地动一下，不适合摊牌。"
    ],
    "上弦月": [
      "张力最大的一天，适合硬推。",
      "卡住的事今天推一把，阻力最小。",
      "现在做需要下决心的事，比等「感觉对了」强。"
    ],
    "盈凸月": [
      "快到顶了，收细节。",
      "大方向已定，今天补漏洞比开新局有用。",
      "把收尾做好，别在这时候加需求。"
    ],
    "满月": [
      "事情会显形，情绪也到顶——别在这天做重大决定。",
      "该看到的都会看到，但看到的未必是全部，隔一天再判断。",
      "今天适合看清，不适合定案。"
    ],
    "亏凸月": [
      "开始往外放，适合分享、说出来。",
      "憋着的话今天说，比继续压着好。",
      "适合把想法讲给别人听，听听回声。"
    ],
    "下弦月": [
      "适合收尾、删减、放下。",
      "今天做减法：删掉一件事，比加一件有用。",
      "该结束的就结束，别拖到下一轮。"
    ],
    "残月": [
      "最安静的一段，适合独处和休整。",
      "今天不用推进，恢复也是进度。",
      "把力气存着，过两天再用。"
    ]
  };
  const RETRO_NOTE = {
    mercury: [
      "沟通、消息、交通容易出岔子，重要的话写下来再发",
      "今天容易说岔，重要的话留到明天或写成文字",
      "别在这段时间靠口头约定，落成字更稳"
    ],
    venus: [
      "感情上容易反复，别在这段时间给关系下定论",
      "这两天对关系的判断会偏，隔几天再看",
      "别用今天的感觉去决定一段关系的去留"
    ],
    mars: [
      "行动容易卡，别硬碰硬",
      "推进受阻是常态，换个时间比加力有效",
      "今天不宜正面冲突，绕一下更快"
    ],
    jupiter: [
      "扩张放缓，别急着摊大",
      "现在不是铺摊子的时候，收一收",
      "想加的事先记下，过阵子再开"
    ],
    saturn: [
      "结构在收紧，适合做减法",
      "该砍的就砍，留着更累",
      "今天适合立规矩，不适合讲情面"
    ]
  };
  function noteOf(map, key) {
    const v = map[key];
    if (!v) return "";
    if (typeof v === "string") return v;
    const Vv = window.MysticVoice;
    return Vv ? Vv.pick(v, Vv.seed(["note", key])) : v[0];
  }

  let curPeriod = "today";
  let detailLevel = (function () { try { return localStorage.getItem("mystic.level") || "brief"; } catch (e) { return "brief"; } })();

  /* 存储版本：换版本号会清掉旧的每日记录（只清记录，不动偏好） */
  const STORE_V = "2026-11-07b";
  (function () {
    try {
      if (localStorage.getItem("mystic.v") !== STORE_V) {
        localStorage.removeItem("mystic.hist");
        localStorage.removeItem("mystic.sign");
        localStorage.setItem("mystic.v", STORE_V);
      }
    } catch (e) {}
  })();

  function jdOfLocal(y, mo, d) { return new Date(y, mo - 1, d, 12, 0, 0, 0).getTime() / 86400000 + 2440587.5; }
  function localNoon(off) {
    const d = new Date(); d.setDate(d.getDate() + off); d.setHours(12, 0, 0, 0);
    return d.getTime() / 86400000 + 2440587.5;
  }
  const fmtMD = d => (d.getMonth() + 1) + "/" + d.getDate();

  function planOf(p) {
    const now = new Date();
    if (p === "yesterday" || p === "today" || p === "tomorrow") {
      const off = p === "yesterday" ? -1 : p === "tomorrow" ? 1 : 0;
      const d = new Date(); d.setDate(d.getDate() + off);
      return { key: "day", jds: [localNoon(off)], days: [d], mode: "day", title: p === "yesterday" ? "昨天" : p === "tomorrow" ? "明天" : "今天" };
    }
    if (p === "week") {
      const dow = (now.getDay() + 6) % 7;
      const jds = [], days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - dow + i);
        jds.push(localNoon(-dow + i)); days.push(d);
      }
      return { key: "week", jds, days, mode: "long", title: "本周" };
    }
    if (p === "month") {
      const y = now.getFullYear(), mo = now.getMonth();
      const total = new Date(y, mo + 1, 0).getDate();
      const jds = [], days = [];
      for (let d = 1; d <= total; d += 5) { jds.push(jdOfLocal(y, mo + 1, d)); days.push(new Date(y, mo, d)); }
      return { key: "month", jds, days, mode: "long", title: (mo + 1) + " 月" };
    }
    const y = now.getFullYear();
    const jds = [], days = [];
    for (let m = 1; m <= 12; m++) { jds.push(jdOfLocal(y, m, 15)); days.push(new Date(y, m - 1, 15)); }
    return { key: "year", jds, days, mode: "long", title: y + " 年" };
  }

  function starStr(n) { n = Math.max(1, Math.min(5, n)); return "★".repeat(n) + "☆".repeat(5 - n); }

  function renderToday() {
    const pl = planOf(curPeriod);
    const mid = pl.jds[Math.floor(pl.jds.length / 2)];
    const ph = A.moonPhase(mid);
    const retros = ["mercury", "venus", "mars", "jupiter", "saturn"].filter(k => A.retro(k, mid));
    const retroTxt = retros.length ? retros.map(k => PCN[k]).join(" · ") : "无";

    let cards;
    if (pl.mode === "day") {
      const d = pl.days[0];
      const gz = A.ganzhiOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const ms = A.signOf(A.bodyLon("moon", pl.jds[0]));
      cards = [
        { k: "月 相", v: ph.name, s: "亮面 " + ph.illum + "%" },
        { k: "日 干 支", v: gz, s: "日柱" },
        { k: "月 亮 在", v: ms.sign.cn + " " + ms.deg + "°", s: ms.sign.el + "象" },
        { k: "逆 行", v: retroTxt, s: retros.length ? "正在倒退" : "全部顺行" }
      ];
    } else {
      const jup = A.signOf(A.bodyLon("jupiter", mid));
      const sat = A.signOf(A.bodyLon("saturn", mid));
      cards = [
        { k: "月 相", v: ph.name, s: "亮面 " + ph.illum + "%" },
        { k: "木 星 在", v: jup.sign.cn, s: "这一段的扩张方向" },
        { k: "土 星 在", v: sat.sign.cn, s: "这一段的压力所在" },
        { k: "逆 行", v: retroTxt, s: retros.length ? "正在倒退" : "全部顺行" }
      ];
    }

    $('#tTitle').textContent = pl.title;
    $('#daycards').innerHTML = cards.map(cd =>
      '<div class="dc"><div class="k">' + cd.k + '</div><div class="v">' + cd.v + '</div><div class="s">' + cd.s + '</div></div>').join("");

    let hint;
    if (pl.mode === "day") hint = fmtMD(pl.days[0]) + "　按这一天的行运算。";
    else if (pl.key === "week") hint = "本周 " + fmtMD(pl.days[0]) + " – " + fmtMD(pl.days[6]) + "　取这七天每天的正午，做加权平均。";
    else if (pl.key === "month") hint = pl.title + "　每五天取一个点，看这一个月的主导力量。";
    else hint = pl.title + "　取十二个月的中点；年运重点放在木星和土星，月亮不参与。";
    $('#periodHint').textContent = hint;

    const WHEN = { yesterday: "昨天", today: "今天", tomorrow: "明天", week: "本周", month: "本月", year: "今年" };
    const rows = A.signsForPeriod(pl.jds, pl.key, WHEN[curPeriod] || "");
    const grid = $('#signgrid');
    grid.innerHTML = rows.map(r => {
      const sg = A.SIGNS[r.signIdx];
      const body = A.DOMAIN_ORDER.map(function (k) {
        const d = r.domains[k];
        return '<div class="drow"><span class="dn">' + d.key + '</span><span class="st">' + starStr(d.stars) +
          '</span></div><p>' + d.line + '</p>' +
          (detailLevel === "full" ? '<p class="dl">' + d.detail + '</p>' : '');
      }).join("");
      return '<div class="sg">' +
        '<div class="h"><span class="nm">' + sg.cn + '</span><span class="tn">' + starStr(Math.round(r.avg)) + '</span></div>' +
        '<div class="quick">相对好些：' + r.top.key + '　相对弱些：' + r.low.key + '</div>' +
        '<div class="detail">' + body + '</div></div>';
    }).join("");
    Array.prototype.forEach.call(grid.children, function (el) {
      el.addEventListener('click', function () { el.classList.toggle('open'); });
    });

    renderMine(rows, pl);
    if (mySign != null) {
      const rz = rows[mySign];
      saveCard("sg", {
        date: todayStr(),
        title: A.SIGNS[mySign].cn + " · " + pl.title,
        headline: "综合 " + starStr(Math.round(rz.avg)) + " " + rz.avg.toFixed(1),
        rows: A.DOMAIN_ORDER.map(function (k) {
          const d = rz.domains[k];
          return { label: d.key + "　" + starStr(d.stars), text: d.line };
        }),
        footer: "太阳星座作第一宫、整宫制；星级为近一年分位 · 太阳星座代表不了个人"
      }, "zodiac");
    }
    saveSnapshot(rows, pl);
    renderHist();
  }

  /* ---------- 我的星座 + 本地记录 ---------- */
  const LS = {
    get: function (k, dv) { try { var v = localStorage.getItem(k); return v == null ? dv : JSON.parse(v); } catch (e) { return dv; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  let mySign = null;   // 每次打开都不预选，由用户自己点

  function dateKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function renderSignPicker() {
    const box = $('#picksign');
    box.innerHTML = A.SIGNS.map(function (sg, i) {
      return '<button data-s="' + i + '"' + (mySign === i ? ' class="on"' : '') + '>' + sg.cn + '</button>';
    }).join("");
    Array.prototype.forEach.call(box.children, function (b) {
      b.addEventListener('click', function () {
        mySign = +b.dataset.s;
        renderToday();
      });
    });
  }

  function renderMine(rows, pl) {
    renderSignPicker();
    Array.prototype.forEach.call($('#signgrid').children, function (el, i) {
      el.classList.toggle('sel', i === mySign);
    });
    drawTrend(mySign);
    const out = $('#mineOut');
    if (mySign == null) {
      $('#signgrid').hidden = true;
      $('#levelbar').hidden = true;
      out.innerHTML = '<div class="mine"><div class="mh"><b>先选一个你的星座</b><span>只存本地</span></div>' +
        '<p>选之前什么都不显示。选完之后这里只显示你的那一条，并开始每天给你留一条记录。</p></div>';
      return;
    }
    $('#signgrid').hidden = false;
    $('#levelbar').hidden = false;
    const r = rows[mySign], sg = A.SIGNS[mySign];
    let diff = "";
    if (pl.key === "day") {
      const offMap = { yesterday: -1, today: 0, tomorrow: 1 };
      const prevRows = A.signsForPeriod([localNoon((offMap[curPeriod] || 0) - 1)], "day", "");
      const prev = prevRows[mySign];
      const chg = A.DOMAIN_ORDER.map(function (k) {
        const a1 = prev.domains[k].stars, b1 = r.domains[k].stars;
        return a1 === b1 ? null : r.domains[k].key + " " + a1 + "→" + b1;
      }).filter(Boolean);
      diff = chg.length
        ? '<div class="diff">与前一天相比：' + chg.join(" · ") + '　——这几处变化来自月亮换宫。</div>'
        : '<div class="diff">与前一天相比：五项都没变。一天之内天上几乎不动，真正每天在变的只有月亮。</div>';
    }
    out.innerHTML = '<div class="mine"><div class="mh"><b>' + sg.cn + ' · ' + pl.title + '</b><span>综合 ' +
      starStr(Math.round(r.avg)) + ' ' + r.avg.toFixed(1) + '</span></div>' +
      A.DOMAIN_ORDER.map(function (k) {
        const d = r.domains[k];
        return '<div class="mrow"><i>' + d.key + '</i><em>' + starStr(d.stars) + '</em></div><p>' + d.line + '</p>' +
          (detailLevel === "full" ? '<p class="dl">' + d.detail + '</p>' : '');
      }).join("") + diff + '</div>';
  }

  const SERIES = [
    { k: "overall", name: "综合", color: "#c9a86a", w: 2.4 },
    { k: "love", name: "爱情", color: "#d98c8c", w: 1.2 },
    { k: "career", name: "事业", color: "#8cb4d9", w: 1.2 },
    { k: "study", name: "学业", color: "#d9c88c", w: 1.2 },
    { k: "money", name: "财运", color: "#8cd9b0", w: 1.2 },
    { k: "health", name: "健康", color: "#b08cd9", w: 1.2 }
  ];

  const TREND_LABEL = { overall: "综合", love: "爱情", career: "事业", study: "学业", money: "财运", health: "健康" };
  const TREND_COLOR = { overall: "#c9a86a", love: "#d98c8c", career: "#8cb4d9", study: "#d9c88c", money: "#8cd9b0", health: "#b08cd9" };
  let trendKey = "overall";
  let trendSign = null;

  function niceStep(x) {
    const cand = [0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2];
    for (let i = 0; i < cand.length; i++) if (cand[i] >= x) return cand[i];
    return 5;
  }

  function renderChips() {
    const box = $('#trendChips');
    if (!box) return;
    box.innerHTML = Object.keys(TREND_LABEL).map(function (k) {
      return '<button data-k="' + k + '"' + (k === trendKey ? ' class="on"' : '') + '>' + TREND_LABEL[k] + '</button>';
    }).join("");
    Array.prototype.forEach.call(box.children, function (b) {
      b.addEventListener('click', function () {
        trendKey = b.getAttribute('data-k');
        renderChips();
        drawTrend(trendSign);
      });
    });
  }

  function drawTrend(signIdx) {
    const box = $('#trendbox');
    if (!box) return;
    trendSign = signIdx;
    if (signIdx == null) { box.hidden = true; return; }
    box.hidden = false;
    renderChips();

    const offs = [];
    for (let i = -7; i <= 6; i++) offs.push(i);
    const ds = A.dailyScores(signIdx, offs.map(function (o) { return localNoon(o); }));
    const vals = ds.map(function (d) { return d[trendKey]; });

    const W = 900, H = 240, L = 54, R = 26, T = 16, B = 36;
    const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    const step = niceStep((mx - mn) / 4 || 0.1);
    let lo = Math.floor(mn / step) * step;
    let hi = Math.ceil(mx / step) * step;
    if (hi === lo) { hi += step; lo -= step; }
    if (hi - lo < step * 3) { hi += step; lo -= step; }

    const X = function (i) { return L + i * (W - L - R) / 13; };
    const Y = function (v) { return T + (hi - v) / (hi - lo) * (H - T - B); };

    let s = "";
    // 横向网格 + 纵轴刻度
    for (let v = lo; v <= hi + 1e-9; v += step) {
      const y = Y(v);
      s += '<line x1="' + L + '" y1="' + y.toFixed(1) + '" x2="' + (W - R) + '" y2="' + y.toFixed(1) +
        '" stroke="' + (Math.abs(v) < 1e-9 ? (window.MysticTheme?window.MysticTheme.v("line","#3c4358"):"#3c4358") : (window.MysticTheme?window.MysticTheme.v("line","#20263a"):"#20263a")) + '"' + (Math.abs(v) < 1e-9 ? ' stroke-dasharray="3 3"' : '') + '/>';
      const label = (Math.abs(v) < 1e-9 ? "0" : v.toFixed(step < 0.1 ? 2 : 1).replace(/\.0$/, ""));
      s += '<text x="' + (L - 10) + '" y="' + (y + 4).toFixed(1) + '" fill=(window.MysticTheme?window.MysticTheme.v("muted","#7b7e90"):"#7b7e90") font-size="11" text-anchor="end">' + label + '</text>';
    }
    // 纵轴
    s += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (H - B) + '" stroke=(window.MysticTheme?window.MysticTheme.v("line","#2b3147"):"#2b3147")/>';
    // 横轴
    s += '<line x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '" stroke=(window.MysticTheme?window.MysticTheme.v("line","#2b3147"):"#2b3147")/>';

    // 今天竖线
    s += '<line x1="' + X(7).toFixed(1) + '" y1="' + T + '" x2="' + X(7).toFixed(1) + '" y2="' + (H - B) +
      '" stroke="#c9a86a" stroke-dasharray="3 3" opacity=".45"/>';
    s += '<text x="' + X(7).toFixed(1) + '" y="' + (T - 4) + '" fill="#c9a86a" font-size="10" text-anchor="middle">今天</text>';

    // 折线
    const col = TREND_COLOR[trendKey];
    s += '<polyline points="' + vals.map(function (v, i) { return X(i).toFixed(1) + "," + Y(v).toFixed(1); }).join(" ") +
      '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';

    // 点 + 日期
    offs.forEach(function (o, i) {
      const d = new Date(); d.setDate(d.getDate() + o);
      s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(vals[i]).toFixed(1) + '" r="' + (i === 7 ? 3.6 : 2.6) +
        '" fill="' + col + '"/>';
      if (i % 2 === 0 || i === 7) {
        s += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 14) + '" fill="' + (i === 7 ? "#c9a86a" : "#5a5d70") +
          '" font-size="10.5" text-anchor="middle">' + (d.getMonth() + 1) + "/" + d.getDate() + '</text>';
      }
    });

    // 末点数值
    const lastI = vals.length - 1;
    s += '<text x="' + (X(lastI) + 8).toFixed(1) + '" y="' + (Y(vals[lastI]) - 8).toFixed(1) +
      '" fill="' + col + '" font-size="12" text-anchor="end">' + vals[lastI].toFixed(2) + '</text>';

    $('#trend').innerHTML = s;
    $('#trend').setAttribute("viewBox", "0 0 " + W + " " + H);
    $('#trendTitle').textContent = A.SIGNS[signIdx].cn + " · " + TREND_LABEL[trendKey] + " · 前后各七天";

    const sc = $('#chartscroll');
    if (sc) {
      const target = X(7) / W * sc.scrollWidth - sc.clientWidth / 2;
      sc.scrollLeft = Math.max(0, target);
    }

    $('#chartNote').textContent = "纵轴是分数（0 以上为顺，0 以下为逆），横轴是日期，金色虚线是今天。"
      + " 数值是连续原始分，不是星级——所以两天差 0.3 也能看出来。可左右滑动查看。";
  }

  function saveSnapshot(rows, pl) {
    if (mySign == null || pl.key !== "day") return;
    const key = dateKey(pl.days[0]) + "|" + mySign;
    const r = rows[mySign];
    const hist = LS.get("mystic.hist", {});
    const rec = hist[key] || { d: dateKey(pl.days[0]), s: mySign, v: null };
    rec.lines = A.DOMAIN_ORDER.map(function (k) { return r.domains[k].key + ":" + r.domains[k].line; });
    rec.avg = r.avg;
    hist[key] = rec;
    const keys = Object.keys(hist).sort();
    while (keys.length > 180) { delete hist[keys.shift()]; }
    LS.set("mystic.hist", hist);
  }

  function renderHist() {
    const hist = LS.get("mystic.hist", {});
    const today = dateKey(new Date());
    const items = Object.keys(hist).map(function (k) { return hist[k]; })
      .filter(function (r) { return mySign == null || r.s === mySign; })
      .sort(function (x, y) { return x.d < y.d ? 1 : -1; })
      .slice(0, 7);

    const marked = items.filter(function (r) { return r.v === 1 || r.v === -1; });
    const hitN = marked.filter(function (r) { return r.v === 1; }).length;
    const stat = $('#hitStat');
    if (!stat) return;
    stat.textContent = mySign == null ? ""
      : (marked.length
        ? "你自己标过的 " + marked.length + " 天里，觉得说对了 " + hitN + " 天（" + Math.round(hitN / marked.length * 100) + "%）。这是你的判断，不是系统的准确率。"
        : "还没标过。每天回来点一下「准 / 不准」，攒够几天就能看到你自己的记录。");

    const box = $('#hist');
    if (!box) return;
    if (!items.length) {
      box.innerHTML = '<div class="hint" style="margin:0">还没有记录。从今天开始，明天再来看这里就有对照了。</div>';
      return;
    }
    box.innerHTML = items.map(function (r) {
      const lines = (r.lines || []).map(function (x) {
        const i = x.indexOf(":");
        return '<p><b>' + x.slice(0, i) + '</b>' + x.slice(i + 1) + '</p>';
      }).join("");
      return '<div class="hrow" data-k="' + r.d + '|' + r.s + '">' +
        '<div class="hh"><span class="hd">' + r.d + (r.d === today ? " · 今天" : "") + '</span>' +
        '<span class="hv"><button class="yes' + (r.v === 1 ? " on" : "") + '" data-v="1" data-k="' + r.d + '|' + r.s + '">准</button>' +
        '<button class="no' + (r.v === -1 ? " on" : "") + '" data-v="-1" data-k="' + r.d + '|' + r.s + '">不准</button></span></div>' +
        lines + '</div>';
    }).join("");

    Array.prototype.forEach.call(box.querySelectorAll('.hv button'), function (b) {
      b.addEventListener('click', function () {
        const h = LS.get("mystic.hist", {});
        const k = b.getAttribute('data-k');
        if (!h[k]) return;
        const v = +b.getAttribute('data-v');
        h[k].v = (h[k].v === v) ? null : v;
        LS.set("mystic.hist", h);
        renderHist();
      });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('#periods button'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('#periods button'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      curPeriod = b.dataset.p;
      renderToday();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('#levelbar button'), function (b) {
    if (b.dataset.l === detailLevel) b.classList.add('on'); else b.classList.remove('on');
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('#levelbar button'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      detailLevel = b.dataset.l;
      try { localStorage.setItem("mystic.level", detailLevel); } catch (e) {}
      renderToday();
    });
  });

  function showConfirm(msg, onYes) {
    const ov = document.createElement("div");
    ov.className = "modalov";
    ov.innerHTML = '<div class="modalbox" role="dialog" aria-modal="true">' +
      '<p>' + msg + '</p>' +
      '<div class="modalbtns"><button type="button" class="mno">否</button>' +
      '<button type="button" class="myes">是</button></div></div>';
    document.body.appendChild(ov);

    const noBtn = ov.querySelector(".mno");
    const yesBtn = ov.querySelector(".myes");
    let done = false;

    function close() {
      if (done) return;
      done = true;
      document.removeEventListener("keydown", onKey, true);
      ov.remove();
    }
    function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); close(); }
    }
    noBtn.addEventListener("click", close);
    yesBtn.addEventListener("click", function () { close(); onYes(); });
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.addEventListener("keydown", onKey, true);
    setTimeout(function () { if (noBtn.focus) noBtn.focus(); }, 30);
  }

  const clearBtn = document.querySelector('#clearHist');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    showConfirm("确定要清除记录吗？", function () {
      LS.set("mystic.hist", {});
      renderHist();
      toast("记录已清除");
    });
  });

  window.__showConfirm = showConfirm;

  /* ================= 首页 ================= */
  function renderHome() {
    const box = $('#homeFacts');
    if (!box) return;
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
    const hl = window.MysticHuangli && window.MysticHuangli.day(y, m, dd);
    const A2 = window.MysticAstro;
    const jd = A2.nowJD();
    const ph = A2.moonPhase(jd);
    const ms = A2.signOf(A2.bodyLon("moon", jd));

    const facts = [];
    if (hl) {
      facts.push({ k: "农 历", v: hl.lunarText, s: hl.ganzhiDay + " 日 · " + hl.god });
      facts.push({ k: "值 神", v: hl.god + " · " + hl.officer, s: hl.godKind + (hl.jieqi ? " · " + hl.jieqi : "") });
      facts.push({ k: "宜", v: hl.yi.slice(0, 3).join("　") || "—", s: hl.ji.length ? "忌 " + hl.ji.slice(0, 2).join("　") : "无忌" });
    }
    facts.push({ k: "月 相", v: ph.name, s: "亮面 " + ph.illum + "% · 月亮在" + ms.sign.cn });

    box.innerHTML = facts.map(function (f) {
      return '<div class="hf"><div class="k">' + f.k + '</div><div class="v">' + f.v + '</div><div class="s">' + f.s + '</div></div>';
    }).join("");
  }

  Array.prototype.forEach.call(document.querySelectorAll('.hentry'), function (el) {
    el.addEventListener('click', function () {
      const go = el.getAttribute('data-go');
      const btn = document.querySelector('nav button[data-tab="' + go + '"]');
      if (btn) btn.click();
    });
  });

  /* 手机端：首页「六个入口」默认收起，避免和顶部导航重复（桌面端保持展开） */
  (function () {
    var det = document.querySelector("details.homeentries");
    if (!det) return;
    var narrow = window.matchMedia && window.matchMedia("(max-width:760px)").matches;
    if (narrow) det.open = false;
  })();

  const PANEL_CARD = { tarot: "tr", astro: "np", today: "sg", huangli: "hl", yijing: "yj", he: "he" };

  function toast(msg) {
    let el = document.querySelector('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  const gs = document.querySelector('#globalShare');
  if (gs) gs.addEventListener('click', function () {
    const p = document.querySelector('.panel.on');
    const key = p ? PANEL_CARD[p.id.replace('panel-', '')] : null;
    if (!key) return;
    if (!CARD[key]) { toast("这一页还没有结果——先算一次再存图"); return; }
    makeCard(key);
    toast("已生成图片");
  });

  const todayBtn = document.querySelector('nav button[data-tab="today"]');
  if (todayBtn) todayBtn.addEventListener('click', renderToday);

  /* ================= 黄历 ================= */
  let hlOffset = 0;
  const WD = ["日", "一", "二", "三", "四", "五", "六"];

  function renderHuangli() {
    const d = new Date();
    d.setDate(d.getDate() + hlOffset);
    const y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
    const r = window.MysticHuangli.day(y, m, dd);
    const main = $('#hlMain');
    if (!r) {
      main.innerHTML = '<div class="hlcard"><div class="hlsub">黄历数据覆盖 2024–2035 年，这个日期超出范围了。</div></div>';
      $('#hlList').innerHTML = "";
      return;
    }
    $('#hlTitle').textContent = (hlOffset === 0 ? "今天 · " : "") +
      y + " 年 " + m + " 月 " + dd + " 日　星期" + WD[d.getDay()];

    const chips = function (arr, cls) {
      if (!arr.length) return '<span class="chip none">无</span>';
      return arr.map(function (w) { return '<span class="chip ' + cls + '">' + w + '</span>'; }).join("");
    };

    main.innerHTML = '<div class="hlcard">' +
      '<div class="hlbig"><b>' + r.lunarText + '</b><span>农历</span></div>' +
      '<div class="hlsub">' + r.ganzhiDay + ' 日　·　' + r.clash + '　·　' + r.sha + '</div>' +
      '<div class="hltags">' +
        '<span class="hltag ' + (r.godKind === "黄道" ? "y" : "b") + '">值神 ' + r.god + ' · ' + r.godKind + '</span>' +
        '<span class="hltag">建除 ' + r.officer + '</span>' +
        (r.jieqi ? '<span class="hltag y">节气 ' + r.jieqi + '</span>'
                 : '<span class="hltag">当前节气 ' + r.jieqiNow + '</span>') +
      '</div>' +
      '<div class="hlpeng">彭祖百忌　' + r.pengGan + '；' + r.pengZhi + '</div>' +
      '<div class="hlsplit">' +
        '<div><h4 class="yih4">宜</h4><div class="chips">' + chips(r.yi, "") + '</div></div>' +
        '<div><h4 class="jih4">忌</h4><div class="chips">' + chips(r.ji, "ji") + '</div></div>' +
      '</div></div>';

    saveCard("hl", {
      date: y + "/" + m + "/" + dd,
      title: r.lunarText,
      headline: r.ganzhiDay + " 日 · 值神" + r.god + "（" + r.godKind + "）· 建除" + r.officer,
      tags: [r.clash, r.sha, r.jieqi ? "节气 " + r.jieqi : "当前节气 " + r.jieqiNow].filter(Boolean),
      cols: [
        { label: "宜", items: r.yi.slice(0, 12) },
        { label: "忌", items: r.ji.slice(0, 12) }
      ],
      rows: [
        { label: "彭祖百忌", text: r.pengGan + "；" + r.pengZhi }
      ],
      footer: "数据由 cnlunar 生成，宜忌取通行通书体例 · 不同版本互有出入"
    }, "huangli");

    const list = window.MysticHuangli.range(y, m, dd, 7);
    $('#hlList').innerHTML = list.map(function (x) {
      const dt = x.date;
      return '<div class="hlrow"><span class="d1">' + (dt.getMonth() + 1) + '/' + dt.getDate() +
        '　周' + WD[dt.getDay()] + '</span>' +
        '<span class="d2">' + x.lunarText + '　' + x.ganzhiDay + ' 日　' + x.god + ' · ' + x.officer + '</span>' +
        '<span class="d3">宜 ' + (x.yi.slice(0, 3).join(" ") || "—") + '</span></div>';
    }).join("");
  }

  Array.prototype.forEach.call([['#hlPrev', -1], ['#hlNext', 1], ['#hlToday', 'reset']], function (p) {
    const el = document.querySelector(p[0]);
    if (!el) return;
    el.addEventListener('click', function () {
      if (p[1] === 'reset') hlOffset = 0;
      else hlOffset += p[1];
      renderHuangli();
    });
  });

  const hlBtn = document.querySelector('nav button[data-tab="huangli"]');
  if (hlBtn) hlBtn.addEventListener('click', renderHuangli);

  /* ================= 易经 ================= */
  function yaoBar(isYang, dong, label) {
    const cls = "yline " + (isYang ? "yang" : "yin") + (dong ? " dong" : "");
    const inner = isYang ? '<span></span>' : '<span></span><span></span>';
    const mark = dong ? '<i class="mark">' + (isYang ? '○' : '×') + '</i>' : '';
    return '<div class="' + cls + '">' + inner + mark + '</div>';
  }

  const TRI_PLAIN = {
    "乾": "硬、抢先、不肯停",
    "兑": "用说的、取悦、交换",
    "离": "显出来、看得清，但要附着在别的东西上",
    "震": "突然动一下、受惊、发起",
    "巽": "慢慢渗进去、顺着来、不硬顶",
    "坎": "有水也有险、反复、容易陷进去",
    "艮": "停住、卡住、不动",
    "坤": "承受、顺着、比较被动"
  };

  const DOMAIN_NOTE = {
    love: "——这是一个关于关系的问题。",
    career: "——这是一个关于事情能不能成、要不要做的问题。",
    study: "——这是一个关于进度和投入的问题。",
    money: "——这是一个关于钱怎么处置的问题。",
    health: "——这是一个关于身体和状态的问题。",
    general: "——这是你把一件说不清的事拿出来问。"
  };

  const DOMAIN_ACTION = {
    love: [
      "具体一点：先做一件她不需要费力回应的小事——一条有内容的信息、一个共同话题。别急着要一个说法。",
      "具体一点：把你想说的压成三句，删掉所有试探性的问句，再发出去。",
      "具体一点：给一个不含要求的邀约——时间、地点、做什么，让对方只需要回答去或不去。",
      "具体一点：记住她提过的一个细节，今天用一个动作回应，不解释。",
      "具体一点：今天不追问关系状态，只维持一次正常的、轻松的对话。",
      "具体一点：把「她怎么想」换成「我能接受什么」，写下来，再决定下一步。"
    ],
    career: [
      "具体一点：把你要推进的那件事写成一句话，找那个能拍板的人说一次，别再在脑子里推演。",
      "具体一点：选一个 30 分钟能交付的动作，做出能被看到的版本。",
      "具体一点：今天把需求写成三行发给对方：要什么、什么时候、为什么是你。",
      "具体一点：先处理最容易卡住的那一环，其余会自己顺。",
      "具体一点：把「我再想想」换成一个明确的回复时间，今天发出去。",
      "具体一点：找一个数字或事实支撑你的判断，再开口。"
    ],
    study: [
      "具体一点：把最难的那一块单独切出来，今天只做它，别从会做的开始。",
      "具体一点：今天只做题，不看新资料。",
      "具体一点：把目标缩到一页纸能写完。",
      "具体一点：找一个能讲给别人听的版本，讲一遍就知道哪里没懂。",
      "具体一点：关掉通知，设 25 分钟，只做一件事。",
      "具体一点：先复习昨天的错题，再开新的一章。"
    ],
    money: [
      "具体一点：先把最近一个月的进出记一遍，再决定要不要动这笔钱。",
      "具体一点：今天只做一件事——把订阅和自动续费列出来，能停的停掉。",
      "具体一点：大额支出放 24 小时再决定。",
      "具体一点：把「想要」和「需要」分两列写，数字会自己说话。",
      "具体一点：先算这笔钱三个月不动的后果，再谈收益。",
      "具体一点：今天适合要账、谈价、把该收的收回来。"
    ],
    health: [
      "具体一点：先睡够三天、按时吃饭，别的判断都会跟着变准。",
      "具体一点：今天不加练，只保证睡眠时间。",
      "具体一点：把久坐的一小时拆成两段，起来走五分钟。",
      "具体一点：晚饭少吃一口，睡前少看十分钟屏幕。",
      "具体一点：把体检或牙科这类拖了很久的事，今天约上。",
      "具体一点：累就休息，不要用咖啡换清醒。"
    ],
    general: [
      "具体一点：把这件事里你能控制的部分写下来，只做那一部分。",
      "具体一点：把问题写成一句话，能写清楚的基本就解决一半。",
      "具体一点：今天只推进一件小事，别同时开三个头。",
      "具体一点：找一个不在局里的人聊十分钟，只听不决定。",
      "具体一点：把「等条件成熟」换成一个具体日期。",
      "具体一点：先做一个可以撤销的决定，而不是一个不可逆的。"
    ]
  };

  function domainAction(dom, r, q) {
    const pool = DOMAIN_ACTION[dom] || DOMAIN_ACTION.general;
    const V = window.MysticVoice;
    if (!V || !pool || !pool.length) return (pool && pool[0]) || "";
    return V.pick(pool, V.seed([dom, r && r.ben ? r.ben.name : "", r && r.changes ? r.changes.join(",") : "", q || ""]));
  }

  const MOVE_ADVICE = {
    0: "六爻都不动：现在不是行动的时候，是看清楚的时候。硬推推不动，推了也不会有回报。",
    1: "只有一爻在动：转折点很集中，就在上面说的那个位置。其他都是枝节，别被分散注意力。",
    2: "两爻在动：局面在换，但方向还没定。这时候下重注会后悔。",
    3: "三爻在动：局面正在整体翻转。你能做的是跟着变，不是把它扳回来。",
    4: "四爻在动：大势已经偏了，本卦只剩一点余温。",
    5: "五爻在动：几乎全变了，你看到的是旧局面的尾巴。",
    6: "六爻全动：这不是转折，是换了一个局面。旧的先放手。"
  };

  /* 爻辞里的断语：直接从原文取，不臆测 */
  const JUDGE_ORDER = ["元吉", "无不利", "大吉", "吉", "无咎", "悔亡", "无悔", "悔", "吝", "厉", "凶", "无攸利", "无誉"];
  const JUDGE_PLAIN = {
    "元吉": "大顺，基本没有阻碍",
    "无不利": "怎么做都顺",
    "大吉": "很顺",
    "吉": "顺",
    "无咎": "不算好，但也不会出错，可以走一步",
    "悔亡": "后悔会慢慢消失",
    "无悔": "不会后悔",
    "悔": "会后悔，做完心里堵",
    "吝": "有点憋屈、有点难看，但不致命",
    "厉": "有危险，得小心",
    "凶": "明说不吉，别硬来",
    "无攸利": "往前走没什么好处",
    "无誉": "没什么可夸的，平平过"
  };

  function judgeOf(text) {
    if (!text) return null;
    for (let i = 0; i < JUDGE_ORDER.length; i++) {
      const w = JUDGE_ORDER[i];
      if (text.indexOf(w) !== -1) return { word: w, plain: JUDGE_PLAIN[w] };
    }
    return null;
  }

  function plainReading(r, q) {
    const b = r.ben, v = r.bian;
    const n = r.changes.length;
    const dom = (window.MysticEngine && q) ? window.MysticEngine.classify(q).key : "general";
    const out = [];

    out.push({
      h: "你在问什么",
      p: (q ? "「" + q + "」" : "（没有写问题）") + (DOMAIN_NOTE[dom] || "")
    });

    const bai = (window.YIJING_BAI && window.YIJING_BAI[b.name]) || "";
    out.push({
      h: "现在的局面",
      p: "「" + b.name + "」这个卦，" +
        (b.upper === b.lower
          ? "上下都是" + TRI_PLAIN[b.upper]
          : "外面是" + TRI_PLAIN[b.upper] + "，里面是" + TRI_PLAIN[b.lower]) +
        "。换句话说：" + bai
    });

    let third;
    if (n === 0) {
      third = "没有哪一爻在动——整件事现在是静止的。没有暗流，也没有突变。";
    } else {
      const i = r.changes[0];
      const yaoText = (b.yao && b.yao[i]) || "";
      const j = judgeOf(yaoText);
      const ybArr = (window.YIJING_YAO_BAI && window.YIJING_YAO_BAI[b.name]) || [];
      const ybText = ybArr[i] || "";
      third = "变化发生在第 " + (i + 1) + " 爻。" + window.MysticYijing.POS_MEAN[i] +
        (ybText ? " 这一爻说的是：" + ybText + "（大意）" : "") +
        (j ? " 断语是「" + j.word + "」——" + j.plain + "。" : "") +
        (n > 1 ? " 另外还有 " + (n - 1) + " 爻在动，说明不止一处松动了。" : "");
    }
    out.push({ h: "卡在哪", p: third });

    let fourth;
    if (v && v.no !== b.no) {
      const vb = (window.YIJING_BAI && window.YIJING_BAI[v.name]) || "";
      fourth = "照这个势头走，会走到「" + v.name + "」——" + vb;
    } else {
      fourth = "六爻都不动，局面不会自己变。它变成什么样，取决于你接下来做什么。";
    }
    out.push({ h: "会往哪走", p: fourth });

    out.push({
      h: "你现在能做什么",
      p: (MOVE_ADVICE[n] || MOVE_ADVICE[3]) + " " + domainAction(dom, r, q)
    });

    return out;
  }

  function plainHTML(r, q) {
    return '<div class="yjsum"><div class="sumb">白 话 解 读</div>' +
      plainReading(r, q).map(function (s) {
        return '<div class="psum"><b>' + s.h + '</b><p>' + s.p + '</p></div>';
      }).join("") + '</div>';
  }

  function yjSummary(r, q) {
    const b = r.ben, v = r.bian, Y = window.MysticYijing;
    const de = Y.TRI_DE;
    const bai = (window.YIJING_BAI && window.YIJING_BAI[b.name]) || "";
    const n = r.changes.length;
    let move;
    if (n === 0) move = "六爻都不动，说明这件事眼下是「定」的，不是「变」的——重点在看守，不在行动。";
    else if (n === 1) move = "只有第 " + (r.changes[0] + 1) + " 爻动，" + Y.POS_MEAN[r.changes[0]] + "整件事的转折就落在这一点上。";
    else if (n <= 3) move = "有 " + n + " 爻动，局面在换方向、还没定，这时候不宜下重注。";
    else if (n <= 5) move = "已动 " + n + " 爻，大势偏向变卦那一侧，本卦只剩余温。";
    else move = "六爻全动，整个局面翻转，几乎等于重新开始。";

    const dir = (n > 0 && v && v.no !== b.no) ? "从「" + b.name + "」走向「" + v.name + "」。" : "";

    let domLine = "";
    if (q && window.MysticEngine) {
      const dk = window.MysticEngine.classify(q).key;
      domLine = ({
        love: "放到你问的这件事上：卦说的是此刻的势，不是对方的答案——势顺着，动作还得你自己做。",
        career: "放到你问的这件事上：卦看的是时机与位置，不替你决定去留，只提醒你哪一步在硬撑。",
        study: "放到你问的这件事上：卦看的是势头，不是分数——势头对了，剩下的靠时间堆。",
        money: "放到你问的这件事上：卦不替你算收益，只提示风险在哪一头。",
        health: "放到你问的这件事上：卦看的是节奏，不是诊断——该休息就别硬扛。",
        general: "放到你问的这件事上：卦给的是视角，不是结论。"
      })[dk] || "";
    }

    const head = q ? "你问的是「" + q + "」。" : "";
    return head + "这一卦是「" + b.name + "」，上" + b.upper + "（" + de[b.upper] + "）下" + b.lower + "（" + de[b.lower] +
      "）——外面是" + de[b.upper] + "，里面是" + de[b.lower] + "。" + bai + move + dir + domLine;
  }

  function renderYj(r, q) {
    const Y = window.MysticYijing;
    q = (q || "").trim();
    const b = r.ben, v = r.bian;

    let lines = "";
    for (let i = 5; i >= 0; i--) {
      lines += yaoBar(r.benLines[i] === 1, r.changes.indexOf(i) !== -1, i);
    }

    const partsRaw = r.parts.map(function (p) { return p.label + "：" + p.text; }).join("　");
    const Vv = window.MysticVoice;
    const yjClose = Vv ? Vv.pick(Vv.YJ_CLOSE, Vv.seed([q, b.name])) : "";
    const parts = r.parts.map(function (p) {
      return '<div class="yjpart"><div class="lbl">' + p.label + '</div><div class="txt">' + p.text + '</div></div>';
    }).join("");

    const bianBlock = r.changing && v && v.no !== b.no
      ? '<div class="yjbian"><span class="bi">本卦</span><span class="bn">' + b.symbol + ' ' + b.name + '</span>' +
        '<span class="arrow">→</span><span class="bi">变卦</span><span class="bn">' + v.symbol + ' ' + v.name +
        '</span><span class="bi">第 ' + v.no + ' 卦 · ' + v.upper + '上' + v.lower + '下</span></div>'
      : (r.changing ? '' : '<div class="yjbian"><span class="bi">六爻皆静，无变卦</span></div>');

    $('#yjOut').innerHTML =
      '<div class="yjwrap">' +
        '<div class="yjleft">' +
          '<div class="yjname"><span class="sym">' + b.symbol + '</span>' +
            '<div><b>' + b.name + '</b><i>第 ' + b.no + ' 卦 · ' + b.upper + '上' + b.lower + '下</i></div></div>' +
          '<div class="yjlines">' + lines + '</div>' +
          '<div class="yjlegend">○ 老阳为动　× 老阴为动</div>' +
        '</div>' +
        '<div class="yjright">' +
          (q ? '<div class="yjq">' + q + '</div>' : '') +
          plainHTML(r, q) +
          '<div class="yjrule">' + r.rule.text + '</div>' +
          '<div class="yjpart"><div class="lbl">白话大意（本站整理）</div><div class="txt small">' +
            ((window.YIJING_BAI && window.YIJING_BAI[b.name]) || '（暂无）') + '</div></div>' +
          '<div class="yjpart"><div class="lbl">怎么用这一卦</div><div class="txt small">' +
            yjClose + '</div></div>' +
          parts +
          bianBlock +
          '<div class="yjstruct">' + Y.readingLine(r) +
            '　' + (r.changes.length
              ? '动爻在第 ' + r.changes.map(function (i) { return i + 1; }).join('、') + ' 爻，' + Y.POS_MEAN[r.changes[0]]
              : '六爻都不动，说明这件事眼下是「定」的状态，不是「变」的状态。') +
          '</div>' +
        '</div>' +
      '</div>' + yjActions();
    $('#yjOut').hidden = false;
    saveCard("yj", {
      date: todayStr(),
      hex: b.bin,
      changes: r.changes,
      title: b.name + " · 第 " + b.no + " 卦",
      headline: b.upper + "上" + b.lower + "下" + (r.changing && v ? "　变卦：" + v.name : "　六爻皆静"),
      tags: [
        r.changes.length
          ? "动爻 " + r.changes.map(function (i) { return ["初", "二", "三", "四", "五", "上"][i]; }).join("、")
          : "六爻皆静",
        q ? "问：" + (q.length > 14 ? q.slice(0, 14) + "…" : q) : ""
      ].filter(Boolean),
      rows: [
        { label: "白话", text: (window.YIJING_BAI && window.YIJING_BAI[b.name]) || "" },
        { label: "原文", text: partsRaw },
        { label: "怎么用", text: r.rule.text }
      ],
      footer: "经文为公有领域《周易》原文，经双源核对；白话为本站整理的大意；变爻法依朱熹《周易本义》"
    }, "yijing");
    if ($('#yjOut').scrollIntoView) $('#yjOut').scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const yjBtn = document.querySelector('#yjCast');

  const YJ_LOCK_KEY = "mystic_yj_lock";

  function yjLoadLock() {
    try { return JSON.parse(localStorage.getItem(YJ_LOCK_KEY) || "null"); } catch (e) { return null; }
  }
  function yjSaveLock(v) { try { localStorage.setItem(YJ_LOCK_KEY, JSON.stringify(v)); } catch (e) {} }
  function yjClearLock() { try { localStorage.removeItem(YJ_LOCK_KEY); } catch (e) {} }

  function yjSetLocked(v) {
    window.__yjLocked = !!v;
    const inp = $('#yjQ'), btn = $('#yjCast');
    if (inp) inp.readOnly = !!v;
    if (btn) {
      btn.disabled = !!v;
      btn.textContent = v ? '已 起 卦' : '掷 六 次';
    }
  }

  function yjHint() {
    const err = $('#yjErr');
    if (!err) return;
    err.textContent = "这一问已经起过卦了。同一件事不重复占——要换问题请点「返回」，想重摇请点「再算一卦」。";
    if (err.scrollIntoView) err.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function yjActions() {
    return '<div class="yjactions">' +
      '<button class="btn ghost" id="yjBack">返 回</button>' +
      '<button class="btn ghost" id="yjAgain">再算一卦</button>' +
      '<span class="yjtip">一事一占：重摇等于把同一件事问第二遍，结果不作数。</span>' +
      '</div>';
  }

  if (yjBtn) yjBtn.addEventListener('click', function () {
    if (window.__yjLocked) { yjHint(); return; }
    const q = needQuestion($('#yjQ'), $('#yjErr'), "先写一句你要问的事——空着起卦，得到的是随机数，不是卦。");
    if (!q) return;
    const r = window.MysticYijing.cast();
    yjSaveLock({ q: q, vals: r.vals, at: Date.now() });
    yjSetLocked(true);
    renderYj(r, q);
  });

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.id) return;
    if (e.target.id === 'yjBack') {
      yjClearLock();
      yjSetLocked(false);
      $('#yjOut').hidden = true;
      $('#yjOut').innerHTML = '';
      $('#yjErr').textContent = '';
      $('#yjQ').value = '';
      $('#yjQ').focus();
    }
    if (e.target.id === 'yjAgain') {
      const q = ($('#yjQ').value || '').trim();
      if (!q) return;
      if (!confirm('同一件事只建议占一次。再摇一次等于重问，结果不作数——确定继续？')) return;
      const r = window.MysticYijing.cast();
      yjSaveLock({ q: q, vals: r.vals, at: Date.now() });
      renderYj(r, q);
    }
  });

  /* 刷新/重开后仍然锁住，避免换个页面重摇 */
  (function yjRestore() {
    const lock = yjLoadLock();
    if (!lock || !Array.isArray(lock.vals) || lock.vals.length !== 6) return;
    $('#yjQ').value = lock.q || '';
    yjSetLocked(true);
    renderYj(window.MysticYijing.cast(lock.vals), lock.q || '');
  })();

  /* ================= 合参 ================= */
  const HE_LOCK_KEY = "mystic_he_lock";

  function heLoad() { try { return JSON.parse(localStorage.getItem(HE_LOCK_KEY) || "null"); } catch (e) { return null; } }
  function heSave(v) { try { localStorage.setItem(HE_LOCK_KEY, JSON.stringify(v)); } catch (e) {} }
  function heClear() { try { localStorage.removeItem(HE_LOCK_KEY); } catch (e) {} }

  function heSetLocked(v) {
    window.__heLocked = !!v;
    const inp = $('#heQ'), btn = $('#heGo');
    if (inp) inp.readOnly = !!v;
    if (btn) { btn.disabled = !!v; btn.textContent = v ? '已 起 卦' : '三 面 合 参'; }
  }

  function heHint() {
    const err = $('#heErr');
    if (!err) return;
    err.textContent = "这一问已经合参过了。同一件事不重复占——要换问题请点「返回」，想重来请点「再算一次」。";
    if (err.scrollIntoView) err.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function heActions() {
    return '<div class="yjactions">' +
      '<button class="btn ghost" id="heBack">返 回</button>' +
      '<button class="btn ghost" id="heAgain">再算一次</button>' +
      '<span class="yjtip">一事一占：重算等于把同一件事问第二遍，结果不作数。</span>' +
      '</div>';
  }

  function heRender(data) {
    const E2 = window.MysticEngine, Y2 = window.MysticYijing, A2 = window.MysticAstro;
    const all = E2.deck();
    const card = all[data.cardIdx] || all[0];
    const rev = !!data.rev;
    const cardTxt = rev ? card.v : card.u;
    const yj = Y2.cast(data.vals);
    const jd = data.jd || A2.nowJD();
    const ms = A2.signOf(A2.bodyLon("moon", jd));
    const ph = A2.moonPhase(jd);
    const retros = ["mercury", "venus", "mars", "jupiter", "saturn"].filter(function (k) { return A2.retro(k, jd); });

    const heTxt = noteOf(PHASE_NOTE, ph.name);
    const retroTxt = retros.length
      ? PCN[retros[0]] + "正在逆行——" + noteOf(RETRO_NOTE, retros[0])
      : "行星全部顺行。";

    $('#heOut').innerHTML =
      '<div class="hecard"><div class="src">塔 罗</div>' +
        '<div class="big">' + card.name + (rev ? "（逆）" : "") + '</div>' +
        '<div class="sub">' + card.en + '　·　' + card.el + '</div>' +
        '<div class="body">' + cardTxt + '<em>照的是你此刻心里的位置。</em></div></div>' +

      '<div class="hecard"><div class="src">易</div>' +
        '<div class="big">' + yj.ben.symbol + ' ' + yj.ben.name + '</div>' +
        '<div class="sub">第 ' + yj.ben.no + ' 卦　·　' + yj.ben.upper + '上' + yj.ben.lower + '下' +
          (yj.changing ? '　·　' + yj.changes.length + ' 爻动' : '　·　六爻皆静') + '</div>' +
        '<div class="body">' + (yj.parts[0] ? yj.parts[0].text : yj.ben.gua) +
          '<span class="bai">' + ((window.YIJING_BAI && window.YIJING_BAI[yj.ben.name]) || '') + '</span>' +
          '<em>' + (yj.changing ? '本卦 → 变卦 ' + yj.bian.name + '，事在动。' : '六爻不动，势是定的。') + '</em></div></div>' +

      '<div class="hecard"><div class="src">天 象</div>' +
        '<div class="big">' + ph.name + '</div>' +
        '<div class="sub">月亮 ' + ms.sign.cn + ' ' + ms.deg + '°　·　亮面 ' + ph.illum + '%</div>' +
        '<div class="body">' + heTxt + retroTxt + '<em>说的是所有人都要过的这一天。</em></div></div>' +
      heActions();

    saveCard("he", {
      date: todayStr(),
      title: "三面 · 同一件事",
      headline: yj.ben.symbol + " " + yj.ben.name + "　+　" + card.name,
      rows: [
        { label: "问题", text: data.q || "（未填写）" },
        { label: "塔罗", text: card.name + (rev ? "（逆）" : "") + "：" + cardTxt },
        { label: "易", text: yj.ben.name + "卦：" + (yj.parts[0] ? yj.parts[0].text : yj.ben.gua) },
        { label: "天象", text: ph.name + "，月亮在" + ms.sign.cn + "。" + heTxt + retroTxt }
      ],
      footer: "三套系统不共享同一套假设，也不构成互相印证"
    }, "sanmian");
    $('#heOut').hidden = false;
    $('#heNote').hidden = false;
    if ($('#heOut').scrollIntoView) $('#heOut').scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const heBtn = document.querySelector('#heGo');
  if (heBtn) heBtn.addEventListener('click', function () {
    if (window.__heLocked) { heHint(); return; }
    const q = needQuestion($('#heQ'), $('#heErr'), "先写下你要问的事——三面看的是同一个问题，没问题就没法看。");
    if (!q) return;
    const E2 = window.MysticEngine, Y2 = window.MysticYijing, A2 = window.MysticAstro;
    const all = E2.deck();
    const data = {
      q: q,
      cardIdx: Math.floor(Math.random() * all.length),
      rev: Math.random() < 0.35,
      vals: Y2.cast().vals,
      jd: A2.nowJD(),
      at: Date.now()
    };
    heSave(data);
    heSetLocked(true);
    heRender(data);
  });

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.id) return;
    if (e.target.id === 'heBack') {
      heClear();
      heSetLocked(false);
      $('#heOut').hidden = true;
      $('#heOut').innerHTML = '';
      $('#heNote').hidden = true;
      $('#heErr').textContent = '';
      $('#heQ').value = '';
      $('#heQ').focus();
    }
    if (e.target.id === 'heAgain') {
      const q = ($('#heQ').value || '').trim();
      if (!q) return;
      if (!confirm('同一件事只建议占一次。再算一次等于重问，结果不作数——确定继续？')) return;
      const E2 = window.MysticEngine, Y2 = window.MysticYijing, A2 = window.MysticAstro;
      const all = E2.deck();
      const data = {
        q: q,
        cardIdx: Math.floor(Math.random() * all.length),
        rev: Math.random() < 0.35,
        vals: Y2.cast().vals,
        jd: A2.nowJD(),
        at: Date.now()
      };
      heSave(data);
      heRender(data);
    }
  });

  (function heRestore() {
    const lock = heLoad();
    if (!lock || !Array.isArray(lock.vals) || lock.vals.length !== 6) return;
    $('#heQ').value = lock.q || '';
    heSetLocked(true);
    heRender(lock);
  })();

  function readingHTML(lines, aspectText) {
    const blocks = lines.map(function (t) {
      const m = t.match(/^(太阳|月亮|上升)([^：]{0,24})：/);
      if (m) {
        const body = t.slice(m[0].length);
        return '<div class="rblock"><div class="rh"><b>' + m[1] + '</b><span>' +
          m[2].replace(/[（）]/g, '') + '</span></div><p>' + body + '</p></div>';
      }
      return '<div class="rblock plain"><p>' + t + '</p></div>';
    }).join("");
    return '<div class="readingwrap">' + blocks +
      '<div class="rblock aspect"><div class="rh"><b>主要相位</b><span>容许度越小影响越直接</span></div><p>' +
      aspectText + '</p></div></div>';
  }

  function drawWheel(ch, hasTime) {
    const svg = $('#wheel');
    const cx = 210, cy = 210;
    const R = 198, R1 = 168, R2 = 150, RP = 122;
    let s = "";
    const asc = ch.bodies.find(b => b.key === "asc");
    const ascLon = asc ? asc.lon : 0;
    const phi = lon => 180 + (lon - ascLon);

    const pt = (r, ph) => [cx + r * Math.cos(ph * Math.PI / 180), cy - r * Math.sin(ph * Math.PI / 180)];

    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke=(window.MysticTheme?window.MysticTheme.v("line","#2b3147"):"#2b3147") stroke-width="1"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R1}" fill="none" stroke=(window.MysticTheme?window.MysticTheme.v("line","#2b3147"):"#2b3147") stroke-width="1"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R2}" fill="none" stroke="#232838" stroke-width="1"/>`;

    for (let i = 0; i < 12; i++) {
      const L = i * 30;
      const [x1, y1] = pt(R2, phi(L));
      const [x2, y2] = pt(R, phi(L));
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#232838"/>`;
      const [lx, ly] = pt((R1 + R) / 2, phi(L + 15));
      s += `<text x="${lx.toFixed(1)}" y="${(ly + 5).toFixed(1)}" fill="#8d7648" font-size="13" text-anchor="middle" font-family="serif">${A.SIGNS[i].cn}</text>`;
    }

    // 上升线（无出生时间时不画，避免给出假的上升）
    if (hasTime) {
      s += `<line x1="${cx}" y1="${cy}" x2="${(cx - R).toFixed(1)}" y2="${cy}" stroke="#c9a86a" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>`;
      s += `<text x="${cx - R - 2}" y="${cy - 8}" fill="#c9a86a" font-size="10" text-anchor="start">ASC</text>`;
    }

    // 行星
    const placed = [];
    ch.bodies.forEach(b => {
      let ph = phi(b.lon);
      // 简易避让
      for (let k = 0; k < 12; k++) {
        if (!placed.some(p => Math.abs(((p - ph + 540) % 360) - 180) > 168)) break;
        ph += 7;
      }
      placed.push(ph);
      const [x, y] = pt(RP, ph);
      const [sx, sy] = pt(R2 - 6, ph);
      s += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${(cx + (RP + 14) * Math.cos(ph * Math.PI / 180)).toFixed(1)}" y2="${(cy - (RP + 14) * Math.sin(ph * Math.PI / 180)).toFixed(1)}" stroke="#3a4159"/>`;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#d8b98a"/>`;
      s += `<text x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" fill="#e8e4dc" font-size="11" text-anchor="middle" font-family="serif">${b.cn}</text>`;
    });

    // 中心
    s += `<circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke=(window.MysticTheme?window.MysticTheme.v("line","#2b3147"):"#2b3147") opacity=".6"/>`;
    s += `<text x="${cx}" y="${cy - 6}" fill="#8d7648" font-size="10" text-anchor="middle" letter-spacing="3">NATAL</text>`;
    s += `<text x="${cx}" y="${cy + 14}" fill="#4d5062" font-size="9" text-anchor="middle">${ch.bodies[0].sign.cn}日 / ${ch.bodies[1].sign.cn}月</text>`;

    svg.innerHTML = s;
  }

  if (window.MysticHuangli) renderHuangli();
  renderHome();
})();
