// ------------------------------
// Global state
// ------------------------------
const state = {
  notes: [],
  page: 1,
  loading: false,
  hasMore: true,
  query: "",
  feed: "hot",
  mode: "feed",
  category: "all",
  mallCategory: "all",
  mallQuery: "",
  mallProducts: [],
  merchant: null,
  merchantProducts: [],
  merchantOrders: [],
  productVouchers: [],
  selectedVoucherId: null,
  currentProduct: null,
  currentNote: null,
  currentUser: null,
  replyTarget: null,
  trends: [],
  wallet: new Set(JSON.parse(localStorage.getItem("hmdp_wallet") || "[]")),
  collected: new Set(JSON.parse(localStorage.getItem("hmdp_collected") || "[]")),
  followed: new Set(JSON.parse(localStorage.getItem("hmdp_followed") || "[]")),
  aiSessionId: localStorage.getItem("hmdp_ai_session") || crypto.randomUUID()
};

localStorage.setItem("hmdp_ai_session", state.aiSessionId);

// ------------------------------
// DOM references
// ------------------------------
const els = {
  feed: document.querySelector("#noteFeed"),
  loading: document.querySelector("#feedLoading"),
  status: document.querySelector("#statusBanner"),
  searchForm: document.querySelector("#searchForm"),
  search: document.querySelector("#searchInput"),
  suggestPopover: document.querySelector("#suggestPopover"),
  categoryList: document.querySelector("#categoryList"),
  mobileCategoryList: document.querySelector("#mobileCategoryList"),
  contentArea: document.querySelector(".content-area"),
  mallArea: document.querySelector("#mallArea"),
  productGrid: document.querySelector("#productGrid"),
  drawer: document.querySelector("#detailDrawer"),
  drawerMedia: document.querySelector("#drawerMedia"),
  drawerThumbs: document.querySelector("#drawerThumbs"),
  composer: document.querySelector("#composerDialog"),
  shopDialog: document.querySelector("#shopDialog"),
  productDialog: document.querySelector("#productDialog"),
  cartDialog: document.querySelector("#cartDialog"),
  merchantDialog: document.querySelector("#merchantDialog"),
  voucherList: document.querySelector("#voucherList"),
  mallVoucherList: document.querySelector("#mallVoucherList"),
  cartList: document.querySelector("#cartList"),
  merchantPanel: document.querySelector("#merchantPanel"),
  composerForm: document.querySelector("#composerForm"),
  imageFiles: document.querySelector("#imageFiles"),
  videoFile: document.querySelector("#videoFile"),
  uploadPreview: document.querySelector("#uploadPreview"),
  videoPreview: document.querySelector("#videoPreview"),
  loginDialog: document.querySelector("#loginDialog"),
  loginForm: document.querySelector("#loginForm"),
  smartCard: document.querySelector("#smartCard"),
  smartText: document.querySelector("#smartText"),
  noteSmart: document.querySelector("#noteSmart"),
  noteSmartText: document.querySelector("#noteSmartText"),
  shopBridge: document.querySelector("#shopBridge"),
  commentForm: document.querySelector("#commentForm"),
  commentInput: document.querySelector("#commentInput"),
  commentList: document.querySelector("#commentList"),
  commentCount: document.querySelector("#commentCount"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileName: document.querySelector("#profileName"),
  profileHint: document.querySelector("#profileHint"),
  trendList: document.querySelector("#trendList")
};

// ------------------------------
// Demo data used when backend data is not available
// ------------------------------
const fallbackAvatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80";
const fallbackNotes = [
  {
    id: 9001,
    title: "人均 30 的港式茶餐厅，漏奶华真的很会",
    images: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=80",
    content: "复古灯牌、卡座和热奶茶都很有氛围。推荐黯然销魂饭、漏奶华和丝袜奶茶，适合朋友小聚，也适合下班后快速补充快乐。",
    liked: 128,
    comments: 18,
    userId: 2,
    name: "阿茶今天吃什么",
    icon: fallbackAvatar,
    createTime: "2026-05-10T20:10:00"
  },
  {
    id: 9002,
    title: "西湖边新开的花园餐厅，拍照和约会都合适",
    images: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    content: "环境有很多鲜花和暖光，晚餐时段更漂亮。牛排、意面和烤鱼表现稳定，价格略高但适合纪念日。",
    liked: 256,
    comments: 36,
    userId: 3,
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
    userId: 4,
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
    userId: 5,
    name: "咖啡地图",
    icon: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80",
    createTime: "2026-05-07T14:24:00"
  },
  {
    id: 9005,
    title: "视频笔记：一分钟看完今日探店路线",
    images: "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=900&q=80",
    content: "从咖啡店到晚餐店，一条适合周末的轻松路线。\n#video:https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    liked: 342,
    comments: 41,
    userId: 6,
    name: "短视频探店员",
    icon: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    createTime: "2026-05-12T19:30:00"
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

const fallbackSuggestions = ["杭州周末", "港式茶餐厅", "咖啡拍照", "人均50", "约会餐厅", "新店打卡", "一个人吃饭", "生日聚餐"];

// ------------------------------
// Request and formatting helpers
// ------------------------------
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
  const parsedContent = parseVideoContent(note.content || "");
  return {
    ...note,
    image,
    images,
    name: note.name || `探店用户 ${note.userId || ""}`.trim(),
    icon: normalizeImage(note.icon) || fallbackNotes[index % fallbackNotes.length].icon,
    liked: note.liked || 0,
    comments: note.comments || 0,
    content: parsedContent.content,
    videoUrl: normalizeMedia(note.videoUrl || note.video || parsedContent.videoUrl),
    isVideo: Boolean(note.videoUrl || note.video || parsedContent.videoUrl),
    ratio: [0.78, 1, 1.14, 1.28, 0.92][index % 5]
  };
}

function parseVideoContent(content) {
  const text = stripHtml(content || "");
  const match = text.match(/#video:([^\s]+)/i);
  return {
    videoUrl: match ? match[1].trim() : "",
    content: match ? text.replace(match[0], "").trim() : text
  };
}

function normalizeMedia(src) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/")) return src;
  return `/imgs/${src}`;
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
  temp.innerHTML = String(value).replaceAll("<br/>", "\n").replaceAll("<br>", "\n");
  return temp.textContent || temp.innerText || "";
}

function showStatus(message) {
  els.status.textContent = message;
  els.status.hidden = false;
}

function trackEvent(eventType, options = {}) {
  request("/note-event", {
    method: "POST",
    body: JSON.stringify({
      eventType,
      blogId: options.blogId || null,
      scene: options.scene || state.feed,
      keyword: options.keyword || state.query || null
    })
  }).catch(() => {
    // 行为采集不影响主流程，失败时静默忽略。
  });
}

function hideStatus() {
  els.status.hidden = true;
}

function requireLogin() {
  if (token()) return true;
  els.loginDialog.showModal();
  return false;
}

// ------------------------------
// User session and profile panel
// ------------------------------
async function initUser() {
  if (!token()) {
    renderUser(null);
    return;
  }
  try {
    const user = await request("/user/me");
    state.currentUser = user;
    renderUser(user);
    loadProfileStats();
  } catch {
    localStorage.removeItem("hmdp_token");
    renderUser(null);
  }
}

function renderUser(user) {
  if (!user) {
    els.profileAvatar.src = fallbackAvatar;
    els.profileName.textContent = "未登录";
    els.profileHint.textContent = "登录后发布、点赞、评论";
    document.querySelector("#loginButton").textContent = "登录";
    document.querySelector("#profileLogin").textContent = "手机号登录";
    return;
  }
  els.profileAvatar.src = normalizeImage(user.icon) || fallbackAvatar;
  els.profileName.textContent = user.nickName || "探店用户";
  els.profileHint.textContent = `ID ${user.id}`;
  document.querySelector("#loginButton").textContent = "已登录";
  document.querySelector("#profileLogin").textContent = "退出登录";
}

async function loadProfileStats() {
  if (!token()) return;
  try {
    const profile = await request("/content/profile");
    document.querySelector("#statNotes").textContent = profile.notes || 0;
    document.querySelector("#statLikes").textContent = profile.likes || 0;
    document.querySelector("#statCollects").textContent = profile.collects || 0;
    if (profile.nickName) els.profileName.textContent = profile.nickName;
    if (profile.icon) els.profileAvatar.src = normalizeImage(profile.icon);
  } catch {
    // 统计接口异常时保留当前用户基础信息，不影响浏览主流程。
  }
}

// ------------------------------
// Topic filters
// ------------------------------
async function loadCategories() {
  try {
    const data = await request("/shop-type/list");
    renderCategories([{ id: "all", name: "推荐" }, ...data.map(item => ({ id: item.id, name: item.name }))]);
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

// ------------------------------
// Note feed loading and rendering
// ------------------------------
async function loadNotes() {
  if (state.loading || !state.hasMore) return;
  if ((state.feed === "follow" || state.mode === "mine" || state.mode === "collections") && !token()) {
    requireLogin();
    state.hasMore = false;
    els.loading.textContent = "登录后查看你的内容";
    return;
  }
  state.loading = true;
  els.loading.textContent = "正在加载更多笔记...";
  try {
    const data = await request(buildContentUrl());
    let notes = (Array.isArray(data?.list) ? data.list : []).map(normalizeNote);
    if (!notes.length && state.page === 1) {
      if (state.mode === "feed") {
        notes = fallbackNotes.map(normalizeNote);
        showStatus("当前使用示例内容预览前端效果；后端接口和图片服务就绪后会自动显示真实笔记。");
      } else {
        showStatus(state.mode === "mine" ? "你还没有发布笔记，可以先发布第一篇。" : "你还没有收藏笔记。");
      }
    } else if (notes.length) {
      hideStatus();
    }
    appendNotes(notes);
    state.notes.push(...notes);
    notes.forEach(note => trackEvent("impression", { blogId: note.id, scene: state.mode }));
    loadProfileStats();
    state.page += 1;
    state.hasMore = Boolean(data?.hasMore);
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

function buildContentUrl() {
  const params = new URLSearchParams({ current: String(state.page) });
  if (state.mode === "mine") {
    return `/content/mine?${params.toString()}`;
  }
  if (state.mode === "collections") {
    return `/content/collections?${params.toString()}`;
  }
  params.set("channel", state.feed);
  if (state.query) params.set("query", state.query);
  return `/content/feed?${params.toString()}`;
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
  const cover = note.isVideo
    ? `<video class="note-image note-video-cover" style="--ratio:${note.ratio}" src="${normalizeMedia(note.videoUrl)}" poster="${normalizeImage(note.image)}" muted playsinline preload="metadata"></video><span class="video-badge">视频</span>`
    : `<img class="note-image" style="--ratio:${note.ratio}" src="${normalizeImage(note.image)}" alt="${escapeHtml(note.title)}" loading="lazy">`;
  button.innerHTML = `
    <div class="note-cover">
      ${cover}
    </div>
    <div class="note-body">
      <h2 class="note-title">${escapeHtml(note.title)}</h2>
      <div class="note-meta">
        <span class="author-mini">
          <img class="avatar" src="${normalizeImage(note.icon)}" alt="">
          <span>${escapeHtml(note.name)}</span>
        </span>
        <span class="like-count"><span aria-hidden="true">♥</span>${note.liked}</span>
      </div>
    </div>
  `;
  card.appendChild(button);
  return card;
}

// ------------------------------
// Note detail drawer and image carousel
// ------------------------------
async function openDrawer(note) {
  try {
    const freshNote = await request(`/content/note/${note.id}`);
    note = normalizeNote(freshNote);
  } catch {
    // 详情聚合接口不可用时继续展示卡片已有数据。
  }
  pauseFeedVideos();
  state.currentNote = note;
  state.replyTarget = null;
  els.noteSmart.hidden = true;
  els.noteSmartText.textContent = "";
  renderDrawerImages(note);
  document.querySelector("#drawerAvatar").src = normalizeImage(note.icon);
  document.querySelector("#drawerAuthor").textContent = note.name;
  document.querySelector("#drawerTime").textContent = formatTime(note.createTime);
  document.querySelector("#drawerTitle").textContent = note.title;
  document.querySelector("#drawerContent").textContent = note.content || "这个作者还没有填写更多内容。";
  renderShopBridge(note.shop);
  document.querySelector("#drawerLike").textContent = `♥ ${note.liked}`;
  document.querySelector("#drawerCollect").textContent = state.collected.has(String(note.id)) ? "★ 已收藏" : "☆ 收藏";
  document.querySelector("#drawerFollow").textContent = state.followed.has(String(note.userId)) ? "已关注" : "关注";
  if (note.isCollect) state.collected.add(String(note.id));
  if (note.isFollow) state.followed.add(String(note.userId));
  document.querySelector("#drawerCollect").textContent = state.collected.has(String(note.id)) ? "★ 已收藏" : "☆ 收藏";
  document.querySelector("#drawerFollow").textContent = state.followed.has(String(note.userId)) ? "已关注" : "关注";
  document.querySelector("#drawerLike").onclick = () => likeNote(note);
  document.querySelector("#drawerCollect").onclick = () => toggleCollect(note);
  document.querySelector("#drawerFollow").onclick = () => toggleFollow(note);
  document.querySelector("#drawerAnalyze").onclick = () => analyzeCurrentNote(note);
  els.drawer.classList.add("is-open");
  els.drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  trackEvent("detail", { blogId: note.id, scene: "detail" });
  loadCollectState(note);
  loadComments(note.id);
}

function renderShopBridge(shop) {
  if (!shop) {
    els.shopBridge.hidden = true;
    return;
  }
  const image = String(shop.images || "").split(",").map(item => item.trim()).filter(Boolean)[0] || fallbackNotes[0].images;
  document.querySelector("#shopImage").src = normalizeImage(image);
  document.querySelector("#shopName").textContent = shop.name || "关联店铺";
  const score = shop.score ? `${(shop.score / 10).toFixed(1)}分` : "暂无评分";
  const price = shop.avgPrice ? `人均 ¥${shop.avgPrice}` : "价格待补充";
  document.querySelector("#shopMeta").textContent = `${score} · ${price} · ${shop.area || "本地生活"}`;
  document.querySelector("#shopAddress").textContent = shop.address || shop.openHours || "";
  const hasVoucher = Boolean(shop.voucherId);
  document.querySelector("#shopOffer").hidden = !hasVoucher;
  if (hasVoucher) {
    document.querySelector("#voucherTitle").textContent = shop.voucherTitle || "店铺优惠";
    document.querySelector("#voucherSubTitle").textContent = shop.voucherSubTitle || "到店前先看看优惠";
    document.querySelector("#voucherAction").onclick = () => openShopDialog(shop);
  }
  els.shopBridge.hidden = false;
}

async function openShopDialog(shop) {
  if (!shop?.id) return;
  document.querySelector("#shopDialogName").textContent = shop.name || "店铺详情";
  document.querySelector("#shopDialogImage").src = normalizeImage(String(shop.images || "").split(",")[0] || fallbackNotes[0].images);
  const score = shop.score ? `${(shop.score / 10).toFixed(1)}分` : "暂无评分";
  const price = shop.avgPrice ? `人均 ¥${shop.avgPrice}` : "价格待补充";
  document.querySelector("#shopDialogMeta").textContent = `${score} · ${price} · ${shop.area || "本地生活"}`;
  document.querySelector("#shopDialogAddress").textContent = shop.address || "";
  document.querySelector("#shopDialogHours").textContent = shop.openHours ? `营业时间 ${shop.openHours}` : "";
  els.voucherList.innerHTML = `<p class="empty-text">正在加载优惠...</p>`;
  els.shopDialog.showModal();
  try {
    const vouchers = await request(`/voucher/list/${shop.id}`);
    renderVouchers(Array.isArray(vouchers) ? vouchers : []);
  } catch {
    renderVouchers([]);
  }
}

function renderVouchers(vouchers) {
  if (!vouchers.length) {
    els.voucherList.innerHTML = `<p class="empty-text">这家店暂时没有可用优惠。</p>`;
    return;
  }
  els.voucherList.innerHTML = vouchers.map(voucher => {
    const pay = voucher.payValue ? `¥${formatMoney(voucher.payValue)}` : "到店优惠";
    const actual = voucher.actualValue ? `抵 ¥${formatMoney(voucher.actualValue)}` : "查看规则";
    const isSeckill = Number(voucher.type) === 1;
    const owned = state.wallet.has(String(voucher.id));
    const actionText = isSeckill ? "抢购" : (owned ? "已领取" : "领取");
    return `
      <article class="voucher-item">
        <div>
          <strong>${escapeHtml(voucher.title || "店铺优惠券")}</strong>
          <span>${escapeHtml(voucher.subTitle || voucher.rules || "到店前先看看优惠")}</span>
        </div>
        <button type="button" data-voucher-id="${voucher.id}" data-voucher-type="${voucher.type || 0}" ${owned && !isSeckill ? "disabled" : ""}>
          ${actionText}<small>${pay} · ${actual}</small>
        </button>
      </article>
    `;
  }).join("");
  els.voucherList.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => handleVoucherAction(button));
  });
}

async function handleVoucherAction(button) {
  if (!requireLogin()) return;
  const voucherId = button.dataset.voucherId;
  const isSeckill = Number(button.dataset.voucherType) === 1;
  button.disabled = true;
  const previous = button.firstChild.textContent;
  button.firstChild.textContent = isSeckill ? "抢购中" : "领取中";
  try {
    if (isSeckill) {
      const orderId = await request(`/voucher-order/seckill/${voucherId}`, { method: "POST" });
      showStatus(`抢购成功，订单号：${orderId}`);
    } else {
      state.wallet.add(String(voucherId));
      localStorage.setItem("hmdp_wallet", JSON.stringify([...state.wallet]));
      button.firstChild.textContent = "已领取";
      showStatus("优惠券已放入本地卡包，后续可接入正式券包表。");
    }
  } catch (error) {
    button.disabled = false;
    button.firstChild.textContent = previous;
    showStatus(isSeckill ? "抢购失败，请确认库存和登录状态。" : "领取失败，请稍后再试。");
  }
}

function formatMoney(value) {
  const number = Number(value || 0);
  return Number.isInteger(number / 100) ? String(number / 100) : (number / 100).toFixed(2);
}

function renderDrawerImages(note) {
  if (note.isVideo && note.videoUrl) {
    els.drawerMedia.innerHTML = `
      <video class="drawer-video" src="${normalizeMedia(note.videoUrl)}" poster="${normalizeImage(note.image)}" controls autoplay playsinline></video>
    `;
    els.drawerThumbs.innerHTML = "";
    return;
  }
  const images = (note.images.length ? note.images : [note.image]).slice(0, 9);
  const setActive = index => {
    els.drawerMedia.innerHTML = `<img src="${normalizeImage(images[index])}" alt="${escapeHtml(note.title)}">`;
    els.drawerThumbs.querySelectorAll("button").forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === index);
    });
  };
  els.drawerThumbs.innerHTML = images.map((src, index) => `
    <button type="button" class="${index === 0 ? "is-active" : ""}" data-index="${index}">
      <img src="${normalizeImage(src)}" alt="">
    </button>
  `).join("");
  els.drawerThumbs.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => setActive(Number(button.dataset.index)));
  });
  setActive(0);
}

function pauseFeedVideos() {
  document.querySelectorAll(".note-video-cover").forEach(video => {
    video.pause();
  });
}

function closeDrawer() {
  els.drawer.classList.remove("is-open");
  els.drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  state.replyTarget = null;
  els.commentInput.placeholder = "说点什么...";
}

// ------------------------------
// Like, collect, and follow interactions
// ------------------------------
async function likeNote(note) {
  if (!requireLogin()) return;
  try {
    await request(`/blog/like/${note.id}`, { method: "PUT" });
    trackEvent("like", { blogId: note.id, scene: "detail" });
    note.liked += note.isLike ? -1 : 1;
    note.isLike = !note.isLike;
    document.querySelector("#drawerLike").textContent = `♥ ${note.liked}`;
  } catch {
    showStatus("点赞失败，请稍后再试。");
  }
}

function toggleCollect(note) {
  if (!requireLogin()) return;
  const id = String(note.id);
  const next = !state.collected.has(id);
  request(`/blog-collect/${note.id}/${next}`, { method: "PUT" })
    .then(() => {
      if (next) state.collected.add(id);
      else state.collected.delete(id);
      trackEvent(next ? "collect" : "uncollect", { blogId: note.id, scene: "detail" });
      localStorage.setItem("hmdp_collected", JSON.stringify([...state.collected]));
      document.querySelector("#drawerCollect").textContent = next ? "★ 已收藏" : "☆ 收藏";
      document.querySelector("#statCollects").textContent = state.collected.size;
    })
    .catch(() => showStatus("收藏失败，请确认数据库已执行收藏表升级脚本。"));
}

async function loadCollectState(note) {
  if (!token()) return;
  try {
    const collected = await request(`/blog-collect/or/not/${note.id}`);
    const id = String(note.id);
    if (collected) state.collected.add(id);
    else state.collected.delete(id);
    localStorage.setItem("hmdp_collected", JSON.stringify([...state.collected]));
    document.querySelector("#drawerCollect").textContent = collected ? "★ 已收藏" : "☆ 收藏";
  } catch {
    // 收藏表未升级时保留本地状态，避免影响浏览主流程。
  }
}

async function toggleFollow(note) {
  if (!requireLogin()) return;
  const id = String(note.userId || "");
  const next = !state.followed.has(id);
  try {
    if (note.userId) await request(`/follow/${note.userId}/${next}`, { method: "PUT" });
    if (next) state.followed.add(id);
    else state.followed.delete(id);
    localStorage.setItem("hmdp_followed", JSON.stringify([...state.followed]));
    document.querySelector("#drawerFollow").textContent = next ? "已关注" : "关注";
  } catch {
    showStatus("关注失败，请稍后再试。");
  }
}

// ------------------------------
// Comments
// ------------------------------
async function loadComments(blogId) {
  els.commentList.innerHTML = `<p class="empty-text">正在加载评论...</p>`;
  try {
    const data = await request(`/blog-comments/of/blog?blogId=${blogId}`);
    const comments = Array.isArray(data) ? data : [];
    els.commentCount.textContent = comments.length;
    renderComments(comments);
  } catch {
    els.commentCount.textContent = "0";
    renderComments([]);
  }
}

function renderComments(comments) {
  if (!comments.length) {
    els.commentList.innerHTML = `<p class="empty-text">还没有评论，来抢第一条。</p>`;
    return;
  }
  els.commentList.innerHTML = comments.map(comment => `
    <article class="comment-item">
      <img src="${normalizeImage(comment.icon) || fallbackAvatar}" alt="">
      <div>
        <strong>${escapeHtml(comment.name || "探店用户")}</strong>
        <p>${escapeHtml(comment.content)}</p>
        <span>
          ${formatTime(comment.createTime)} ·
          <button class="comment-like" type="button" data-comment-id="${comment.id}">♡ ${comment.liked || 0}</button>
          · <button class="comment-reply" type="button" data-comment-id="${comment.id}" data-parent-id="${comment.id}" data-name="${escapeHtml(comment.name || "探店用户")}">回复</button>
        </span>
        ${renderReplies(comment.replies || [], comment.id)}
      </div>
    </article>
  `).join("");
  els.commentList.querySelectorAll(".comment-like").forEach(button => {
    button.addEventListener("click", () => likeComment(button.dataset.commentId));
  });
  els.commentList.querySelectorAll(".comment-reply").forEach(button => {
    button.addEventListener("click", () => startReply(button));
  });
}

function renderReplies(replies, rootId) {
  if (!replies.length) return "";
  return `
    <div class="reply-list">
      ${replies.map(reply => `
        <article class="reply-item">
          <strong>${escapeHtml(reply.name || "探店用户")}</strong>
          <p>${escapeHtml(reply.content)}</p>
          <span>
            ${formatTime(reply.createTime)} ·
            <button class="comment-like" type="button" data-comment-id="${reply.id}">♡ ${reply.liked || 0}</button>
            · <button class="comment-reply" type="button" data-comment-id="${reply.id}" data-parent-id="${rootId}" data-name="${escapeHtml(reply.name || "探店用户")}">回复</button>
          </span>
        </article>
      `).join("")}
    </div>
  `;
}

function startReply(button) {
  if (!requireLogin()) return;
  state.replyTarget = {
    parentId: Number(button.dataset.parentId),
    answerId: Number(button.dataset.commentId),
    name: button.dataset.name
  };
  els.commentInput.placeholder = `回复 ${state.replyTarget.name}`;
  els.commentInput.focus();
}

async function likeComment(commentId) {
  if (!requireLogin()) return;
  try {
    await request(`/blog-comments/like/${commentId}`, { method: "PUT" });
    loadComments(state.currentNote.id);
  } catch {
    showStatus("评论点赞失败，请稍后再试。");
  }
}

async function submitComment(event) {
  event.preventDefault();
  if (!state.currentNote || !requireLogin()) return;
  const content = els.commentInput.value.trim();
  if (!content) return;
  try {
    const payload = {
      blogId: state.currentNote.id,
      content,
      parentId: state.replyTarget?.parentId || 0,
      answerId: state.replyTarget?.answerId || 0
    };
    await request("/blog-comments", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    trackEvent("comment", { blogId: state.currentNote.id, scene: "detail" });
    state.replyTarget = null;
    els.commentInput.value = "";
    els.commentInput.placeholder = "说点什么...";
    loadComments(state.currentNote.id);
  } catch {
    showStatus("评论失败，请确认已登录。");
  }
}

// ------------------------------
// Feed reset and AI recommendation
// ------------------------------
function resetAndLoad(clearStatus = true) {
  state.page = 1;
  state.hasMore = true;
  state.notes = [];
  els.feed.innerHTML = "";
  if (clearStatus) hideStatus();
  loadNotes();
}

// ------------------------------
// Mall product, cart, and order workflow
// ------------------------------
function normalizeProduct(product, index = 0) {
  const images = String(product.images || "").split(",").map(item => item.trim()).filter(Boolean);
  return {
    ...product,
    image: normalizeImage(images[0]) || fallbackNotes[index % fallbackNotes.length].images,
    title: product.title || "精选商品",
    subTitle: product.subTitle || product.sub_title || "内容同款好物",
    price: Number(product.price || 0),
    originPrice: Number(product.originPrice || product.origin_price || 0),
    stock: Number(product.stock || 0),
    sold: Number(product.sold || 0),
    category: product.category || "all"
  };
}

function setMallActive(active) {
  document.querySelectorAll("#mallTab, #railMall, #mobileMall").forEach(item => {
    item.classList.toggle("is-active", active);
  });
  if (active) {
    document.querySelectorAll("[data-feed]").forEach(item => item.classList.remove("is-active"));
  }
}

function showContentArea() {
  els.contentArea.hidden = false;
  els.mallArea.hidden = true;
  setMallActive(false);
}

function switchMall() {
  state.mode = "mall";
  state.mallQuery = els.search.value.trim();
  els.contentArea.hidden = true;
  els.mallArea.hidden = false;
  setMallActive(true);
  hideStatus();
  loadProducts();
}

async function loadProducts() {
  els.productGrid.innerHTML = `<p class="empty-text mall-empty">正在加载商城商品...</p>`;
  const params = new URLSearchParams({ current: "1", category: state.mallCategory });
  if (state.mallQuery) params.set("query", state.mallQuery);
  try {
    const data = await request(`/mall/products?${params.toString()}`);
    const products = Array.isArray(data) ? data.map(normalizeProduct) : [];
    state.mallProducts = products;
    renderProducts(products);
  } catch {
    state.mallProducts = [];
    els.productGrid.innerHTML = `<p class="empty-text mall-empty">商城接口暂时不可用，请先执行商城数据库脚本并重启后端。</p>`;
  }
}

function renderProducts(products) {
  if (!products.length) {
    els.productGrid.innerHTML = `<p class="empty-text mall-empty">这个类目暂时没有商品。</p>`;
    return;
  }
  els.productGrid.innerHTML = products.map(product => `
    <article class="product-card">
      <button type="button" data-product-id="${product.id}">
        <div class="product-image-wrap">
          <img class="product-image" src="${normalizeImage(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy">
          <span>已售 ${product.sold}</span>
        </div>
        <div class="product-body">
          <h2>${escapeHtml(product.title)}</h2>
          <p>${escapeHtml(product.subTitle)}</p>
          <div class="product-row">
            <strong>¥${formatMoney(product.price)}</strong>
            ${product.originPrice ? `<small>¥${formatMoney(product.originPrice)}</small>` : ""}
          </div>
        </div>
      </button>
    </article>
  `).join("");
  els.productGrid.querySelectorAll("[data-product-id]").forEach(button => {
    button.addEventListener("click", () => openProduct(button.dataset.productId));
  });
}

async function openProduct(productId) {
  let product = state.mallProducts.find(item => String(item.id) === String(productId));
  try {
    product = normalizeProduct(await request(`/mall/products/${productId}`));
  } catch {
    // 列表数据足够支撑第一版详情预览；详情接口异常时继续使用当前卡片数据。
  }
  if (!product) return;
  state.currentProduct = product;
  state.selectedVoucherId = null;
  state.productVouchers = [];
  document.querySelector("#productDialogTitle").textContent = product.title;
  document.querySelector("#productDialogImage").src = normalizeImage(product.image);
  document.querySelector("#productDialogSub").textContent = product.subTitle;
  document.querySelector("#productDialogPrice").textContent = `¥${formatMoney(product.price)}`;
  document.querySelector("#productDialogStock").textContent = `库存 ${product.stock} · 已售 ${product.sold}`;
  renderMallVouchers([]);
  els.productDialog.showModal();
  loadMallVouchers(product.id);
}

async function loadMallVouchers(productId) {
  try {
    const vouchers = await request(`/voucher/mall/product/${productId}`);
    state.productVouchers = Array.isArray(vouchers) ? vouchers : [];
  } catch {
    state.productVouchers = [];
  }
  renderMallVouchers(state.productVouchers);
}

function renderMallVouchers(vouchers) {
  if (!els.mallVoucherList) return;
  if (!vouchers.length) {
    els.mallVoucherList.innerHTML = `<p class="empty-text">暂无可用商城券。</p>`;
    return;
  }
  els.mallVoucherList.innerHTML = vouchers.map(voucher => `
    <article class="voucher-item mall-voucher-item">
      <div>
        <strong>${escapeHtml(voucher.title || "商城优惠券")}</strong>
        <span>${escapeHtml(voucher.subTitle || voucher.rules || "下单时自动抵扣")}</span>
      </div>
      <button type="button" data-mall-voucher="${voucher.id}">
        ${state.selectedVoucherId === String(voucher.id) ? "已选择" : "选择"}
        <small>满 ¥${formatMoney(voucher.payValue)} 减 ¥${formatMoney(voucher.actualValue)}</small>
      </button>
    </article>
  `).join("");
  els.mallVoucherList.querySelectorAll("[data-mall-voucher]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedVoucherId = state.selectedVoucherId === button.dataset.mallVoucher ? null : button.dataset.mallVoucher;
      renderMallVouchers(state.productVouchers);
    });
  });
}

async function addCurrentProductToCart() {
  if (!state.currentProduct || !requireLogin()) return;
  await addToCart(state.currentProduct.id, 1);
}

async function addToCart(productId, quantity = 1) {
  try {
    await request("/mall/cart", {
      method: "POST",
      body: JSON.stringify({ productId: Number(productId), quantity })
    });
    showStatus("已加入购物车，可以继续逛或去购物车下单。");
  } catch (error) {
    showStatus(error.message || "加入购物车失败，请检查登录状态和库存。");
  }
}

async function buyCurrentProductNow() {
  if (!state.currentProduct || !requireLogin()) return;
  try {
    const order = await createMallOrder({
      productId: state.currentProduct.id,
      quantity: 1,
      voucherId: state.selectedVoucherId ? Number(state.selectedVoucherId) : null
    });
    els.productDialog.close();
    showStatus(`下单成功，订单号：${order.id}`);
  } catch (error) {
    showStatus(error.message || "下单失败，请稍后再试。");
  }
}

async function createMallOrder(payload) {
  return request("/mall/orders", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function openCartDialog() {
  if (!requireLogin()) return;
  document.querySelector("#cartDialogTitle").textContent = "购物车";
  els.cartList.innerHTML = `<p class="empty-text">正在加载购物车...</p>`;
  els.cartDialog.showModal();
  try {
    const items = await request("/mall/cart");
    renderCartItems(Array.isArray(items) ? items : []);
  } catch {
    els.cartList.innerHTML = `<p class="empty-text">购物车加载失败，请确认已经登录。</p>`;
  }
}

function renderCartItems(items) {
  if (!items.length) {
    els.cartList.innerHTML = `<p class="empty-text">购物车还是空的，先去商城挑一件。</p>`;
    return;
  }
  els.cartList.innerHTML = items.map(item => `
    <article class="cart-item">
      <img src="${normalizeImage(item.image)}" alt="${escapeHtml(item.title)}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>¥${formatMoney(item.price)} × ${item.quantity}</span>
        <small>小计 ¥${formatMoney(item.totalAmount)}</small>
      </div>
      <div class="cart-actions">
        <button class="publish-button" type="button" data-cart-order="${item.id}">下单</button>
        <button class="ghost-button" type="button" data-cart-remove="${item.id}">删除</button>
      </div>
    </article>
  `).join("");
  els.cartList.querySelectorAll("[data-cart-order]").forEach(button => {
    button.addEventListener("click", () => orderFromCart(button.dataset.cartOrder));
  });
  els.cartList.querySelectorAll("[data-cart-remove]").forEach(button => {
    button.addEventListener("click", () => removeCartItem(button.dataset.cartRemove));
  });
}

async function orderFromCart(cartItemId) {
  try {
    const order = await createMallOrder({ cartItemId: Number(cartItemId) });
    showStatus(`下单成功，订单号：${order.id}`);
    openCartDialog();
  } catch (error) {
    showStatus(error.message || "购物车下单失败，请检查库存。");
  }
}

async function removeCartItem(cartItemId) {
  try {
    await request(`/mall/cart/${cartItemId}`, { method: "DELETE" });
    openCartDialog();
  } catch {
    showStatus("删除购物车商品失败，请稍后再试。");
  }
}

async function openOrdersDialog() {
  if (!requireLogin()) return;
  document.querySelector("#cartDialogTitle").textContent = "我的订单";
  els.cartList.innerHTML = `<p class="empty-text">正在加载订单...</p>`;
  els.cartDialog.showModal();
  try {
    const orders = await request("/mall/orders");
    renderOrders(Array.isArray(orders) ? orders : []);
  } catch {
    els.cartList.innerHTML = `<p class="empty-text">订单加载失败，请确认已经登录。</p>`;
  }
}

function renderOrders(orders) {
  if (!orders.length) {
    els.cartList.innerHTML = `<p class="empty-text">还没有商城订单。</p>`;
    return;
  }
  els.cartList.innerHTML = orders.map(order => `
    <article class="cart-item order-item">
      <img src="${normalizeImage(order.productImage)}" alt="${escapeHtml(order.productTitle)}">
      <div>
        <strong>${escapeHtml(order.productTitle)}</strong>
        <span>订单号 ${order.id}</span>
        <small>¥${formatMoney(order.totalAmount)} · 优惠 ¥${formatMoney(order.discountAmount)} · ${mallOrderStatus(order.status)}</small>
      </div>
    </article>
  `).join("");
}

function mallOrderStatus(status) {
  return {
    1: "待支付",
    2: "已支付",
    3: "已发货",
    4: "已完成",
    5: "已取消"
  }[Number(status)] || "处理中";
}

async function payMallOrder(orderId) {
  return request(`/mall/orders/${orderId}/pay`, { method: "POST" });
}

async function buyCurrentProductNow() {
  if (!state.currentProduct || !requireLogin()) return;
  try {
    const order = await createMallOrder({ productId: state.currentProduct.id, quantity: 1 });
    els.productDialog.close();
    await payMallOrder(order.id);
    showStatus(`付款成功，实付 ¥${formatMoney(order.totalAmount)}，订单号：${order.id}`);
    loadProducts();
  } catch (error) {
    showStatus(error.message || "下单失败，请稍后再试。");
  }
}

async function orderFromCart(cartItemId) {
  try {
    const order = await createMallOrder({ cartItemId: Number(cartItemId) });
    showStatus(`下单成功，订单号：${order.id}，可在我的订单里付款。`);
    openCartDialog();
  } catch (error) {
    showStatus(error.message || "购物车下单失败，请检查库存。");
  }
}

function renderOrders(orders) {
  if (!orders.length) {
    els.cartList.innerHTML = `<p class="empty-text">还没有商城订单。</p>`;
    return;
  }
  els.cartList.innerHTML = orders.map(order => `
    <article class="cart-item order-item">
      <img src="${normalizeImage(order.productImage)}" alt="${escapeHtml(order.productTitle)}">
      <div>
        <strong>${escapeHtml(order.productTitle)}</strong>
        <span>订单号 ${order.id}</span>
        <small>¥${formatMoney(order.totalAmount)} · ${mallOrderStatus(order.status)}</small>
      </div>
      ${Number(order.status) === 1 ? `
        <div class="cart-actions">
          <button class="publish-button" type="button" data-order-pay="${order.id}">去支付</button>
        </div>
      ` : ""}
    </article>
  `).join("");
  els.cartList.querySelectorAll("[data-order-pay]").forEach(button => {
    button.addEventListener("click", () => payOrderFromList(button.dataset.orderPay));
  });
}

async function payOrderFromList(orderId) {
  try {
    await payMallOrder(orderId);
    showStatus(`付款成功，订单号：${orderId}`);
    openOrdersDialog();
  } catch (error) {
    showStatus(error.message || "支付失败，请稍后再试。");
  }
}

async function openMerchantCenter() {
  if (!requireLogin()) return;
  els.merchantPanel.innerHTML = `<p class="empty-text">正在加载商家中心...</p>`;
  els.merchantDialog.showModal();
  await loadMerchantCenter();
}

async function loadMerchantCenter() {
  try {
    state.merchant = await request("/merchant/mine");
  } catch {
    state.merchant = null;
  }
  if (!state.merchant) {
    renderMerchantApply();
    return;
  }
  await Promise.all([loadMerchantProducts(), loadMerchantOrders()]);
  renderMerchantDashboard();
}

function renderMerchantApply() {
  els.merchantPanel.innerHTML = `
    <form class="merchant-form" id="merchantApplyForm">
      <p class="merchant-tip">开通后可以发布商品、管理库存，并处理商城订单。</p>
      <label>店铺名称<input name="name" required maxlength="80" placeholder="比如：探店优选旗舰店"></label>
      <label>店铺头像<input name="avatar" placeholder="图片 URL，可先留空"></label>
      <label>客服电话<input name="phone" placeholder="比如：400-100-1204"></label>
      <label>发货地址<input name="address" placeholder="比如：杭州内容电商产业园"></label>
      <label>店铺简介<textarea name="description" rows="3" placeholder="介绍你的商品定位和服务"></textarea></label>
      <button class="publish-button" type="submit">开通商家中心</button>
    </form>
  `;
  document.querySelector("#merchantApplyForm").addEventListener("submit", submitMerchantApply);
}

async function submitMerchantApply(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  try {
    await request("/merchant/apply", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showStatus("商家中心已开通。");
    await loadMerchantCenter();
  } catch (error) {
    showStatus(error.message || "开通商家中心失败。");
  }
}

async function loadMerchantProducts() {
  try {
    state.merchantProducts = await request("/merchant/products");
  } catch {
    state.merchantProducts = [];
  }
}

async function loadMerchantOrders() {
  try {
    state.merchantOrders = await request("/merchant/orders");
  } catch {
    state.merchantOrders = [];
  }
}

function renderMerchantDashboard() {
  const paidOrders = state.merchantOrders.filter(order => Number(order.status) >= 2);
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  els.merchantPanel.innerHTML = `
    <div class="merchant-summary">
      <div>
        <strong>${escapeHtml(state.merchant.name)}</strong>
        <span>${escapeHtml(state.merchant.description || "内容电商商家")}</span>
      </div>
      <div class="merchant-kpis">
        <span><strong>${state.merchantProducts.length}</strong>商品</span>
        <span><strong>${state.merchantOrders.length}</strong>订单</span>
        <span><strong>¥${formatMoney(revenue)}</strong>成交</span>
      </div>
    </div>
    <form class="merchant-form merchant-product-form" id="merchantProductForm">
      <label>商品标题<input name="title" required maxlength="128" placeholder="比如：城市露营咖啡礼盒"></label>
      <label>副标题<input name="subTitle" maxlength="255" placeholder="卖点、规格、适合场景"></label>
      <label>图片地址<input name="images" placeholder="商品图 URL，多个用英文逗号分隔"></label>
      <div class="merchant-form-grid">
        <label>价格(元)<input name="priceYuan" type="number" min="0.01" step="0.01" required></label>
        <label>原价(元)<input name="originPriceYuan" type="number" min="0" step="0.01"></label>
        <label>库存<input name="stock" type="number" min="0" required></label>
        <label>类目
          <select name="category">
            <option value="food">美食套餐</option>
            <option value="coffee">咖啡</option>
            <option value="gear">装备</option>
            <option value="all">其他</option>
          </select>
        </label>
      </div>
      <button class="publish-button" type="submit">发布商品</button>
    </form>
    <form class="merchant-form merchant-voucher-form" id="merchantVoucherForm">
      <div class="merchant-section-head">
        <h3>创建优惠券</h3>
      </div>
      <label>优惠券标题<input name="title" required maxlength="80" placeholder="比如：满50减10"></label>
      <label>副标题<input name="subTitle" maxlength="120" placeholder="比如：商城全店可用"></label>
      <div class="merchant-form-grid">
        <label>使用门槛(元)<input name="payValueYuan" type="number" min="0" step="0.01" value="50"></label>
        <label>优惠金额(元)<input name="actualValueYuan" type="number" min="0.01" step="0.01" value="10" required></label>
        <label>绑定商品
          <select name="productId">
            <option value="">全店可用</option>
            ${state.merchantProducts.map(product => `<option value="${product.id}">${escapeHtml(product.title)}</option>`).join("")}
          </select>
        </label>
        <label>规则<input name="rules" placeholder="不与其他券叠加"></label>
      </div>
      <button class="ghost-button" type="submit">创建优惠券</button>
    </form>
    <div class="merchant-section">
      <h3>我的商品</h3>
      <div class="merchant-list">${renderMerchantProducts()}</div>
    </div>
    <div class="merchant-section">
      <h3>商家订单</h3>
      <div class="merchant-list">${renderMerchantOrders()}</div>
    </div>
  `;
  document.querySelector("#merchantProductForm").addEventListener("submit", submitMerchantProduct);
  document.querySelector("#merchantVoucherForm").addEventListener("submit", submitMerchantVoucher);
  els.merchantPanel.querySelectorAll("[data-product-toggle]").forEach(button => {
    button.addEventListener("click", () => toggleMerchantProduct(button.dataset.productToggle, button.dataset.nextStatus));
  });
  els.merchantPanel.querySelectorAll("[data-order-ship]").forEach(button => {
    button.addEventListener("click", () => shipMerchantOrder(button.dataset.orderShip));
  });
}

function renderMerchantProducts() {
  if (!state.merchantProducts.length) {
    return `<p class="empty-text">还没有发布商品。</p>`;
  }
  return state.merchantProducts.map(product => `
    <article class="merchant-row">
      <img src="${normalizeImage(String(product.images || "").split(",")[0])}" alt="${escapeHtml(product.title)}">
      <div>
        <strong>${escapeHtml(product.title)}</strong>
        <span>¥${formatMoney(product.price)} · 库存 ${product.stock} · 已售 ${product.sold || 0}</span>
        <small>${Number(product.status) === 1 ? "上架中" : "已下架"}</small>
      </div>
      <button class="ghost-button" type="button" data-product-toggle="${product.id}" data-next-status="${Number(product.status) === 1 ? 0 : 1}">
        ${Number(product.status) === 1 ? "下架" : "上架"}
      </button>
    </article>
  `).join("");
}

function renderMerchantOrders() {
  if (!state.merchantOrders.length) {
    return `<p class="empty-text">还没有订单。</p>`;
  }
  return state.merchantOrders.map(order => `
    <article class="merchant-row">
      <img src="${normalizeImage(order.productImage)}" alt="${escapeHtml(order.productTitle)}">
      <div>
        <strong>${escapeHtml(order.productTitle)}</strong>
        <span>¥${formatMoney(order.totalAmount)} · ${mallOrderStatus(order.status)}</span>
        <small>订单号 ${order.id}</small>
      </div>
      ${Number(order.status) === 2 ? `<button class="publish-button" type="button" data-order-ship="${order.id}">发货</button>` : ""}
    </article>
  `).join("");
}

async function submitMerchantProduct(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    title: String(form.get("title") || "").trim(),
    subTitle: String(form.get("subTitle") || "").trim(),
    images: String(form.get("images") || "").trim(),
    price: Math.round(Number(form.get("priceYuan") || 0) * 100),
    originPrice: Math.round(Number(form.get("originPriceYuan") || 0) * 100) || null,
    stock: Number(form.get("stock") || 0),
    category: form.get("category"),
    status: 1
  };
  try {
    await request("/merchant/products", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showStatus("商品已发布。");
    await loadMerchantCenter();
    loadProducts();
  } catch (error) {
    showStatus(error.message || "商品发布失败。");
  }
}

async function submitMerchantVoucher(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const productId = String(form.get("productId") || "").trim();
  const payload = {
    productId: productId ? Number(productId) : null,
    title: String(form.get("title") || "").trim(),
    subTitle: String(form.get("subTitle") || "").trim(),
    rules: String(form.get("rules") || "").trim() || "商城订单可用，不与其他券叠加",
    payValue: Math.round(Number(form.get("payValueYuan") || 0) * 100),
    actualValue: Math.round(Number(form.get("actualValueYuan") || 0) * 100)
  };
  try {
    await request("/merchant/vouchers", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showStatus("商城优惠券已创建。");
    event.currentTarget.reset();
  } catch (error) {
    showStatus(error.message || "优惠券创建失败。");
  }
}

async function toggleMerchantProduct(productId, nextStatus) {
  try {
    await request(`/merchant/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ status: Number(nextStatus) })
    });
    showStatus(Number(nextStatus) === 1 ? "商品已上架。" : "商品已下架。");
    await loadMerchantCenter();
    loadProducts();
  } catch (error) {
    showStatus(error.message || "商品状态更新失败。");
  }
}

async function shipMerchantOrder(orderId) {
  try {
    await request(`/merchant/orders/${orderId}/ship`, { method: "POST" });
    showStatus(`订单 ${orderId} 已发货。`);
    await loadMerchantCenter();
  } catch (error) {
    showStatus(error.message || "发货失败。");
  }
}

async function loadSmartRecommendation(question) {
  if (!question) {
    els.smartCard.hidden = true;
    return;
  }
  els.smartCard.hidden = false;
  els.smartText.textContent = "正在结合店铺、优惠券和笔记内容生成推荐...";
  try {
    const data = await request("/content/ai/recommend", {
      method: "POST",
      body: JSON.stringify({
        sessionId: state.aiSessionId,
        query: question
      })
    });
    els.smartText.textContent = data.answer || data.content || "暂时没有生成有效推荐。";
  } catch {
    els.smartText.textContent = `先看看「${question}」相关笔记。智能推荐暂时不可用，但不影响正常浏览。`;
  }
}

async function analyzeCurrentNote(note) {
  els.noteSmart.hidden = false;
  els.noteSmartText.textContent = "正在总结这篇笔记的适合人群、亮点和注意事项...";
  try {
    const data = await request("/content/ai/note-summary", {
      method: "POST",
      body: JSON.stringify({
        sessionId: state.aiSessionId,
        noteId: note.id,
        title: note.title,
        content: note.content
      })
    });
    els.noteSmartText.textContent = data.answer || data.content || "暂时没有生成有效总结。";
  } catch {
    els.noteSmartText.textContent = "智能看点暂时不可用，正文内容仍可正常查看。";
  }
}

function switchFeed(feed) {
  showContentArea();
  state.mode = "feed";
  state.feed = feed;
  document.querySelectorAll("[data-feed]").forEach(item => {
    item.classList.toggle("is-active", item.dataset.feed === feed);
  });
  resetAndLoad();
}

function switchPersonalMode(mode) {
  if (!requireLogin()) return;
  showContentArea();
  state.mode = mode;
  state.query = "";
  els.search.value = "";
  document.querySelectorAll("[data-feed]").forEach(item => item.classList.remove("is-active"));
  resetAndLoad();
}

function showWallet() {
  if (!requireLogin()) return;
  const vouchers = [...state.wallet];
  showStatus(vouchers.length
    ? `我的券包：${vouchers.map(id => `券 #${id}`).join("、")}`
    : "券包还是空的，去笔记详情里的店铺卡片领取一张试试。");
}

// ------------------------------
// Publish workflow with image upload
// ------------------------------
async function uploadSelectedImages() {
  const files = [...els.imageFiles.files];
  const uploaded = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    const name = await request("/upload/blog", { method: "POST", body: formData });
    uploaded.push(`/imgs${name}`);
  }
  return uploaded;
}

async function uploadSelectedVideo() {
  const file = els.videoFile?.files?.[0];
  if (!file) return "";
  const formData = new FormData();
  formData.append("file", file);
  const name = await request("/upload/video", { method: "POST", body: formData });
  return `/imgs${name}`;
}

async function submitComposer(event) {
  event.preventDefault();
  if (!requireLogin()) return;
  const submitButton = els.composerForm.querySelector(".publish-button");
  submitButton.disabled = true;
  submitButton.textContent = "发布中";
  const form = new FormData(els.composerForm);
  try {
    const uploaded = await uploadSelectedImages();
    const uploadedVideo = await uploadSelectedVideo();
    const manualImages = String(form.get("images") || "").trim();
    const videoUrl = uploadedVideo || String(form.get("videoUrl") || "").trim();
    const content = String(form.get("content") || "").trim();
    if (!uploaded.length && !manualImages && !videoUrl) {
      showStatus("发布笔记至少需要一张图片。");
      return;
    }
    if (content.length < 12) {
      showStatus("正文再多写一点，会更像一篇有价值的探店笔记。");
      return;
    }
    const payload = {
      title: form.get("title"),
      images: uploaded.length ? uploaded.join(",") : manualImages,
      videoUrl,
      shopId: form.get("shopId") ? Number(form.get("shopId")) : null,
      content: mergeTopics(content, form.get("topics"))
    };
    await request("/blog", { method: "POST", body: JSON.stringify(payload) });
    els.composer.close();
    els.composerForm.reset();
    els.uploadPreview.innerHTML = "";
    els.videoPreview.innerHTML = "";
    resetAndLoad();
  } catch {
    showStatus("发布失败，请确认已登录，且图片、店铺信息有效。");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "发布";
  }
}

function mergeTopics(content, topics) {
  const body = String(content || "").trim();
  const topicText = String(topics || "").trim();
  return topicText ? `${body}\n\n${topicText}` : body;
}

// ------------------------------
// Login workflow
// ------------------------------
async function sendCode() {
  const phone = els.loginForm.elements.phone.value.trim();
  if (!phone) return;
  try {
    await request(`/user/code?phone=${encodeURIComponent(phone)}`, { method: "POST" });
    showStatus("验证码已生成，请查看后端日志。");
  } catch {
    showStatus("验证码发送失败，请检查手机号格式。");
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const payload = {
    phone: els.loginForm.elements.phone.value.trim(),
    code: els.loginForm.elements.code.value.trim()
  };
  try {
    const loginToken = await request("/user/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    localStorage.setItem("hmdp_token", loginToken);
    els.loginDialog.close();
    await initUser();
    resetAndLoad();
  } catch {
    showStatus("登录失败，请确认验证码正确。");
  }
}

// ------------------------------
// Search suggestions and trend ranking
// ------------------------------
function renderSuggestions(value = "") {
  const q = value.trim();
  const source = state.trends.length ? state.trends.map(item => item.keyword) : fallbackSuggestions;
  const list = source.filter(item => !q || item.includes(q)).slice(0, 6);
  els.suggestPopover.innerHTML = list.map(item => `<button type="button" data-suggestion="${item}">${item}</button>`).join("");
  els.suggestPopover.classList.toggle("is-open", list.length > 0 && document.activeElement === els.search);
  els.suggestPopover.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      state.query = button.dataset.suggestion;
      els.search.value = state.query;
      els.suggestPopover.classList.remove("is-open");
      resetAndLoad();
      loadSmartRecommendation(state.query);
    });
  });
}

async function loadTrends() {
  try {
    const data = await request("/content/trends");
    state.trends = Array.isArray(data) && data.length
      ? data
      : fallbackSuggestions.map((keyword, index) => ({ keyword, heat: 80 - index * 5 }));
  } catch {
    state.trends = fallbackSuggestions.map((keyword, index) => ({ keyword, heat: 80 - index * 5 }));
  }
  renderTrends();
}

function renderTrends() {
  if (!els.trendList) return;
  els.trendList.innerHTML = state.trends.slice(0, 6).map((item, index) => `
    <button type="button" data-trend="${escapeHtml(item.keyword)}">
      <strong>${index + 1}</strong>
      <span>${escapeHtml(item.keyword)}</span>
      <small>${item.heat || ""}</small>
    </button>
  `).join("");
  els.trendList.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      state.mode = "feed";
      state.query = button.dataset.trend;
      els.search.value = state.query;
      trackEvent("search", { scene: "trend", keyword: state.query });
      resetAndLoad();
      loadSmartRecommendation(state.query);
    });
  });
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

// ------------------------------
// Event binding
// ------------------------------
els.searchForm.addEventListener("submit", event => {
  event.preventDefault();
  if (state.mode === "mall") {
    state.mallQuery = els.search.value.trim();
    els.suggestPopover.classList.remove("is-open");
    trackEvent("search", { scene: "mall", keyword: state.mallQuery });
    loadProducts();
    return;
  }
  showContentArea();
  state.mode = "feed";
  state.query = els.search.value.trim();
  els.suggestPopover.classList.remove("is-open");
  trackEvent("search", { scene: "search", keyword: state.query });
  resetAndLoad();
  loadSmartRecommendation(state.query);
});

let searchTimer;
els.search.addEventListener("focus", () => renderSuggestions(els.search.value));
els.search.addEventListener("input", () => {
  renderSuggestions(els.search.value);
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (state.mode === "mall") {
      state.mallQuery = els.search.value.trim();
      loadProducts();
      return;
    }
    state.mode = "feed";
    state.query = els.search.value.trim();
    resetAndLoad();
  }, 280);
});

els.imageFiles.addEventListener("change", () => {
  els.uploadPreview.innerHTML = [...els.imageFiles.files].map(file => {
    const url = URL.createObjectURL(file);
    return `<img src="${url}" alt="">`;
  }).join("");
});

els.videoFile.addEventListener("change", () => {
  const file = els.videoFile.files[0];
  if (!file) {
    els.videoPreview.innerHTML = "";
    return;
  }
  const url = URL.createObjectURL(file);
  els.videoPreview.innerHTML = `<video src="${url}" controls muted playsinline></video>`;
});

document.querySelectorAll("[data-feed]").forEach(button => {
  button.addEventListener("click", () => switchFeed(button.dataset.feed));
});

document.querySelectorAll("[data-smart-query]").forEach(button => {
  button.addEventListener("click", () => {
    showContentArea();
    state.mode = "feed";
    state.query = button.dataset.smartQuery;
    els.search.value = state.query;
    resetAndLoad();
    loadSmartRecommendation(state.query);
  });
});

document.querySelector("#refreshSmart").addEventListener("click", () => {
  loadSmartRecommendation(state.query || "推荐几个适合今天去的店");
});

document.querySelectorAll("[data-close-drawer]").forEach(item => item.addEventListener("click", closeDrawer));
document.querySelector("#openComposer").addEventListener("click", () => requireLogin() && els.composer.showModal());
document.querySelector("#railPublish").addEventListener("click", () => requireLogin() && els.composer.showModal());
document.querySelector("#mobilePublish").addEventListener("click", () => requireLogin() && els.composer.showModal());
document.querySelector("#closeShopDialog").addEventListener("click", () => els.shopDialog.close());
document.querySelector("#mallTab").addEventListener("click", switchMall);
document.querySelector("#railMall").addEventListener("click", switchMall);
document.querySelector("#mobileMall").addEventListener("click", switchMall);
document.querySelector("#openCart").addEventListener("click", openCartDialog);
document.querySelector("#openOrders").addEventListener("click", openOrdersDialog);
document.querySelector("#openMerchantCenter").addEventListener("click", openMerchantCenter);
document.querySelector("#closeProductDialog").addEventListener("click", () => els.productDialog.close());
document.querySelector("#closeCartDialog").addEventListener("click", () => els.cartDialog.close());
document.querySelector("#closeMerchantDialog").addEventListener("click", () => els.merchantDialog.close());
document.querySelector("#addProductCart").addEventListener("click", addCurrentProductToCart);
document.querySelector("#buyProductNow").addEventListener("click", buyCurrentProductNow);
document.querySelectorAll("[data-mall-category]").forEach(button => {
  button.addEventListener("click", () => {
    state.mallCategory = button.dataset.mallCategory;
    document.querySelectorAll("[data-mall-category]").forEach(item => {
      item.classList.toggle("is-active", item === button);
    });
    loadProducts();
  });
});
document.querySelector("#loginButton").addEventListener("click", () => els.loginDialog.showModal());
document.querySelector("#profileLogin").addEventListener("click", () => {
  if (token()) {
    localStorage.removeItem("hmdp_token");
    state.currentUser = null;
    state.mode = "feed";
    renderUser(null);
    resetAndLoad();
  } else {
    els.loginDialog.showModal();
  }
});
document.querySelector("#showMyNotes").addEventListener("click", () => switchPersonalMode("mine"));
document.querySelector("#showMyCollections").addEventListener("click", () => switchPersonalMode("collections"));
document.querySelector("#showDiscover").addEventListener("click", () => switchFeed("hot"));
document.querySelector("#showWallet").addEventListener("click", showWallet);
document.querySelector("#refreshTrends").addEventListener("click", loadTrends);
document.querySelector("#sendCodeButton").addEventListener("click", sendCode);
els.composerForm.addEventListener("submit", submitComposer);
els.loginForm.addEventListener("submit", submitLogin);
els.commentForm.addEventListener("submit", submitComment);

window.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (state.replyTarget) {
      state.replyTarget = null;
      els.commentInput.placeholder = "说点什么...";
      return;
    }
    closeDrawer();
  }
});

window.addEventListener("scroll", () => {
  if (state.mode === "mall") return;
  const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 620;
  if (nearBottom) loadNotes();
}, { passive: true });

initUser();
loadCategories();
loadTrends();
loadNotes();
