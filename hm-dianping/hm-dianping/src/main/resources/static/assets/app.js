const state = {
  notes: [],
  page: 1,
  loading: false,
  hasMore: true,
  query: "",
  feed: "hot",
  category: "all",
  currentNote: null,
  aiSessionId: localStorage.getItem("hmdp_ai_session") || crypto.randomUUID()
};

localStorage.setItem("hmdp_ai_session", state.aiSessionId);

const els = {
  feed: document.querySelector("#noteFeed"),
  loading: document.querySelector("#feedLoading"),
  status: document.querySelector("#statusBanner"),
  searchForm: document.querySelector("#searchForm"),
  search: document.querySelector("#searchInput"),
  categoryList: document.querySelector("#categoryList"),
  mobileCategoryList: document.querySelector("#mobileCategoryList"),
  drawer: document.querySelector("#detailDrawer"),
  composer: document.querySelector("#composerDialog"),
  composerForm: document.querySelector("#composerForm"),
  smartCard: document.querySelector("#smartCard"),
  smartText: document.querySelector("#smartText"),
  noteSmart: document.querySelector("#noteSmart"),
  noteSmartText: document.querySelector("#noteSmartText")
};

const fallbackNotes = [
  {
    id: 9001,
    title: "人均 30 的港式茶餐厅，漏奶华真的很会",
    images: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=80",
    content: "复古灯牌、卡座和热奶茶都很有氛围。推荐黯然销魂饭、漏奶华和丝袜奶茶，适合朋友小聚，也适合下班后快速补充快乐。",
    liked: 128,
    comments: 18,
    name: "阿茶今天吃什么",
    icon: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    createTime: "2026-05-10T20:10:00"
  },
  {
    id: 9002,
    title: "西湖边新开的花园餐厅，拍照和约会都合适",
    images: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    content: "环境有很多鲜花和暖光，晚餐时段更漂亮。牛排、意面和烤鱼表现稳定，价格略高但适合纪念日。",
    liked: 256,
    comments: 36,
    name: "慢慢探店",
    icon: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80",
    createTime: "2026-05-09T18:42:00"
  },
  {
    id: 9003,
    title: "周末骑马 50 元起，杭州近郊轻户外路线",
    images: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=900&q=80",
    content: "路线不难，适合第一次体验。建议下午四点后去，光线更柔和，拍照也不晒。",
    liked: 91,
    comments: 9,
    name: "城市出逃计划",
    icon: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80",
    createTime: "2026-05-08T16:05:00"
  },
  {
    id: 9004,
    title: "适合一个人坐一下午的咖啡店",
    images: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80",
    content: "插座多，座位间距舒服，手冲和巴斯克都不错。工作日来更安静。",
    liked: 173,
    comments: 24,
    name: "咖啡地图",
    icon: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80",
    createTime: "2026-05-07T14:24:00"
  }
];

const fallbackCategories = [
  { id: "all", name: "推荐" },
  { id: "food", name: "美食" },
  { id: "coffee", name: "咖啡" },
  { id: "weekend", name: "周末" },
  { id: "date", name: "约会" },
  { id: "photo", name: "拍照" },
  { id: "cheap", name: "平价" },
  { id: "new", name: "新店" }
];

function token() {
  return localStorage.getItem("hmdp_token") || "";
}

async function request(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token()) headers.set("authorization", token());
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.success === false) throw new Error(result.errorMsg || "请求失败");
  return result.data;
}

function normalizeNote(note, index = 0) {
  const images = String(note.images || "").split(",").map(item => item.trim()).filter(Boolean);
  const image = images[0] || fallbackNotes[index % fallbackNotes.length].images;
  return {
    ...note,
    image,
    images,
    name: note.name || `探店用户 ${note.userId || ""}`.trim(),
    icon: normalizeImage(note.icon) || fallbackNotes[index % fallbackNotes.length].icon,
    liked: note.liked || 0,
    comments: note.comments || 0,
    content: stripHtml(note.content || ""),
    ratio: [0.78, 1, 1.14, 1.28, 0.92][index % 5]
  };
}

function normalizeImage(src) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/imgs/")) return src;
  if (src.startsWith("/")) return src;
  return `/imgs/${src}`;
}

function stripHtml(value) {
  const temp = document.createElement("div");
  temp.innerHTML = value.replaceAll("<br/>", "\n").replaceAll("<br>", "\n");
  return temp.textContent || temp.innerText || "";
}

function showStatus(message) {
  els.status.textContent = message;
  els.status.hidden = false;
}

function hideStatus() {
  els.status.hidden = true;
}

async function loadCategories() {
  try {
    const data = await request("/shop-type/list");
    const categories = [{ id: "all", name: "推荐" }, ...data.map(item => ({ id: item.id, name: item.name }))];
    renderCategories(categories);
  } catch {
    renderCategories(fallbackCategories);
  }
}

function renderCategories(categories) {
  [els.categoryList, els.mobileCategoryList].forEach(container => {
    container.innerHTML = "";
    categories.forEach(category => {
      const button = document.createElement("button");
      button.className = `category-pill${category.id === state.category ? " is-active" : ""}`;
      button.type = "button";
      button.textContent = category.name;
      button.addEventListener("click", () => {
        state.category = category.id;
        document.querySelectorAll(".category-pill").forEach(item => {
          item.classList.toggle("is-active", item.textContent === category.name);
        });
        state.query = category.id === "all" ? "" : category.name;
        els.search.value = state.query;
        resetAndLoad();
        if (state.query) loadSmartRecommendation(state.query);
      });
      container.appendChild(button);
    });
  });
}

async function loadNotes() {
  if (state.loading || !state.hasMore) return;
  state.loading = true;
  els.loading.textContent = "正在加载更多笔记...";
  try {
    let data;
    if (state.feed === "follow") {
      data = await request(`/blog/of/follow?lastId=${Date.now()}&offset=0`);
      data = data?.list || [];
    } else {
      data = await request(`/blog/hot?current=${state.page}`);
    }

    let notes = (Array.isArray(data) ? data : []).map(normalizeNote);
    if (state.query) {
      const q = state.query.toLowerCase();
      notes = notes.filter(note => `${note.title} ${note.content} ${note.name}`.toLowerCase().includes(q));
    }

    if (!notes.length && state.page === 1) {
      notes = fallbackNotes.map(normalizeNote);
      showStatus("当前使用示例内容预览前端效果；后端接口和图片服务就绪后会自动显示真实笔记。");
    } else if (notes.length) {
      hideStatus();
    }

    appendNotes(notes);
    state.notes.push(...notes);
    state.page += 1;
    state.hasMore = notes.length >= 4 && state.page < 8;
  } catch {
    if (state.page === 1) {
      const notes = fallbackNotes.map(normalizeNote);
      appendNotes(notes);
      state.notes = notes;
      showStatus("没有连上完整后端数据，已切换到示例内容预览。");
    }
    state.hasMore = false;
  } finally {
    state.loading = false;
    els.loading.textContent = state.hasMore ? "向下滚动加载更多" : "已经到底了";
  }
}

function appendNotes(notes) {
  const fragment = document.createDocumentFragment();
  notes.forEach(note => fragment.appendChild(createNoteCard(note)));
  els.feed.appendChild(fragment);
}

function createNoteCard(note) {
  const card = document.createElement("article");
  card.className = "note-card";
  const button = document.createElement("button");
  button.type = "button";
  button.addEventListener("click", () => openDrawer(note));
  button.innerHTML = `
    <img class="note-image" style="--ratio:${note.ratio}" src="${normalizeImage(note.image)}" alt="${escapeHtml(note.title)}" loading="lazy">
    <div class="note-body">
      <h2 class="note-title">${escapeHtml(note.title)}</h2>
      <div class="note-meta">
        <span class="author-mini">
          <img class="avatar" src="${normalizeImage(note.icon)}" alt="">
          <span>${escapeHtml(note.name)}</span>
        </span>
        <span class="like-count">♡ ${note.liked}</span>
      </div>
    </div>
  `;
  card.appendChild(button);
  return card;
}

function openDrawer(note) {
  state.currentNote = note;
  els.noteSmart.hidden = true;
  els.noteSmartText.textContent = "";
  document.querySelector("#drawerMedia").innerHTML = (note.images.length ? note.images : [note.image])
    .slice(0, 5)
    .map(src => `<img src="${normalizeImage(src)}" alt="${escapeHtml(note.title)}">`)
    .join("");
  document.querySelector("#drawerAvatar").src = normalizeImage(note.icon);
  document.querySelector("#drawerAuthor").textContent = note.name;
  document.querySelector("#drawerTime").textContent = formatTime(note.createTime);
  document.querySelector("#drawerTitle").textContent = note.title;
  document.querySelector("#drawerContent").textContent = note.content || "这个作者还没有填写更多内容。";
  document.querySelector("#drawerLike").textContent = `喜欢 ${note.liked}`;
  document.querySelector("#drawerLike").onclick = () => likeNote(note);
  document.querySelector("#drawerAnalyze").onclick = () => analyzeCurrentNote(note);
  els.drawer.classList.add("is-open");
  els.drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  els.drawer.classList.remove("is-open");
  els.drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function likeNote(note) {
  try {
    await request(`/blog/like/${note.id}`, { method: "PUT" });
    note.liked += note.isLike ? -1 : 1;
    note.isLike = !note.isLike;
    document.querySelector("#drawerLike").textContent = `喜欢 ${note.liked}`;
    resetAndLoad(false);
  } catch {
    showStatus("点赞需要登录。可以先调用 /user/login 获取 token，并存入 localStorage 的 hmdp_token。");
  }
}

function resetAndLoad(clearStatus = true) {
  state.page = 1;
  state.hasMore = true;
  state.notes = [];
  els.feed.innerHTML = "";
  if (clearStatus) hideStatus();
  loadNotes();
}

async function loadSmartRecommendation(question) {
  if (!question) {
    els.smartCard.hidden = true;
    return;
  }
  els.smartCard.hidden = false;
  els.smartText.textContent = "正在结合店铺、优惠券和笔记内容生成推荐...";
  try {
    const data = await request("/ai/query/chat", {
      method: "POST",
      body: JSON.stringify({
        sessionId: state.aiSessionId,
        message: `用户正在内容流搜索「${question}」。请给出简短探店推荐，优先结合系统里的店铺、优惠券和笔记信息。`
      })
    });
    els.smartText.textContent = data.answer || data.content || "暂时没有生成有效推荐。";
  } catch {
    els.smartText.textContent = `可以先看看「${question}」相关笔记。AI 推荐需要配置 DASHSCOPE_API_KEY，并保证后端 /ai/query/chat 可用。`;
  }
}

async function analyzeCurrentNote(note) {
  els.noteSmart.hidden = false;
  els.noteSmartText.textContent = "正在总结这篇笔记的适合人群、亮点和注意事项...";
  try {
    const data = await request("/ai/query/chat", {
      method: "POST",
      body: JSON.stringify({
        sessionId: state.aiSessionId,
        message: `请用三句话总结这篇探店笔记适合谁、亮点是什么、需要注意什么。标题：${note.title}。正文：${note.content}`
      })
    });
    els.noteSmartText.textContent = data.answer || data.content || "暂时没有生成有效总结。";
  } catch {
    els.noteSmartText.textContent = "AI 总结暂时不可用。请检查 DASHSCOPE_API_KEY 和 /ai/query/chat 接口。";
  }
}

function switchFeed(feed) {
  state.feed = feed;
  document.querySelectorAll("[data-feed]").forEach(item => {
    item.classList.toggle("is-active", item.dataset.feed === feed);
  });
  resetAndLoad();
}

function formatTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function submitComposer(event) {
  event.preventDefault();
  const form = new FormData(els.composerForm);
  const payload = {
    title: form.get("title"),
    images: form.get("images"),
    shopId: form.get("shopId") ? Number(form.get("shopId")) : null,
    content: form.get("content")
  };
  try {
    await request("/blog", { method: "POST", body: JSON.stringify(payload) });
    els.composer.close();
    els.composerForm.reset();
    resetAndLoad();
  } catch {
    showStatus("发布需要登录，并且需要有效的店铺/用户数据。");
  }
}

els.searchForm.addEventListener("submit", event => {
  event.preventDefault();
  state.query = els.search.value.trim();
  resetAndLoad();
  loadSmartRecommendation(state.query);
});

let searchTimer;
els.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = els.search.value.trim();
    resetAndLoad();
  }, 280);
});

document.querySelectorAll("[data-feed]").forEach(button => {
  button.addEventListener("click", () => switchFeed(button.dataset.feed));
});

document.querySelectorAll("[data-smart-query]").forEach(button => {
  button.addEventListener("click", () => {
    state.query = button.dataset.smartQuery;
    els.search.value = state.query;
    resetAndLoad();
    loadSmartRecommendation(state.query);
  });
});

document.querySelector("#refreshSmart").addEventListener("click", () => {
  const question = state.query || "推荐几个适合今天去的店";
  loadSmartRecommendation(question);
});

document.querySelectorAll("[data-close-drawer]").forEach(item => item.addEventListener("click", closeDrawer));
document.querySelector("#openComposer").addEventListener("click", () => els.composer.showModal());
document.querySelector("#railPublish").addEventListener("click", () => els.composer.showModal());
document.querySelector("#mobilePublish").addEventListener("click", () => els.composer.showModal());
els.composerForm.addEventListener("submit", submitComposer);

window.addEventListener("keydown", event => {
  if (event.key === "Escape") closeDrawer();
});

window.addEventListener("scroll", () => {
  const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 620;
  if (nearBottom) loadNotes();
}, { passive: true });

loadCategories();
loadNotes();
