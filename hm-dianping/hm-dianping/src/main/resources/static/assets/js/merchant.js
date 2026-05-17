(function() {
  // ------------------------------
  // Merchant center: apply, dashboard, products, vouchers, orders
  // References: state, els, request, requireLogin, showStatus,
  //   escapeHtml, formatMoney, normalizeImage, mallOrderStatus,
  //   loadProducts, aiFlow
  // ------------------------------

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
    bindMerchantAssistant();
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

  function bindMerchantAssistant() {
    const form = document.querySelector("#merchantProductForm");
    if (!form) return;
    let timer;
    const trigger = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => loadMerchantCopy(form), 1000);
    };
    form.elements.title?.addEventListener("input", trigger);
    form.elements.subTitle?.addEventListener("input", trigger);
  }

  async function loadMerchantCopy(form) {
    const title = String(form.elements.title?.value || "").trim();
    const subTitle = String(form.elements.subTitle?.value || "").trim();
    if (title.length + subTitle.length < 8) return;
    let panel = document.querySelector("#merchantAiCopy");
    if (!panel) {
      form.querySelector(".publish-button").insertAdjacentHTML("beforebegin", `
        <section class="ai-inline-card merchant-ai-copy" id="merchantAiCopy">
          <strong>商家文案建议</strong>
          <p>正在生成标题、卖点和优惠券文案...</p>
        </section>
      `);
      panel = document.querySelector("#merchantAiCopy");
    }
    try {
      const data = await aiFlow("/ai/flow/merchant-copy", {
        content: `${title}\n${subTitle}`,
        scenario: "商品发布"
      });
      panel.innerHTML = `<strong>商家文案建议</strong><p>${escapeHtml(data.answer || "暂时没有建议。")}</p>`;
    } catch {
      panel.innerHTML = `<strong>商家文案建议</strong><p>商家文案建议暂时不可用。</p>`;
    }
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

  // Export cross-module functions
  window.openMerchantCenter = openMerchantCenter;
})();
