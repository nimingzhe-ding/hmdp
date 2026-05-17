// utils.js — Global state, DOM refs, and shared utility functions
// Loaded BEFORE auth.js, notifications.js, feed.js
(function() {
// ------------------------------
// Global state
// ------------------------------
window.state = {
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
  cartItems: [],
  videoNotes: [],
  videoObserver: null,
  danmakuStore: {},
  danmakuEnabled: JSON.parse(localStorage.getItem("hmdp_danmaku_enabled") || "true"),
  danmakuSpeed: Number(localStorage.getItem("hmdp_danmaku_speed") || 8.5),
  danmakuOpacity: Number(localStorage.getItem("hmdp_danmaku_opacity") || 0.9),
  danmakuBlockWords: localStorage.getItem("hmdp_danmaku_block_words") || "",
  danmakuHotOnly: JSON.parse(localStorage.getItem("hmdp_danmaku_hot_only") || "false"),
  videoMuted: JSON.parse(localStorage.getItem("hmdp_video_muted") || "true"),
  videoAutoplay: JSON.parse(localStorage.getItem("hmdp_video_autoplay") || "true"),
  merchant: null,
  merchantProducts: [],
  merchantOrders: [],
  productVouchers: [],
  selectedVoucherId: null,
  currentProduct: null,
  selectedSkuId: null,
  checkoutQuantity: 1,
  addresses: [],
  selectedAddressId: null,
  checkoutDraft: null,
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
  notificationFilter: "all",
  aiSearchInsight: "",
  aiComposerTimer: null,
  aiCommentLoadedFor: null
};

localStorage.setItem("hmdp_ai_session", state.aiSessionId);

// ------------------------------
// DOM references
// ------------------------------
window.els = {
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
  checkoutDialog: document.querySelector("#checkoutDialog"),
  checkoutBody: document.querySelector("#checkoutBody"),
  cartDialog: document.querySelector("#cartDialog"),
  notificationDialog: document.querySelector("#notificationDialog"),
  notificationList: document.querySelector("#notificationList"),
  notificationBadge: document.querySelector("#notificationBadge"),
  customerServiceDialog: document.querySelector("#customerServiceDialog"),
  customerServiceMessages: document.querySelector("#customerServiceMessages"),
  customerServiceForm: document.querySelector("#customerServiceForm"),
  customerServiceInput: document.querySelector("#customerServiceInput"),
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
  trendList: document.querySelector("#trendList"),
  toastContainer: document.querySelector("#toastContainer")
};

function setMobileTabActive(tab) {
  document.querySelectorAll(".mobile-tabbar [data-mobile-tab]").forEach(button => {
    button.classList.toggle("is-active", Boolean(tab) && button.dataset.mobileTab === tab);
  });
}
window.setMobileTabActive = setMobileTabActive;

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
window.showToast = showToast;

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
window.renderSkeletons = renderSkeletons;

function clearSkeletons() {
  els.feed.querySelectorAll(".skeleton-card").forEach(el => el.remove());
}
window.clearSkeletons = clearSkeletons;

// ------------------------------
// Demo data used when backend data is not available
// ------------------------------
var fallbackAvatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80";
window.fallbackAvatar = fallbackAvatar;

var fallbackNotes = [
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
window.fallbackNotes = fallbackNotes;

var fallbackCategories = [
  { id: "all", name: "推荐" },
  { id: "food", name: "美食" },
  { id: "coffee", name: "咖啡" },
  { id: "weekend", name: "周末" },
  { id: "date", name: "约会" },
  { id: "photo", name: "拍照" },
  { id: "cheap", name: "平价" },
  { id: "new", name: "新店" }
];
window.fallbackCategories = fallbackCategories;

var fallbackSuggestions = ["杭州周末", "港式茶餐厅", "咖啡拍照", "人均50", "约会餐厅", "新店打卡", "一个人吃饭", "生日聚餐"];
window.fallbackSuggestions = fallbackSuggestions;

// ------------------------------
// Request and formatting helpers
// ------------------------------
const API_ORIGIN = (() => {
  const configured = localStorage.getItem("hmdp_api_origin");
  if (configured) return configured.replace(/\/$/, "");
  if (location.port === "8082" || location.port === "5500" || location.port === "5173") {
    return `${location.protocol}//${location.hostname}:8081`;
  }
  return "";
})();
window.API_ORIGIN = API_ORIGIN;

function apiUrl(url) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
}
window.apiUrl = apiUrl;

function token() {
  return localStorage.getItem("hmdp_token") || "";
}
window.token = token;

async function request(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token()) headers.set("authorization", token());
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(apiUrl(url), { ...options, headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.success === false) throw new Error(result.errorMsg || "请求失败");
  if (options.raw) return result;
  return result.data;
}
window.request = request;

async function aiFlow(url, payload = {}) {
  return request(url, {
    method: "POST",
    body: JSON.stringify({
      sessionId: state.aiSessionId,
      ...payload
    })
  });
}
window.aiFlow = aiFlow;

async function checkAiRisk(content, scenario) {
  if (!String(content || "").trim()) return true;
  try {
    const data = await aiFlow("/ai/flow/risk-check", { content, scenario });
    const answer = String(data.answer || "");
    if (answer.includes("风险等级：高") || answer.includes("高风险")) {
      showStatus(`内容可能存在风险：${answer}`);
      return false;
    }
  } catch {
    // 风控接口降级时不阻塞用户流程，后端仍可继续做兜底校验。
  }
  return true;
}
window.checkAiRisk = checkAiRisk;

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
window.normalizeNote = normalizeNote;

function normalizeContentType(contentType, videoUrl) {
  const normalized = String(contentType || "").trim().toUpperCase();
  const supported = ["IMAGE", "VIDEO", "LIVE", "PRODUCT_NOTE"];
  if (supported.includes(normalized)) return normalized;
  return videoUrl ? "VIDEO" : "IMAGE";
}
window.normalizeContentType = normalizeContentType;

function contentTypeLabel(contentType) {
  return {
    IMAGE: "图文",
    VIDEO: "视频",
    LIVE: "直播",
    PRODUCT_NOTE: "种草"
  }[contentType] || "图文";
}
window.contentTypeLabel = contentTypeLabel;

function parseVideoContent(content) {
  const text = stripHtml(content || "");
  const match = text.match(/#video:([^\s]+)/i);
  return {
    videoUrl: match ? match[1].trim() : "",
    content: match ? text.replace(match[0], "").trim() : text
  };
}
window.parseVideoContent = parseVideoContent;

function normalizeMedia(src) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/")) return src;
  return `/imgs/${src}`;
}
window.normalizeMedia = normalizeMedia;

function normalizeImage(src) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/imgs/")) return src;
  if (src.startsWith("/")) return src;
  return `/imgs/${src}`;
}
window.normalizeImage = normalizeImage;

function stripHtml(value) {
  const temp = document.createElement("div");
  temp.innerHTML = String(value).replaceAll("<br/>", "\n").replaceAll("<br>", "\n");
  return temp.textContent || temp.innerText || "";
}
window.stripHtml = stripHtml;

function showStatus(message) {
  els.status.textContent = message;
  els.status.hidden = false;
}
window.showStatus = showStatus;

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
window.trackEvent = trackEvent;

function hideStatus() {
  els.status.hidden = true;
}
window.hideStatus = hideStatus;

function requireLogin() {
  if (token()) return true;
  els.loginDialog.showModal();
  return false;
}
window.requireLogin = requireLogin;

function normalizeProduct(product, index = 0) {
  const images = String(product.images || "").split(",").map(item => item.trim()).filter(Boolean);
  return {
    ...product,
    images,
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
window.normalizeProduct = normalizeProduct;

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
window.normalizeShop = normalizeShop;

function formatTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
window.formatTime = formatTime;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
window.escapeHtml = escapeHtml;

function formatMoney(value) {
  const number = Number(value || 0);
  return Number.isInteger(number / 100) ? String(number / 100) : (number / 100).toFixed(2);
}
window.formatMoney = formatMoney;

})();
