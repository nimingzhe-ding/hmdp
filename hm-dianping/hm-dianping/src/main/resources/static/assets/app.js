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
  searchTab: "notes",
  searchResults: { notes: [], videos: [], products: [], shops: [], topics: [] },
  mallProducts: [],
  videoNotes: [],
  videoObserver: null,
  danmakuStore: {},
  danmakuEnabled: JSON.parse(localStorage.getItem("hmdp_danmaku_enabled") || "true"),
  danmakuSpeed: Number(localStorage.getItem("hmdp_danmaku_speed") || 8.5),
  merchant: null,
  merchantProducts: [],
  merchantOrders: [],
  productVouchers: [],
  selectedVoucherId: null,
  currentProduct: null,
  currentNote: null,
  currentProfile: null,
  profileTab: "works",
  currentUser: null,
  replyTarget: null,
  commentSort: "hot",
  editingNoteId: null,
  trends: [],
  wallet: new Set(JSON.parse(localStorage.getItem("hmdp_wallet") || "[]")),
  collected: new Set(JSON.parse(localStorage.getItem("hmdp_collected") || "[]")),
  followed: new Set(JSON.parse(localStorage.getItem("hmdp_followed") || "[]")),
  aiSessionId: localStorage.getItem("hmdp_ai_session") || crypto.randomUUID(),
  notificationFilter: "all"
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
  unifiedSearch: document.querySelector("#unifiedSearch"),
  unifiedSearchTitle: document.querySelector("#unifiedSearchTitle"),
  unifiedSearchSummary: document.querySelector("#unifiedSearchSummary"),
  unifiedSearchTabs: document.querySelector("#unifiedSearchTabs"),
  unifiedSearchResults: document.querySelector("#unifiedSearchResults"),
  profileHome: document.querySelector("#profileHome"),
  profileHomeResults: document.querySelector("#profileHomeResults"),
  profileHomeTabs: document.querySelector("#profileHomeTabs"),
  profileEditDialog: document.querySelector("#profileEditDialog"),
  profileEditForm: document.querySelector("#profileEditForm"),
  contentArea: document.querySelector(".content-area"),
  mallArea: document.querySelector("#mallArea"),
  videoArea: document.querySelector("#videoArea"),
  videoFeed: document.querySelector("#videoFeed"),
  productGrid: document.querySelector("#productGrid"),
  drawer: document.querySelector("#detailDrawer"),
  drawerMedia: document.querySelector("#drawerMedia"),
  drawerThumbs: document.querySelector("#drawerThumbs"),
  drawerAuthorGrowth: document.querySelector("#drawerAuthorGrowth"),
  noteProductBridge: document.querySelector("#noteProductBridge"),
  noteProductList: document.querySelector("#noteProductList"),
  noteProductCount: document.querySelector("#noteProductCount"),
  noteRelated: document.querySelector("#noteRelated"),
  noteRelatedList: document.querySelector("#noteRelatedList"),
  composer: document.querySelector("#composerDialog"),
  composerTitle: document.querySelector("#composerDialog h2"),
  composerDraftBar: document.querySelector("#composerDraftBar"),
  composerDraftText: document.querySelector("#composerDraftText"),
  clearComposerDraft: document.querySelector("#clearComposerDraft"),
  shopDialog: document.querySelector("#shopDialog"),
  productDialog: document.querySelector("#productDialog"),
  cartDialog: document.querySelector("#cartDialog"),
  notificationDialog: document.querySelector("#notificationDialog"),
  notificationList: document.querySelector("#notificationList"),
  notificationBadge: document.querySelector("#notificationBadge"),
  merchantDialog: document.querySelector("#merchantDialog"),
  voucherList: document.querySelector("#voucherList"),
  mallVoucherList: document.querySelector("#mallVoucherList"),
  cartList: document.querySelector("#cartList"),
  merchantPanel: document.querySelector("#merchantPanel"),
  composerForm: document.querySelector("#composerForm"),
  contentTypeInputs: document.querySelectorAll("input[name='contentType']"),
  contentFields: document.querySelectorAll("[data-content-field]"),
  videoUploadTip: document.querySelector("[data-video-upload-tip]"),
  imageFiles: document.querySelector("#imageFiles"),
  videoFile: document.querySelector("#videoFile"),
  uploadPreview: document.querySelector("#uploadPreview"),
  videoPreview: document.querySelector("#videoPreview"),
  loginDialog: document.querySelector("#loginDialog"),
  loginForm: document.querySelector("#loginForm"),
  noteSmart: document.querySelector("#noteSmart"),
  noteSmartText: document.querySelector("#noteSmartText"),
  shopBridge: document.querySelector("#shopBridge"),
  commentForm: document.querySelector("#commentForm"),
  commentInput: document.querySelector("#commentInput"),
  commentList: document.querySelector("#commentList"),
  commentCount: document.querySelector("#commentCount"),
  toastContainer: document.querySelector("#toastContainer")
};

// ------------------------------
// Toast 通知
// ------------------------------
function showToast(message, type = "info", duration = 2500) {
  const container = els.toastContainer;
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// ------------------------------
// 骨架屏
// ------------------------------
function renderSkeletons(count = 8) {
  let html = "";
  for (let i = 0; i < count; i++) {
    const ratio = [0.8, 1.0, 1.2, 1.4][i % 4];
    html += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-cover" style="aspect-ratio: 3 / ${3 * ratio}"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton-meta">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton skeleton-name"></div>
        </div>
      </div>`;
  }
  els.feed.innerHTML = html;
}

function clearSkeletons() {
  els.feed.querySelectorAll(".skeleton-card").forEach(el => el.remove());
}

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
  if (options.raw) return result;
  return result.data;
}

function normalizeNote(note, index = 0) {
  const images = String(note.images || "").split(",").map(item => item.trim()).filter(Boolean);
  const image = images[0] || fallbackNotes[index % fallbackNotes.length].images;
  const parsedContent = parseVideoContent(note.content || "");
  const videoUrl = normalizeMedia(note.videoUrl || note.video || parsedContent.videoUrl);
  const contentType = normalizeContentType(note.contentType, videoUrl);
  return {
    ...note,
    image,
    images,
    contentType,
    name: note.name || `探店用户 ${note.userId || ""}`.trim(),
    icon: normalizeImage(note.icon) || fallbackNotes[index % fallbackNotes.length].icon,
    liked: note.liked || 0,
    comments: note.comments || 0,
    content: parsedContent.content,
    videoUrl,
    isVideo: ["VIDEO", "LIVE"].includes(contentType) && Boolean(videoUrl),
    products: Array.isArray(note.products) ? note.products.map(normalizeProduct) : [],
    creatorGrowth: note.creatorGrowth || null,
    relatedNotes: Array.isArray(note.relatedNotes) ? note.relatedNotes.map(item => normalizeNote(item)) : [],
    isOwner: Boolean(note.isOwner || (state.currentUser?.id && Number(note.userId) === Number(state.currentUser.id))),
    tags: note.tags || "",
    ratio: [0.78, 1, 1.14, 1.28, 0.92][index % 5]
  };
}

function normalizeContentType(contentType, videoUrl) {
  const normalized = String(contentType || "").trim().toUpperCase();
  const supported = ["IMAGE", "VIDEO", "LIVE", "PRODUCT_NOTE"];
  if (supported.includes(normalized)) return normalized;
  return videoUrl ? "VIDEO" : "IMAGE";
}

function contentTypeLabel(contentType) {
  return {
    IMAGE: "图文",
    VIDEO: "视频",
    LIVE: "直播",
    PRODUCT_NOTE: "种草"
  }[contentType] || "图文";
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
    document.querySelector("#loginButton").textContent = "登录";
    return;
  }
  document.querySelector("#loginButton").textContent = "已登录";
}

async function refreshNotificationBadge() {
  if (!token() || !els.notificationBadge) {
    if (els.notificationBadge) els.notificationBadge.hidden = true;
    return;
  }
  try {
    const data = await request("/notifications/unread-count");
    const count = Number(data?.count || 0);
    els.notificationBadge.textContent = count > 99 ? "99+" : String(count);
    els.notificationBadge.hidden = count <= 0;
  } catch {
    els.notificationBadge.hidden = true;
  }
}

async function openNotificationDialog() {
  if (!requireLogin()) return;
  els.notificationList.innerHTML = `<p class="empty-text">正在加载消息...</p>`;
  els.notificationDialog.showModal();
  const unreadOnly = state.notificationFilter === "unread";
  try {
    const list = await request(`/notifications?unreadOnly=${unreadOnly}`);
    renderNotifications(Array.isArray(list) ? list : []);
  } catch {
    els.notificationList.innerHTML = `<p class="empty-text">消息加载失败，请稍后再试。</p>`;
  }
}

function renderNotifications(list) {
  if (!list.length) {
    els.notificationList.innerHTML = `<p class="empty-text">暂时还没有消息。</p>`;
    return;
  }
  els.notificationList.innerHTML = list.map(item => `
    <article class="notification-item${item.readFlag ? "" : " is-unread"}" data-id="${item.id}" data-blog-id="${item.blogId || ""}" data-order-id="${item.orderId || ""}" data-type="${item.type || ""}">
      <div class="notification-item-body">
        <strong>${escapeHtml(item.title || notificationTypeLabel(item.type))}</strong>
        <span>${escapeHtml(item.content || "")}</span>
        <small><span class="notification-type-tag tag-${(item.type || "").split("_")[0].toLowerCase()}">${notificationTypeLabel(item.type)}</span> · ${formatTime(item.createTime)}</small>
      </div>
      <div class="notification-item-actions">
        ${item.readFlag ? "" : `<button class="notification-action-btn" data-action="read" title="标记已读"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor"/></svg></button>`}
        <button class="notification-action-btn" data-action="delete" title="删除"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" fill="currentColor"/></svg></button>
      </div>
    </article>
  `).join("");
}

function notificationTypeLabel(type) {
  return {
    LIKE: "点赞",
    COLLECT: "收藏",
    COMMENT: "评论",
    REPLY: "回复",
    FOLLOW: "关注",
    ORDER_CREATED: "订单",
    ORDER_PAID: "订单",
    ORDER_SHIPPED: "发货",
    ORDER_COMPLETED: "完成",
    ORDER_CANCELLED: "取消",
    ORDER_REFUNDING: "退款",
    ORDER_REFUND_APPROVED: "退款",
    ORDER_REFUND_REJECTED: "退款"
  }[type] || "通知";
}

async function markNotificationsRead() {
  if (!requireLogin()) return;
  await request("/notifications/read", { method: "POST" });
  await refreshNotificationBadge();
  await openNotificationDialog();
}

async function markSingleNotificationRead(id) {
  try {
    await request(`/notifications/${id}/read`, { method: "POST" });
    await refreshNotificationBadge();
    const item = els.notificationList.querySelector(`[data-id="${id}"]`);
    if (item) {
      item.classList.remove("is-unread");
      const readBtn = item.querySelector('[data-action="read"]');
      if (readBtn) readBtn.remove();
    }
  } catch { /* ignore */ }
}

async function deleteNotification(id) {
  try {
    await request(`/notifications/${id}`, { method: "DELETE" });
    await refreshNotificationBadge();
    const item = els.notificationList.querySelector(`[data-id="${id}"]`);
    if (item) {
      item.style.opacity = "0";
      item.style.transform = "translateX(100%)";
      setTimeout(() => {
        item.remove();
        if (!els.notificationList.querySelector(".notification-item")) {
          els.notificationList.innerHTML = `<p class="empty-text">暂时还没有消息。</p>`;
        }
      }, 250);
    }
  } catch { /* ignore */ }
}

function navigateFromNotification(item) {
  const blogId = item.dataset.blogId;
  const orderId = item.dataset.orderId;
  const type = item.dataset.type;
  els.notificationDialog.close();
  if (blogId && (type === "LIKE" || type === "COLLECT" || type === "COMMENT" || type === "REPLY")) {
    openDrawer({ id: Number(blogId) });
  } else if (orderId && type.startsWith("ORDER_")) {
    openOrdersDialog();
  }
}

async function loadProfileStats() {
  if (!token()) return;
  try {
    const profile = await request("/content/profile");
    state.currentProfile = profile;
  } catch {
    // 统计接口异常时保留当前用户基础信息，不影响浏览主流程。
  }
}

async function openMyProfile(tab = "works") {
  if (!requireLogin()) return;
  showContentArea();
  hideUnifiedSearch();
  state.mode = "profile";
  state.profileTab = tab;
  els.feed.hidden = true;
  els.loading.hidden = true;
  els.profileHome.hidden = false;
  els.profileHomeResults.innerHTML = `<p class="empty-text">正在加载主页...</p>`;
  document.querySelectorAll("[data-feed]").forEach(item => item.classList.remove("is-active"));
  try {
    const profile = await request("/content/profile");
    state.currentProfile = profile;
    renderProfileHome(profile);
    await loadProfileTab(tab);
  } catch (error) {
    els.profileHomeResults.innerHTML = `<p class="empty-text">${escapeHtml(error.message || "主页加载失败")}</p>`;
  }
}

function renderProfileHome(profile) {
  document.querySelector("#profileHomeAvatar").src = normalizeImage(profile.icon) || fallbackAvatar;
  document.querySelector("#profileHomeName").textContent = profile.nickName || "探店用户";
  document.querySelector("#profileHomeIntro").textContent = profile.introduce || "这个人还没有写简介。";
  document.querySelector("#profileHomeMeta").textContent = `${profile.city || "城市未填写"} · ID ${profile.userId}`;
  renderCreatorGrowth(document.querySelector("#profileGrowth"), profile.creatorGrowth);
  document.querySelector("#profileHomeWorks").textContent = profile.notes || 0;
  document.querySelector("#profileHomeCollections").textContent = profile.collects || 0;
  document.querySelector("#profileHomeLiked").textContent = profile.likes || 0;
  document.querySelector("#profileHomeFollowing").textContent = profile.following || 0;
  document.querySelector("#profileHomeFollowers").textContent = profile.followers || 0;
  document.querySelector("#editProfileButton").hidden = !profile.isMe;
  renderProfileTabs();
}

function renderProfileTabs() {
  const tabs = [
    ["works", "作品"],
    ["collections", "收藏"],
    ["liked", "点赞"],
    ["following", "关注"],
    ["followers", "粉丝"]
  ];
  els.profileHomeTabs.innerHTML = tabs.map(([key, label]) => `
    <button type="button" class="${state.profileTab === key ? "is-active" : ""}" data-profile-tab="${key}">${label}</button>
  `).join("");
  els.profileHomeTabs.querySelectorAll("[data-profile-tab]").forEach(button => {
    button.addEventListener("click", () => loadProfileTab(button.dataset.profileTab));
  });
}

async function loadProfileTab(tab) {
  state.profileTab = tab;
  renderProfileTabs();
  const userId = state.currentProfile?.userId || state.currentUser?.id;
  if (!userId) return;
  els.profileHomeResults.innerHTML = `<p class="empty-text">正在加载...</p>`;
  if (["works", "collections", "liked"].includes(tab)) {
    const path = tab === "works"
      ? `/content/user/${userId}`
      : `/content/user/${userId}/${tab}`;
    const data = await request(`${path}?current=1`);
    const notes = (Array.isArray(data?.list) ? data.list : []).map(normalizeNote);
    renderProfileNotes(notes);
    return;
  }
  const users = await request(`/content/user/${userId}/${tab}?current=1`);
  renderProfileUsers(Array.isArray(users) ? users : []);
}

function renderProfileNotes(notes) {
  if (!notes.length) {
    els.profileHomeResults.innerHTML = `<p class="empty-text">这里暂时还没有内容。</p>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "masonry-feed profile-note-results";
  notes.forEach(note => grid.appendChild(createNoteCard(note)));
  els.profileHomeResults.innerHTML = "";
  els.profileHomeResults.appendChild(grid);
}

function renderProfileUsers(users) {
  if (!users.length) {
    els.profileHomeResults.innerHTML = `<p class="empty-text">这里暂时还没有用户。</p>`;
    return;
  }
  els.profileHomeResults.innerHTML = `
    <div class="profile-user-list">
      ${users.map(user => `
        <article class="profile-user-row">
          <img src="${normalizeImage(user.icon) || fallbackAvatar}" alt="">
          <span>
            <strong>${escapeHtml(user.nickName || "探店用户")}</strong>
            <small>ID ${user.id}</small>
          </span>
        </article>
      `).join("")}
    </div>`;
}

function openProfileEdit() {
  const profile = state.currentProfile || {};
  els.profileEditForm.elements.nickName.value = profile.nickName || "";
  els.profileEditForm.elements.icon.value = profile.icon || "";
  els.profileEditForm.elements.city.value = profile.city || "";
  els.profileEditForm.elements.introduce.value = profile.introduce || "";
  els.profileEditDialog.showModal();
}

async function submitProfileEdit(event) {
  if (event.submitter && event.submitter.value === "cancel") return;
  event.preventDefault();
  const form = new FormData(els.profileEditForm);
  try {
    const profile = await request("/content/profile", {
      method: "PUT",
      body: JSON.stringify({
        nickName: form.get("nickName"),
        icon: form.get("icon"),
        city: form.get("city"),
        introduce: form.get("introduce")
      })
    });
    state.currentProfile = profile;
    renderProfileHome(profile);
    state.currentUser = { ...(state.currentUser || {}), id: profile.userId, nickName: profile.nickName, icon: profile.icon };
    renderUser(state.currentUser);
    els.profileEditDialog.close();
    showStatus("个人资料已更新。");
  } catch (error) {
    showStatus(error.message || "资料保存失败。");
  }
}

// ------------------------------
// Topic filters
// ------------------------------
async function loadCategories() {
  renderCategories([
    { id: "all", name: "推荐" },
    { id: "food", name: "美食" },
    { id: "fashion", name: "穿搭" },
    { id: "travel", name: "旅行" },
    { id: "digital", name: "数码" },
    { id: "goods", name: "好物" },
    { id: "shop", name: "探店" }
  ]);
  return;
  try {
    const data = await request("/shop-type/list");
    renderCategories([{ id: "all", name: "推荐" }, ...data.map(item => ({ id: item.id, name: item.name }))]);
  } catch {
    renderCategories(fallbackCategories);
  }
}

function renderCategories(categories) {
  els.categoryList.innerHTML = "";
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
    });
    els.categoryList.appendChild(button);
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
  if (state.page === 1) {
    renderSkeletons(8);
  } else {
    els.loading.textContent = "正在加载更多笔记...";
  }
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
  clearSkeletons();
  const fragment = document.createDocumentFragment();
  notes.forEach(note => fragment.appendChild(createNoteCard(note)));
  els.feed.appendChild(fragment);
  mergeVideoNotes(notes);
}

function mergeVideoNotes(notes) {
  const exists = new Set(state.videoNotes.map(note => String(note.id)));
  notes.filter(note => note.isVideo && !exists.has(String(note.id))).forEach(note => state.videoNotes.push(note));
}

function createNoteCard(note) {
  const card = document.createElement("article");
  card.className = "note-card";
  const button = document.createElement("button");
  button.type = "button";
  button.addEventListener("click", () => openDrawer(note));
  const badge = note.contentType === "IMAGE" ? "" : `<span class="video-badge">${contentTypeLabel(note.contentType)}</span>`;
  const cover = note.isVideo
    ? `<video class="note-image note-video-cover" style="--ratio:${note.ratio}" src="${normalizeMedia(note.videoUrl)}" poster="${normalizeImage(note.image)}" muted playsinline preload="metadata"></video>${badge}`
    : `<img class="note-image" style="--ratio:${note.ratio}" src="${normalizeImage(note.image)}" alt="${escapeHtml(note.title)}" loading="lazy">${badge}`;
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
        <span class="like-count"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2 10.7 20C5.8 15.6 2.6 12.7 2.6 9a5 5 0 0 1 8.7-3.4A5 5 0 0 1 20 9c0 3.7-3.2 6.6-8.1 11l-1.3 1.2Z"/></svg>${note.liked}</span>
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
  state.commentSort = "hot";
  document.querySelectorAll("[data-comment-sort]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.commentSort === "hot");
  });
  els.noteSmart.hidden = true;
  els.noteSmartText.textContent = "";
  renderDrawerImages(note);
  document.querySelector("#drawerAvatar").src = normalizeImage(note.icon);
  document.querySelector("#drawerAuthor").textContent = note.name;
  document.querySelector("#drawerTime").textContent = formatTime(note.createTime);
  renderCreatorGrowth(els.drawerAuthorGrowth, note.creatorGrowth);
  document.querySelector("#drawerTitle").textContent = note.title;
  document.querySelector("#drawerContent").textContent = note.content || "这个作者还没有填写更多内容。";
  renderShopBridge(note.shop);
  renderNoteProducts(note.products);
  renderRelatedNotes(note.relatedNotes || []);
  document.querySelector("#drawerLike").innerHTML = `♥ 赞 ${note.liked}`;
  if (note.isCollect) state.collected.add(String(note.id));
  if (note.isFollow) state.followed.add(String(note.userId));
  document.querySelector("#drawerCollect").innerHTML = state.collected.has(String(note.id)) ? "★ 已收藏" : "☆ 收藏";
  document.querySelector("#drawerFollow").textContent = state.followed.has(String(note.userId)) ? "已关注" : "关注";
  document.querySelector("#drawerLike").onclick = () => likeNote(note);
  document.querySelector("#drawerCollect").onclick = () => toggleCollect(note);
  document.querySelector("#drawerFollow").onclick = () => toggleFollow(note);
  document.querySelector("#drawerAnalyze").onclick = () => analyzeCurrentNote(note);
  const editButton = document.querySelector("#drawerEdit");
  const deleteButton = document.querySelector("#drawerDelete");
  editButton.hidden = !note.isOwner;
  deleteButton.hidden = !note.isOwner;
  editButton.onclick = () => openComposerForEdit(note);
  deleteButton.onclick = () => deleteCurrentNote(note);
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

function renderNoteProducts(products = []) {
  const list = Array.isArray(products) ? products.map(normalizeProduct) : [];
  if (!list.length) {
    els.noteProductBridge.hidden = true;
    els.noteProductList.innerHTML = "";
    els.noteProductCount.textContent = "0";
    return;
  }
  els.noteProductCount.textContent = String(list.length);
  els.noteProductList.innerHTML = list.map(product => `
    <article class="note-product-card">
      <button class="note-product-main" type="button" data-note-product-open="${product.id}">
        <img src="${normalizeImage(product.image)}" alt="${escapeHtml(product.title)}">
        <span>
          <strong>${escapeHtml(product.title)}</strong>
          <small>${escapeHtml(product.subTitle || "内容同款好物")}</small>
          <b>¥${formatMoney(product.price)}</b>
        </span>
      </button>
      <div class="note-product-actions">
        <button type="button" data-note-product-cart="${product.id}">加购</button>
        <button type="button" data-note-product-buy="${product.id}">购买</button>
      </div>
    </article>
  `).join("");
  els.noteProductList.querySelectorAll("[data-note-product-open]").forEach(button => {
    button.addEventListener("click", () => openProduct(button.dataset.noteProductOpen));
  });
  els.noteProductList.querySelectorAll("[data-note-product-cart]").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.noteProductCart, 1));
  });
  els.noteProductList.querySelectorAll("[data-note-product-buy]").forEach(button => {
    button.addEventListener("click", () => buyProductNow(button.dataset.noteProductBuy));
  });
  els.noteProductBridge.hidden = false;
}

function renderCreatorGrowth(target, growth) {
  if (!target) return;
  if (!growth) {
    target.innerHTML = "";
    return;
  }
  const badges = Array.isArray(growth.badges) ? growth.badges : [];
  target.innerHTML = `
    <span class="creator-level">${escapeHtml(growth.levelName || `Lv.${growth.level || 1}`)}</span>
    ${growth.qualityCreator ? `<span class="creator-quality">优质创作者</span>` : ""}
    <span>连续发布 ${growth.continuousPublishDays || 0} 天</span>
    ${badges.map(badge => `<span>${escapeHtml(badge)}</span>`).join("")}
  `;
}

function renderRelatedNotes(notes = []) {
  const list = Array.isArray(notes) ? notes.map(normalizeNote).filter(note => note.id !== state.currentNote?.id) : [];
  if (!list.length) {
    els.noteRelated.hidden = true;
    els.noteRelatedList.innerHTML = "";
    return;
  }
  els.noteRelatedList.innerHTML = list.map(note => `
    <button class="related-note" type="button" data-related-note="${note.id}">
      <img src="${normalizeImage(note.image)}" alt="${escapeHtml(note.title)}">
      <span>
        <strong>${escapeHtml(note.title)}</strong>
        <small>${escapeHtml(note.name || "探店用户")} · ${note.liked || 0} 赞</small>
      </span>
    </button>
  `).join("");
  els.noteRelatedList.querySelectorAll("[data-related-note]").forEach(button => {
    const related = list.find(note => String(note.id) === String(button.dataset.relatedNote));
    button.addEventListener("click", () => related && openDrawer(related));
  });
  els.noteRelated.hidden = false;
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
      <video class="drawer-video" src="${normalizeMedia(note.videoUrl)}" poster="${normalizeImage(note.image)}" controls autoplay playsinline preload="metadata"></video>
    `;
    els.drawerThumbs.innerHTML = "";
    return;
  }
  const images = (note.images.length ? note.images : [note.image]).slice(0, 9);
  let activeIndex = 0;
  const setActive = index => {
    activeIndex = (index + images.length) % images.length;
    els.drawerMedia.innerHTML = `
      <button class="carousel-nav carousel-prev" type="button" aria-label="上一张">‹</button>
      <img src="${normalizeImage(images[activeIndex])}" alt="${escapeHtml(note.title)}">
      <button class="carousel-nav carousel-next" type="button" aria-label="下一张">›</button>
      <span class="carousel-count">${activeIndex + 1}/${images.length}</span>
    `;
    els.drawerThumbs.querySelectorAll("button").forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === activeIndex);
    });
    els.drawerMedia.querySelector(".carousel-prev").addEventListener("click", () => setActive(activeIndex - 1));
    els.drawerMedia.querySelector(".carousel-next").addEventListener("click", () => setActive(activeIndex + 1));
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

function renderVideoFeed() {
  const videos = state.videoNotes.length
    ? state.videoNotes
    : fallbackNotes.map(normalizeNote).filter(note => note.isVideo);
  if (!videos.length) {
    els.videoFeed.innerHTML = `<p class="empty-text video-empty">还没有视频笔记，发布时上传视频就会出现在这里。</p>`;
    return;
  }
  els.videoFeed.innerHTML = videos.map(note => `
    <article class="video-slide" data-video-id="${note.id}">
      <video class="immersive-video" src="${normalizeMedia(note.videoUrl)}" poster="${normalizeImage(note.image)}" loop playsinline preload="metadata"></video>
      <div class="danmaku-layer" data-danmaku-layer="${note.id}"></div>
      <div class="video-gradient"></div>
      <div class="video-info">
        <div class="video-author">
          <img src="${normalizeImage(note.icon)}" alt="">
          <span>${escapeHtml(note.name)}</span>
        </div>
        <h2>${escapeHtml(note.title)}</h2>
        <p>${escapeHtml(note.content || "")}</p>
      </div>
      <div class="video-actions">
        <button type="button" data-video-like="${note.id}"><span>♥</span><small>${note.liked || 0}</small></button>
        <button type="button" data-video-comment="${note.id}"><span>评</span><small>${note.comments || 0}</small></button>
        <button type="button" data-video-buy="${note.id}"><span>购</span><small>同款</small></button>
        <button type="button" data-video-open="${note.id}"><span>···</span><small>详情</small></button>
      </div>
      <form class="danmaku-form" data-danmaku-form="${note.id}">
        <input name="danmaku" maxlength="40" autocomplete="off" placeholder="发条弹幕...">
        <button type="submit">发送</button>
      </form>
      <div class="danmaku-controls">
        <button type="button" data-danmaku-toggle="${note.id}">${state.danmakuEnabled ? "弹幕开" : "弹幕关"}</button>
        <label>速度
          <input type="range" min="5" max="13" step="1" value="${state.danmakuSpeed}" data-danmaku-speed="${note.id}">
        </label>
      </div>
    </article>
  `).join("");
  bindVideoFeedEvents(videos);
  videos.forEach(note => loadDanmaku(note.id));
}

function bindVideoFeedEvents(videos) {
  if (state.videoObserver) state.videoObserver.disconnect();
  state.videoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target.querySelector("video");
      if (!video) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.62) {
        pauseImmersiveVideos(video);
        video.play().catch(() => {});
        startDanmakuTicker(entry.target);
      } else {
        video.pause();
        stopDanmakuTicker(entry.target);
      }
    });
  }, { threshold: [0, 0.62, 1] });
  els.videoFeed.querySelectorAll(".video-slide").forEach(slide => state.videoObserver.observe(slide));
  els.videoFeed.querySelectorAll(".immersive-video").forEach(video => {
    video.addEventListener("click", () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });
  });
  els.videoFeed.querySelectorAll("[data-video-open], [data-video-comment]").forEach(button => {
    button.addEventListener("click", () => {
      const note = videos.find(item => String(item.id) === String(button.dataset.videoOpen || button.dataset.videoComment));
      if (note) openDrawer(note);
    });
  });
  els.videoFeed.querySelectorAll("[data-video-like]").forEach(button => {
    button.addEventListener("click", () => {
      const note = videos.find(item => String(item.id) === String(button.dataset.videoLike));
      if (note) likeNote(note);
    });
  });
  els.videoFeed.querySelectorAll("[data-video-buy]").forEach(button => {
    button.addEventListener("click", () => {
      const note = videos.find(item => String(item.id) === String(button.dataset.videoBuy));
      if (note?.products?.length) {
        openProduct(note.products[0].id);
        return;
      }
      if (note?.shop) openDrawer(note);
      else switchMall();
    });
  });
  els.videoFeed.querySelectorAll("[data-danmaku-form]").forEach(form => {
    form.addEventListener("submit", submitDanmaku);
  });
  els.videoFeed.querySelectorAll("[data-danmaku-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      state.danmakuEnabled = !state.danmakuEnabled;
      localStorage.setItem("hmdp_danmaku_enabled", JSON.stringify(state.danmakuEnabled));
      document.querySelectorAll("[data-danmaku-toggle]").forEach(item => {
        item.textContent = state.danmakuEnabled ? "弹幕开" : "弹幕关";
      });
      document.querySelectorAll(".danmaku-layer").forEach(layer => {
        layer.hidden = !state.danmakuEnabled;
      });
    });
  });
  els.videoFeed.querySelectorAll("[data-danmaku-speed]").forEach(input => {
    input.addEventListener("input", () => {
      state.danmakuSpeed = Number(input.value);
      localStorage.setItem("hmdp_danmaku_speed", String(state.danmakuSpeed));
    });
  });
}

function defaultDanmaku(noteId) {
  return [
    "这个镜头好有感觉",
    "求路线",
    "收藏了，下次去",
    "这个同款想买",
    "氛围感拉满"
  ].map((content, index) => ({ content, videoSecond: index * 3, lane: index % 4 }));
}

async function loadDanmaku(noteId) {
  try {
    const data = await request(`/video-danmaku/public/${noteId}`);
    state.danmakuStore[String(noteId)] = Array.isArray(data) ? data : [];
  } catch {
    state.danmakuStore[String(noteId)] = defaultDanmaku(noteId);
  }
  const layer = els.videoFeed.querySelector(`[data-danmaku-layer="${noteId}"]`);
  if (layer) layer.hidden = !state.danmakuEnabled;
}

function renderDanmaku(noteId, currentSecond) {
  const layer = els.videoFeed.querySelector(`[data-danmaku-layer="${noteId}"]`);
  if (!layer || !state.danmakuEnabled) return;
  const list = state.danmakuStore[String(noteId)] || [];
  list
    .filter(item => Number(item.videoSecond || 0) === currentSecond && !item.__shownAtSecond)
    .slice(0, 8)
    .forEach((item, index) => {
      item.__shownAtSecond = currentSecond;
      shootDanmaku(layer, item.content || item.text || item, item.lane ?? index % 5);
    });
}

function shootDanmaku(layer, text, lane) {
  const item = document.createElement("span");
  item.className = "danmaku-item";
  item.textContent = text;
  const laneNumber = Number(lane);
  const track = Number.isInteger(laneNumber) ? ((laneNumber % 5) + 5) % 5 : Math.floor(Math.random() * 5);
  item.style.setProperty("--lane", String(track));
  item.style.setProperty("--duration", `${state.danmakuSpeed}s`);
  layer.appendChild(item);
  item.addEventListener("animationend", () => item.remove(), { once: true });
}

async function submitDanmaku(event) {
  event.preventDefault();
  if (!requireLogin()) return;
  const form = event.currentTarget;
  const noteId = String(form.dataset.danmakuForm);
  const input = form.elements.danmaku;
  const text = input.value.trim();
  if (!text) return;
  const slide = form.closest(".video-slide");
  const video = slide?.querySelector("video");
  const currentSecond = Math.max(0, Math.floor(video?.currentTime || 0));
  const payload = {
    blogId: Number(noteId),
    content: text,
    videoSecond: currentSecond,
    lane: Math.floor(Math.random() * 5),
  };
  try {
    const saved = await request("/video-danmaku", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const list = state.danmakuStore[noteId] || [];
    list.push(saved || payload);
    state.danmakuStore[noteId] = list;
    input.value = "";
    const layer = els.videoFeed.querySelector(`[data-danmaku-layer="${noteId}"]`);
    if (layer) shootDanmaku(layer, text, payload.lane);
  } catch (error) {
    showStatus(error.message || "弹幕发送失败。");
  }
}

function startDanmakuTicker(slide) {
  if (slide.dataset.danmakuTimer) return;
  const timer = window.setInterval(() => {
    const video = slide.querySelector("video");
    if (!video || video.paused) return;
    renderDanmaku(slide.dataset.videoId, Math.floor(video.currentTime || 0));
  }, 500);
  slide.dataset.danmakuTimer = String(timer);
}

function stopDanmakuTicker(slide) {
  if (!slide.dataset.danmakuTimer) return;
  window.clearInterval(Number(slide.dataset.danmakuTimer));
  delete slide.dataset.danmakuTimer;
}

function playCurrentImmersiveVideo() {
  const first = els.videoFeed.querySelector(".immersive-video");
  if (first) first.play().catch(() => {});
}

function pauseImmersiveVideos(except) {
  document.querySelectorAll(".immersive-video").forEach(video => {
    if (video !== except) video.pause();
  });
  document.querySelectorAll(".video-slide").forEach(slide => {
    if (slide.querySelector("video") !== except) stopDanmakuTicker(slide);
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
    const result = await request(`/blog-comments/of/blog?blogId=${blogId}&sort=${state.commentSort}`, { raw: true });
    const comments = Array.isArray(result.data) ? result.data : [];
    updateCommentCount(result.total ?? comments.length);
    renderComments(comments);
  } catch {
    updateCommentCount(0);
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
        <div class="comment-tools">${renderCommentActions(comment)}</div>
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
  els.commentList.querySelectorAll("[data-comment-delete]").forEach(button => {
    button.addEventListener("click", () => deleteComment(button.dataset.commentDelete));
  });
  els.commentList.querySelectorAll("[data-comment-report]").forEach(button => {
    button.addEventListener("click", () => reportComment(button.dataset.commentReport));
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
          <div class="comment-tools">${renderCommentActions(reply)}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderCommentActions(comment) {
  if (comment.isOwner) {
    return `<button class="comment-action" type="button" data-comment-delete="${comment.id}">删除</button>`;
  }
  return `<button class="comment-action" type="button" data-comment-report="${comment.id}">举报</button>`;
}

function updateCommentCount(count) {
  const nextCount = Number(count || 0);
  els.commentCount.textContent = nextCount;
  if (state.currentNote) {
    state.currentNote.comments = nextCount;
  }
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

async function deleteComment(commentId) {
  if (!state.currentNote || !requireLogin()) return;
  try {
    const data = await request(`/blog-comments/${commentId}`, { method: "DELETE" });
    updateCommentCount(data?.comments);
    loadComments(state.currentNote.id);
  } catch {
    showStatus("删除评论失败，请稍后再试。");
  }
}

async function reportComment(commentId) {
  if (!state.currentNote || !requireLogin()) return;
  try {
    const data = await request(`/blog-comments/report/${commentId}`, { method: "PUT" });
    updateCommentCount(data?.comments);
    loadComments(state.currentNote.id);
    showStatus("已提交举报。");
  } catch {
    showStatus("举报失败，请稍后再试。");
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
    const data = await request("/blog-comments", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    trackEvent("comment", { blogId: state.currentNote.id, scene: "detail" });
    updateCommentCount(data?.comments);
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
  hideUnifiedSearch();
  hideProfileHome();
  state.page = 1;
  state.hasMore = true;
  state.notes = [];
  els.feed.innerHTML = "";
  if (clearStatus) hideStatus();
  loadNotes();
}

function hideUnifiedSearch() {
  if (!els.unifiedSearch) return;
  els.unifiedSearch.hidden = true;
  els.feed.hidden = false;
  els.loading.hidden = false;
}

function hideProfileHome() {
  if (!els.profileHome) return;
  els.profileHome.hidden = true;
  els.feed.hidden = false;
  els.loading.hidden = false;
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

function normalizeShop(shop, index = 0) {
  const images = String(shop.images || "").split(",").map(item => item.trim()).filter(Boolean);
  return {
    ...shop,
    image: normalizeImage(images[0]) || fallbackNotes[index % fallbackNotes.length].images,
    name: shop.name || "本地商家",
    area: shop.area || "本地生活",
    address: shop.address || "",
    avgPrice: Number(shop.avgPrice || 0),
    sold: Number(shop.sold || 0),
    score: Number(shop.score || 0)
  };
}

function setMallActive(active) {
  document.querySelectorAll("#mallTab, #mobileMall").forEach(item => item.classList.toggle("is-active", active));
  if (active) {
    document.querySelectorAll("[data-feed]").forEach(item => item.classList.remove("is-active"));
  }
}

function setVideoActive(active) {
  document.querySelectorAll("#videoTab, #mobileVideo").forEach(item => item.classList.toggle("is-active", active));
  if (active) {
    document.querySelectorAll("[data-feed]").forEach(item => item.classList.remove("is-active"));
  }
}

function showContentArea() {
  els.contentArea.hidden = false;
  els.mallArea.hidden = true;
  els.videoArea.hidden = true;
  setMallActive(false);
  setVideoActive(false);
  pauseImmersiveVideos();
}

function switchMall() {
  state.mode = "mall";
  state.mallQuery = els.search.value.trim();
  els.contentArea.hidden = true;
  els.videoArea.hidden = true;
  els.mallArea.hidden = false;
  setMallActive(true);
  setVideoActive(false);
  pauseImmersiveVideos();
  hideStatus();
  loadProducts();
}

function switchVideo() {
  state.mode = "video";
  els.contentArea.hidden = true;
  els.mallArea.hidden = true;
  els.videoArea.hidden = false;
  setMallActive(false);
  setVideoActive(true);
  hideStatus();
  renderVideoFeed();
  setTimeout(playCurrentImmersiveVideo, 80);
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

async function buyProductNow(productId) {
  if (!requireLogin()) return;
  try {
    const order = await createMallOrder({ productId: Number(productId), quantity: 1 });
    await payMallOrder(order.id);
    showStatus(`付款成功，订单号：${order.id}`);
    loadProducts();
  } catch (error) {
    showStatus(error.message || "购买失败，请稍后再试。");
  }
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
  // smart-card removed from UI; keep function for potential future use
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
// 发布流程：按内容类型上传素材并提交笔记
// ------------------------------
const COMPOSER_DRAFT_KEY = "hmdp_composer_draft";

function getComposerContentType() {
  return normalizeContentType(els.composerForm.elements.contentType?.value, "");
}

function readComposerDraft() {
  try {
    return JSON.parse(localStorage.getItem(COMPOSER_DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

function hasComposerDraft(draft = readComposerDraft()) {
  if (!draft) return false;
  return ["title", "images", "videoUrl", "shopId", "productIds", "topics", "content"]
    .some(key => String(draft[key] || "").trim());
}

function collectComposerDraft() {
  const form = els.composerForm.elements;
  return {
    contentType: getComposerContentType(),
    title: form.title?.value || "",
    images: form.images?.value || "",
    videoUrl: form.videoUrl?.value || "",
    shopId: form.shopId?.value || "",
    productIds: form.productIds?.value || "",
    tags: form.tags?.value || "",
    topics: form.topics?.value || "",
    content: form.content?.value || "",
    updatedAt: new Date().toISOString()
  };
}

function saveComposerDraft(showTip = false) {
  if (state.editingNoteId) return;
  const draft = collectComposerDraft();
  if (!hasComposerDraft(draft)) {
    localStorage.removeItem(COMPOSER_DRAFT_KEY);
    renderComposerDraftState();
    return;
  }
  localStorage.setItem(COMPOSER_DRAFT_KEY, JSON.stringify(draft));
  renderComposerDraftState(showTip ? "草稿已保存，发布失败也不会丢。" : "");
}

function restoreComposerDraft() {
  if (state.editingNoteId) return false;
  const draft = readComposerDraft();
  if (!hasComposerDraft(draft)) {
    renderComposerDraftState();
    return false;
  }
  const form = els.composerForm.elements;
  if (draft.contentType && form.contentType) {
    const typeInput = [...els.contentTypeInputs].find(input => input.value === draft.contentType);
    if (typeInput) typeInput.checked = true;
  }
  ["title", "images", "videoUrl", "shopId", "productIds", "tags", "topics", "content"].forEach(name => {
    if (form[name] && draft[name] != null) {
      form[name].value = draft[name];
    }
  });
  applyComposerType();
  renderComposerDraftState("已恢复上次未发布的草稿。");
  return true;
}

function clearComposerDraft(resetForm = false) {
  localStorage.removeItem(COMPOSER_DRAFT_KEY);
  if (resetForm) {
    els.composerForm.reset();
    els.uploadPreview.innerHTML = "";
    els.videoPreview.innerHTML = "";
    applyComposerType();
  }
  renderComposerDraftState();
}

function renderComposerDraftState(message = "") {
  if (!els.composerDraftBar) return;
  const draft = readComposerDraft();
  const hasDraft = hasComposerDraft(draft);
  els.composerDraftBar.hidden = !hasDraft;
  if (hasDraft && els.composerDraftText) {
    const time = draft.updatedAt ? new Date(draft.updatedAt).toLocaleString("zh-CN", { hour12: false }) : "";
    els.composerDraftText.textContent = message || (time ? `草稿已保存 ${time}` : "草稿已自动保存");
  }
}

function appendComposerImageUrls(urls) {
  if (!urls.length) return;
  const input = els.composerForm.elements.images;
  const existed = String(input.value || "").split(",").map(item => item.trim()).filter(Boolean);
  input.value = [...new Set([...existed, ...urls])].join(",");
}

function setComposerVideoUrl(url) {
  if (!url) return;
  const input = els.composerForm.elements.videoUrl;
  input.value = url;
}

function fillComposerFromNote(note) {
  const form = els.composerForm.elements;
  const typeInput = [...els.contentTypeInputs].find(input => input.value === note.contentType);
  if (typeInput) typeInput.checked = true;
  form.title.value = note.title || "";
  form.images.value = Array.isArray(note.images) ? note.images.join(",") : (note.images || note.image || "");
  form.videoUrl.value = note.videoUrl || "";
  form.shopId.value = note.shopId || "";
  form.productIds.value = Array.isArray(note.products) ? note.products.map(product => product.id).filter(Boolean).join(",") : "";
  form.tags.value = note.tags || "探店";
  form.topics.value = "";
  form.content.value = note.content || "";
  els.uploadPreview.innerHTML = "";
  els.videoPreview.innerHTML = note.videoUrl ? `<video src="${normalizeMedia(note.videoUrl)}" controls muted playsinline></video>` : "";
  applyComposerType();
}

function resetComposerMode() {
  state.editingNoteId = null;
  if (els.composerTitle) els.composerTitle.dataset.mode = "create";
  const submitButton = els.composerForm.querySelector(".publish-button");
  if (submitButton) submitButton.textContent = "发布";
}

function applyComposerType() {
  const contentType = getComposerContentType();
  const isVideoLike = ["VIDEO", "LIVE"].includes(contentType);
  const isProductNote = contentType === "PRODUCT_NOTE";
  const titles = {
    IMAGE: "发布图文",
    VIDEO: "发布视频",
    PRODUCT_NOTE: "发布商品种草",
    LIVE: "发布直播预告"
  };
  if (els.composerTitle) {
    els.composerTitle.textContent = state.editingNoteId ? "编辑内容" : (titles[contentType] || "发布内容");
  }
  els.contentFields.forEach(field => {
    const scope = field.dataset.contentField;
    field.hidden = (scope === "video" && !isVideoLike) || (scope === "shop" && !isProductNote);
  });
  if (els.videoUploadTip) {
    els.videoUploadTip.textContent = contentType === "LIVE"
      ? "支持直播预告视频、回放或直播地址"
      : "支持 MP4/WebM/MOV，发布前会自动上传";
  }
  const shopInput = els.composerForm.elements.shopId;
  if (shopInput) {
    shopInput.required = isProductNote;
    shopInput.placeholder = isProductNote ? "商品种草需要关联店铺" : "关联店铺，选填";
  }
  const productInput = els.composerForm.elements.productIds;
  if (productInput) {
    productInput.required = isProductNote;
    productInput.placeholder = isProductNote ? "商品种草至少挂载一个商品 ID" : "多个商品 ID 用英文逗号分隔";
  }
}

function parseProductIds(value) {
  return String(value || "")
    .split(",")
    .map(item => Number(item.trim()))
    .filter(id => Number.isInteger(id) && id > 0)
    .filter((id, index, list) => list.indexOf(id) === index)
    .slice(0, 6);
}

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
  saveComposerDraft();
  const submitButton = els.composerForm.querySelector(".publish-button");
  submitButton.disabled = true;
  submitButton.textContent = "发布中";
  const form = new FormData(els.composerForm);
  try {
    const contentType = getComposerContentType();
    const isVideoLike = ["VIDEO", "LIVE"].includes(contentType);
    const isProductNote = contentType === "PRODUCT_NOTE";
    const uploaded = await uploadSelectedImages();
    const uploadedVideo = isVideoLike ? await uploadSelectedVideo() : "";
    appendComposerImageUrls(uploaded);
    setComposerVideoUrl(uploadedVideo);
    saveComposerDraft();
    const manualImages = String(els.composerForm.elements.images?.value || "").trim();
    const videoUrl = isVideoLike ? String(els.composerForm.elements.videoUrl?.value || "").trim() : "";
    const shopId = isProductNote && form.get("shopId") ? Number(form.get("shopId")) : null;
    const productIds = parseProductIds(form.get("productIds"));
    const content = String(form.get("content") || "").trim();
    if (isVideoLike && !videoUrl) {
      showStatus(contentType === "LIVE" ? "直播预告需要填写直播地址或上传预告视频。" : "视频内容需要上传视频或填写视频地址。");
      saveComposerDraft(true);
      return;
    }
    if (!uploaded.length && !manualImages && !videoUrl) {
      showStatus("发布笔记至少需要一张图片。");
      saveComposerDraft(true);
      return;
    }
    if (isProductNote && !shopId) {
      showStatus("商品种草需要关联店铺 ID。");
      saveComposerDraft(true);
      return;
    }
    if (isProductNote && !productIds.length) {
      showStatus("商品种草至少需要挂载一个商品。");
      saveComposerDraft(true);
      return;
    }
    if (content.length < 12) {
      showStatus("正文再多写一点，会更像一篇有价值的探店笔记。");
      saveComposerDraft(true);
      return;
    }
    const payload = {
      title: form.get("title"),
      images: manualImages,
      videoUrl,
      contentType,
      shopId,
      productIds,
      tags: form.get("tags"),
      content: mergeTopics(content, form.get("topics"))
    };
    const editingId = state.editingNoteId;
    await request(editingId ? `/blog/${editingId}` : "/blog", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    if (!editingId) clearComposerDraft();
    resetComposerMode();
    els.composer.close();
    els.composerForm.reset();
    els.uploadPreview.innerHTML = "";
    els.videoPreview.innerHTML = "";
    applyComposerType();
    if (state.currentNote) closeDrawer();
    resetAndLoad();
  } catch {
    saveComposerDraft(true);
    showStatus("发布失败，内容已保存到草稿箱。请确认已登录，且图片、店铺信息有效。");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = state.editingNoteId ? "保存" : "发布";
  }
}

function mergeTopics(content, topics) {
  const body = String(content || "").trim();
  const topicText = String(topics || "").trim();
  return topicText ? `${body}\n\n${topicText}` : body;
}

// ------------------------------
// 统一搜索：笔记、视频、商品、商家和话题
// ------------------------------
async function enterUnifiedSearch(query, preferredTab = "notes", loadAi = true) {
  const keyword = String(query || "").trim();
  if (!keyword) {
    state.mode = "feed";
    resetAndLoad();
    return;
  }
  showContentArea();
  state.mode = "search";
  hideProfileHome();
  document.querySelectorAll("[data-feed]").forEach(item => item.classList.remove("is-active"));
  state.query = keyword;
  state.mallQuery = keyword;
  state.searchTab = preferredTab;
  els.search.value = keyword;
  els.suggestPopover.classList.remove("is-open");
  els.feed.hidden = true;
  els.loading.hidden = true;
  els.unifiedSearch.hidden = false;
  els.unifiedSearchTitle.textContent = `搜索「${keyword}」`;
  els.unifiedSearchSummary.textContent = "正在同时搜索笔记、视频、商品、商家和话题";
  els.unifiedSearchTabs.innerHTML = "";
  els.unifiedSearchResults.innerHTML = `<p class="empty-text">正在搜索...</p>`;
  trackEvent("search", { scene: "unified", keyword });

  const results = await searchUnified(keyword);
  if (state.mode !== "search" || els.search.value.trim() !== keyword) {
    return;
  }
  state.searchResults = results;
  if (!state.searchResults[state.searchTab]?.length) {
    state.searchTab = ["notes", "videos", "products", "shops", "topics"].find(tab => state.searchResults[tab].length) || "notes";
  }
  renderUnifiedSearch();
  if (loadAi) loadSmartRecommendation(keyword);
}

async function searchUnified(keyword) {
  try {
    const params = new URLSearchParams({ current: "1", query: keyword });
    const data = await request(`/content/search?${params.toString()}`);
    return {
      notes: Array.isArray(data?.notes) ? data.notes.map(normalizeNote) : [],
      videos: Array.isArray(data?.videos) ? data.videos.map(normalizeNote) : [],
      products: Array.isArray(data?.products) ? data.products.map(normalizeProduct) : [],
      shops: Array.isArray(data?.shops) ? data.shops.map(normalizeShop) : [],
      topics: Array.isArray(data?.topics) ? data.topics : []
    };
  } catch {
    const [notes, products, shops] = await Promise.all([
      searchNotes(keyword),
      searchProducts(keyword),
      searchShops(keyword)
    ]);
    return {
      notes,
      videos: notes.filter(note => note.isVideo),
      products,
      shops,
      topics: searchTopics(keyword)
    };
  }
}

async function searchNotes(keyword) {
  try {
    const params = new URLSearchParams({ current: "1", channel: "hot", query: keyword });
    const data = await request(`/content/feed?${params.toString()}`);
    const notes = Array.isArray(data?.list) ? data.list.map(normalizeNote) : [];
    return notes;
  } catch {
    const lower = keyword.toLowerCase();
    return fallbackNotes
      .map(normalizeNote)
      .filter(note => `${note.title} ${note.content}`.toLowerCase().includes(lower));
  }
}

async function searchProducts(keyword) {
  try {
    const params = new URLSearchParams({ current: "1", category: "all", query: keyword });
    const data = await request(`/mall/products?${params.toString()}`);
    return Array.isArray(data) ? data.map(normalizeProduct) : [];
  } catch {
    return [];
  }
}

async function searchShops(keyword) {
  try {
    const params = new URLSearchParams({ current: "1", name: keyword });
    const data = await request(`/shop/of/name?${params.toString()}`);
    return Array.isArray(data) ? data.map(normalizeShop) : [];
  } catch {
    return [];
  }
}

function searchTopics(keyword) {
  const source = [...new Set([
    ...fallbackSuggestions,
    ...state.trends.map(item => item.keyword).filter(Boolean),
    keyword
  ])];
  return source
    .filter(topic => topic && (!keyword || topic.includes(keyword) || keyword.includes(topic)))
    .slice(0, 12)
    .map(topic => ({ keyword: topic, heat: state.trends.find(item => item.keyword === topic)?.heat || "" }));
}

function renderUnifiedSearch() {
  const tabs = [
    { key: "notes", label: "笔记" },
    { key: "videos", label: "视频" },
    { key: "products", label: "商品" },
    { key: "shops", label: "商家" },
    { key: "topics", label: "话题" }
  ];
  const total = tabs.reduce((sum, tab) => sum + state.searchResults[tab.key].length, 0);
  els.unifiedSearchSummary.textContent = `共找到 ${total} 条结果`;
  els.unifiedSearchTabs.innerHTML = tabs.map(tab => `
    <button type="button" class="${state.searchTab === tab.key ? "is-active" : ""}" data-search-tab="${tab.key}">
      ${tab.label}<small>${state.searchResults[tab.key].length}</small>
    </button>
  `).join("");
  els.unifiedSearchTabs.querySelectorAll("[data-search-tab]").forEach(button => {
    button.addEventListener("click", () => {
      state.searchTab = button.dataset.searchTab;
      renderUnifiedSearch();
    });
  });
  renderUnifiedSearchResults();
}

function renderUnifiedSearchResults() {
  const list = state.searchResults[state.searchTab] || [];
  if (!list.length) {
    els.unifiedSearchResults.innerHTML = `<p class="empty-text">这个分类暂时没有匹配结果。</p>`;
    return;
  }
  if (state.searchTab === "notes" || state.searchTab === "videos") {
    const grid = document.createElement("div");
    grid.className = "masonry-feed unified-note-results";
    list.forEach(note => grid.appendChild(createNoteCard(note)));
    els.unifiedSearchResults.innerHTML = "";
    els.unifiedSearchResults.appendChild(grid);
    return;
  }
  if (state.searchTab === "products") {
    renderUnifiedProducts(list);
    return;
  }
  if (state.searchTab === "shops") {
    renderUnifiedShops(list);
    return;
  }
  renderUnifiedTopics(list);
}

function renderUnifiedProducts(products) {
  els.unifiedSearchResults.innerHTML = `
    <div class="unified-product-grid">
      ${products.map(product => `
        <article class="product-card">
          <button type="button" data-unified-product="${product.id}">
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
      `).join("")}
    </div>`;
  els.unifiedSearchResults.querySelectorAll("[data-unified-product]").forEach(button => {
    button.addEventListener("click", () => openProduct(button.dataset.unifiedProduct));
  });
}

function renderUnifiedShops(shops) {
  els.unifiedSearchResults.innerHTML = `
    <div class="unified-list">
      ${shops.map(shop => `
        <article class="unified-row">
          <button type="button" data-unified-shop="${shop.id}">
            <img src="${normalizeImage(shop.image)}" alt="${escapeHtml(shop.name)}">
            <span>
              <strong>${escapeHtml(shop.name)}</strong>
              <small>${escapeHtml(shop.area)} · ${shop.avgPrice ? `人均 ¥${shop.avgPrice}` : "价格待补充"} · ${shop.score ? `${(shop.score / 10).toFixed(1)}分` : "暂无评分"}</small>
              <em>${escapeHtml(shop.address || "地址待补充")}</em>
            </span>
          </button>
        </article>
      `).join("")}
    </div>`;
  els.unifiedSearchResults.querySelectorAll("[data-unified-shop]").forEach(button => {
    const shop = shops.find(item => String(item.id) === String(button.dataset.unifiedShop));
    button.addEventListener("click", () => openShopDialog(shop));
  });
}

function renderUnifiedTopics(topics) {
  els.unifiedSearchResults.innerHTML = `
    <div class="unified-topic-grid">
      ${topics.map(topic => `
        <button type="button" data-unified-topic="${escapeHtml(topic.keyword)}">
          <strong>#${escapeHtml(topic.keyword)}</strong>
          <span>${topic.heat ? `热度 ${topic.heat}` : "继续探索这个话题"}</span>
        </button>
      `).join("")}
    </div>`;
  els.unifiedSearchResults.querySelectorAll("[data-unified-topic]").forEach(button => {
    button.addEventListener("click", () => enterUnifiedSearch(button.dataset.unifiedTopic, "notes"));
  });
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
  if (event.submitter && event.submitter.value === "cancel") return;
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
      enterUnifiedSearch(state.query);
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
      state.query = button.dataset.trend;
      els.search.value = state.query;
      trackEvent("search", { scene: "trend", keyword: state.query });
      enterUnifiedSearch(state.query);
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
  enterUnifiedSearch(els.search.value);
});

let searchTimer;
els.search.addEventListener("focus", () => renderSuggestions(els.search.value));
els.search.addEventListener("input", () => {
  renderSuggestions(els.search.value);
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const keyword = els.search.value.trim();
    if (keyword) enterUnifiedSearch(keyword, state.searchTab || "notes", false);
    else {
      state.mode = "feed";
      state.query = "";
      resetAndLoad();
    }
  }, 280);
});

els.imageFiles.addEventListener("change", () => {
  els.uploadPreview.innerHTML = [...els.imageFiles.files].map(file => {
    const url = URL.createObjectURL(file);
    return `<img src="${url}" alt="">`;
  }).join("");
  saveComposerDraft();
});

els.videoFile.addEventListener("change", () => {
  const file = els.videoFile.files[0];
  if (!file) {
    els.videoPreview.innerHTML = "";
    saveComposerDraft();
    return;
  }
  const url = URL.createObjectURL(file);
  els.videoPreview.innerHTML = `<video src="${url}" controls muted playsinline></video>`;
  saveComposerDraft();
});

els.contentTypeInputs.forEach(input => {
  input.addEventListener("change", () => {
    applyComposerType();
    saveComposerDraft();
  });
});
applyComposerType();
renderComposerDraftState();

els.composerForm.addEventListener("input", () => saveComposerDraft());
els.composerForm.addEventListener("change", () => saveComposerDraft());
els.clearComposerDraft?.addEventListener("click", () => {
  clearComposerDraft(true);
  showStatus("草稿已清空。");
});
els.composer.addEventListener("close", () => {
  resetComposerMode();
});

document.querySelectorAll("[data-feed]").forEach(button => {
  button.addEventListener("click", () => switchFeed(button.dataset.feed));
});

document.querySelectorAll("[data-smart-query]").forEach(button => {
  button.addEventListener("click", () => {
    state.query = button.dataset.smartQuery;
    els.search.value = state.query;
    enterUnifiedSearch(state.query);
  });
});

document.querySelectorAll("[data-close-drawer]").forEach(item => item.addEventListener("click", closeDrawer));
function openComposer() {
  if (!requireLogin()) return;
  resetComposerMode();
  if (!restoreComposerDraft()) {
    els.composerForm.reset();
    els.uploadPreview.innerHTML = "";
    els.videoPreview.innerHTML = "";
    applyComposerType();
  }
  els.composer.showModal();
}

function openComposerForEdit(note) {
  if (!note?.isOwner || !requireLogin()) return;
  state.editingNoteId = note.id;
  fillComposerFromNote(note);
  const submitButton = els.composerForm.querySelector(".publish-button");
  if (submitButton) submitButton.textContent = "保存";
  renderComposerDraftState();
  els.composer.showModal();
}

async function deleteCurrentNote(note) {
  if (!note?.isOwner || !requireLogin()) return;
  const confirmed = window.confirm("确定删除这篇笔记吗？删除后不可恢复。");
  if (!confirmed) return;
  try {
    await request(`/blog/${note.id}`, { method: "DELETE" });
    state.notes = state.notes.filter(item => String(item.id) !== String(note.id));
    state.videoNotes = state.videoNotes.filter(item => String(item.id) !== String(note.id));
    document.querySelectorAll(".note-card").forEach(card => {
      const title = card.querySelector(".note-title")?.textContent || "";
      if (title === note.title) card.remove();
    });
    closeDrawer();
    showStatus("笔记已删除。");
    resetAndLoad(false);
  } catch (error) {
    showStatus(error.message || "删除失败，请稍后再试。");
  }
}

document.querySelector("#openComposer").addEventListener("click", openComposer);
document.querySelector("#mobilePublish").addEventListener("click", openComposer);
document.querySelector("#closeShopDialog").addEventListener("click", () => els.shopDialog.close());
document.querySelector("#mallTab").addEventListener("click", switchMall);
document.querySelector("#mobileMall").addEventListener("click", switchMall);
document.querySelector("#videoTab").addEventListener("click", switchVideo);
document.querySelector("#mobileVideo").addEventListener("click", switchVideo);
document.querySelector("#openCart").addEventListener("click", openCartDialog);
document.querySelector("#openOrders").addEventListener("click", openOrdersDialog);
document.querySelector("#openMerchantCenter").addEventListener("click", openMerchantCenter);
document.querySelector("#closeProductDialog").addEventListener("click", () => els.productDialog.close());
document.querySelector("#closeCartDialog").addEventListener("click", () => els.cartDialog.close());
document.querySelector("#openNotifications").addEventListener("click", openNotificationDialog);
document.querySelector("#closeNotificationDialog").addEventListener("click", () => els.notificationDialog.close());
document.querySelector("#markNotificationsRead").addEventListener("click", markNotificationsRead);
els.notificationList.addEventListener("click", (e) => {
  const actionBtn = e.target.closest("[data-action]");
  const item = e.target.closest(".notification-item");
  if (!item) return;
  const id = Number(item.dataset.id);
  if (actionBtn) {
    e.stopPropagation();
    if (actionBtn.dataset.action === "read") markSingleNotificationRead(id);
    else if (actionBtn.dataset.action === "delete") deleteNotification(id);
  } else {
    navigateFromNotification(item);
  }
});
document.querySelectorAll(".notification-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".notification-tab").forEach(t => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    state.notificationFilter = tab.dataset.filter;
    openNotificationDialog();
  });
});
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
document.querySelector("#editProfileButton").addEventListener("click", openProfileEdit);
els.profileEditForm.addEventListener("submit", submitProfileEdit);
document.querySelectorAll(".profile-home-stats [data-profile-tab]").forEach(button => {
  button.addEventListener("click", () => loadProfileTab(button.dataset.profileTab));
});
document.querySelector("#sendCodeButton").addEventListener("click", sendCode);
els.composerForm.addEventListener("submit", submitComposer);
els.loginForm.addEventListener("submit", submitLogin);
els.commentForm.addEventListener("submit", submitComment);
document.querySelectorAll("[data-comment-sort]").forEach(button => {
  button.addEventListener("click", () => {
    state.commentSort = button.dataset.commentSort || "hot";
    document.querySelectorAll("[data-comment-sort]").forEach(item => {
      item.classList.toggle("is-active", item === button);
    });
    if (state.currentNote) loadComments(state.currentNote.id);
  });
});

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
  if (state.mode === "mall" || state.mode === "video" || state.mode === "search" || state.mode === "profile") return;
  const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 620;
  if (nearBottom) loadNotes();
}, { passive: true });

initUser();
refreshNotificationBadge();
setInterval(refreshNotificationBadge, 60000);
loadCategories();
loadNotes();
