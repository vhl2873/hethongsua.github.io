"use strict";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });
const defaultApiBase = "http://localhost:3001";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const savedApiBase = localStorage.getItem("thanhHauApiBase");
let apiBase = savedApiBase && savedApiBase !== "http://localhost:3000" ? savedApiBase : defaultApiBase;
let state = {
  summary: {}, products: [], categories: [], orders: [], customers: [], posts: [], postCategories: [], pages: [], banners: [],
  contacts: [], newsletters: [], coupons: [], shippingMethods: [], paymentMethods: [], reviews: [], menus: [], menuItems: [],
  settings: [], media: [], variants: [], movements: [], customerAddresses: [], productImages: []
};

const siteSections = [
  ["Header & menu", "Logo, tìm kiếm, mega menu, tài khoản, wishlist, giỏ hàng"],
  ["Trang chủ", "Slider, banner, danh mục nổi bật, sản phẩm nổi bật, newsletter"],
  ["Shop", "Danh mục, bộ lọc, danh sách sản phẩm, sắp xếp, sidebar"],
  ["Chi tiết sản phẩm", "Ảnh, biến thể, giá, tồn kho, mô tả, đánh giá"],
  ["Checkout", "Giỏ hàng, địa chỉ, vận chuyển, thanh toán, coupon"],
  ["Blog & trang tĩnh", "Bài tư vấn, giới thiệu, FAQ, chính sách, liên hệ"],
  ["Footer", "Thông tin cửa hàng, menu nhanh, social, newsletter"]
];

function money(value) { return currency.format(Number(value || 0)); }
function date(value) { return value ? dateFormat.format(new Date(value)) : "-"; }
function safeSet(selector, value) { const el = $(selector); if (el) el.textContent = value; }
function safeHtml(selector, value) { const el = $(selector); if (el) el.innerHTML = value; }
function toast(message) {
  const el = $("#adminToast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
function imageOf(product) { return product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url || ""; }
function productState(product) {
  if (!product.is_active) return ["Đang ẩn", "danger", "inactive"];
  if (!product.published_at) return ["Bản nháp", "warn", "draft"];
  return ["Đang bán", "", "active"];
}
function badge(text, cls = "") { return `<span class="badge ${cls}">${text}</span>`; }
function empty(cols, text) { return `<tr><td colspan="${cols}" class="muted">${text}</td></tr>`; }
function compact(item, table, title, sub = "", idField = "id") {
  return `<article class="compact-item"><div><strong>${title || "-"}</strong><small>${sub || "-"}</small></div><div class="compact-actions"><button data-fill='${encodeURIComponent(JSON.stringify(item))}' data-fill-table="${table}">Sửa</button><button class="danger" data-delete-table="${table}" data-delete-id="${item[idField]}">Xóa</button></div></article>`;
}

async function api(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { message = (await res.json()).error || message; } catch (error) {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}
async function table(name, params = "") {
  const result = await api(`/api/admin-data/${name}${params}`);
  return result.data || [];
}
function setApi(ok, label) {
  safeSet("#apiStatus", label);
  const status = $("#apiStatus");
  if (status) status.className = ok ? "ok" : "bad";
  safeSet("#heroApiStatus", label);
  const hero = $("#heroApiStatus");
  if (hero) hero.className = ok ? "ok" : "bad";
  safeSet("#apiBaseLabel", apiBase);
}

async function loadAll() {
  setApi(false, "Đang tải");
  try {
    const [health, summary, products, categories, orders, customers, posts, postCategories, pages, banners, contacts, newsletters, coupons, shippingMethods, paymentMethods, reviews, menus, menuItems, settings, media, variants, movements, customerAddresses, productImages] = await Promise.all([
      api("/health"), api("/api/admin/summary"), api("/api/products"), api("/api/categories"), api("/api/orders"), api("/api/customers"),
      api("/api/posts"), table("post_categories"), api("/api/pages"), api("/api/banners"), table("contacts"),
      table("newsletter_subscribers"), table("coupons"), table("shipping_methods"), table("payment_methods"), table("reviews"),
      table("menus"), table("menu_items"), table("app_settings"), api("/api/storage/files?prefix=products"), table("product_variants"),
      table("inventory_movements"), table("customer_addresses"), table("product_images")
    ]);
    Object.assign(state, { summary, products, categories, orders, customers, posts, postCategories, pages, banners, contacts, newsletters, coupons, shippingMethods, paymentMethods, reviews, menus, menuItems, settings, media, variants, movements, customerAddresses, productImages });
    setApi(Boolean(health.supabase), health.supabase ? "Đã kết nối" : "Thiếu cấu hình");
    renderAll();
  } catch (error) {
    setApi(false, "Lỗi kết nối");
    toast(`Không tải được admin: ${error.message}`);
  }
}

function renderMetrics() {
  safeSet('[data-metric="products"]', state.summary.products || state.products.length);
  safeSet('[data-metric="categories"]', state.summary.categories || state.categories.length);
  safeSet('[data-metric="orders"]', state.summary.orders || state.orders.length);
  safeSet('[data-metric="content"]', (state.summary.posts || 0) + (state.summary.pages || 0) + (state.summary.banners || 0));
}
function renderDashboard() {
  safeHtml("#siteMap", siteSections.map(([title, desc]) => `<article class="site-node"><strong>${title}</strong><small>${desc}</small></article>`).join(""));
  const tasks = [
    ["Sản phẩm chưa có ảnh", state.products.filter((p) => !imageOf(p)).length],
    ["Liên hệ mới", state.summary.newContacts || 0],
    ["Sản phẩm tồn kho thấp", state.products.filter((p) => Number(p.stock_quantity || 0) <= 5).length],
    ["Banner đang bật", state.banners.filter((b) => b.is_active).length],
    ["Người đăng ký newsletter", state.newsletters.length]
  ];
  safeHtml("#taskList", tasks.map(([label, value]) => `<li><span>${label}</span><strong>${value}</strong></li>`).join(""));
}
function renderCategoryOptions() {
  const options = state.categories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join("");
  safeHtml("#productCategory", options || `<option value="">Chưa có danh mục</option>`);
  safeHtml("#productCategoryFilter", `<option value="">Tất cả danh mục</option>${options}`);
}
function renderProductSelectors() {
  const options = state.products.map((product) => `<option value="${product.id}">${product.name}</option>`).join("");
  ["#variantProduct", "#inventoryProduct"].forEach((selector) => safeHtml(selector, options || `<option value="">Chưa có sản phẩm</option>`));
}
function filteredProducts() {
  const q = ($("#globalSearch")?.value || "").trim().toLowerCase();
  const category = $("#productCategoryFilter")?.value || "";
  const status = $("#productStatusFilter")?.value || "";
  return state.products.filter((p) => {
    const text = `${p.name} ${p.sku || ""} ${p.category?.name || ""}`.toLowerCase();
    return (!q || text.includes(q)) && (!category || p.category_id === category) && (!status || productState(p)[2] === status);
  });
}
function renderProducts() {
  if (!$("#productsBody")) return;
  const rows = filteredProducts();
  safeSet("#productListMeta", `${rows.length} sản phẩm`);
  safeHtml("#productsBody", rows.map((p) => {
    const [label, cls] = productState(p);
    const img = imageOf(p);
    return `<tr><td><div class="product-cell">${img ? `<img class="thumb" src="${img}" alt="${p.name}">` : `<span class="thumb thumb-empty">TH</span>`}<div><strong>${p.name}</strong><small>${p.sku || "Chưa có SKU"}</small></div></div></td><td>${p.category?.name || "-"}</td><td>${money(p.price)}</td><td>${p.stock_quantity || 0}</td><td>${badge(label, cls)}</td><td><div class="row-actions"><button data-edit-product="${p.id}">Sửa</button><button class="danger" data-delete-product="${p.id}">Xóa</button></div></td></tr>`;
  }).join("") || empty(6, "Không tìm thấy sản phẩm"));
  safeHtml("#inventoryBody", state.products.map((p) => `<tr><td>${p.name}</td><td>${p.sku || "-"}</td><td>${p.stock_quantity || 0}</td><td>${Number(p.stock_quantity || 0) <= 5 ? badge("Sắp hết", "warn") : badge("Ổn")}</td></tr>`).join("") || empty(4, "Chưa có tồn kho"));
}
function renderVariants() {
  if (!$("#variantList")) return;
  const productName = (id) => state.products.find((product) => product.id === id)?.name || "Sản phẩm";
  safeHtml("#variantList", state.variants.slice(0, 10).map((variant) => compact(variant, "product_variants", variant.name, `${productName(variant.product_id)} - ${variant.sku || "chưa có SKU"} - tồn ${variant.stock_quantity || 0}`)).join("") || `<p class="muted">Chưa có biến thể sản phẩm</p>`);
}
function renderInventoryMovements() {
  if (!$("#inventoryMovementList")) return;
  const productName = (id) => state.products.find((product) => product.id === id)?.name || "Sản phẩm";
  safeHtml("#inventoryMovementList", state.movements.slice(0, 10).map((item) => compact(item, "inventory_movements", `${item.movement_type} ${item.quantity}`, `${productName(item.product_id)} - ${item.note || "không ghi chú"}`)).join("") || `<p class="muted">Chưa có phiếu kho</p>`);
}
function renderOrders() {
  if (!$("#ordersBody")) return;
  const orderStatusOptions = ["pending", "confirmed", "packing", "shipping", "completed", "cancelled", "refunded"];
  const paymentOptions = ["unpaid", "paid", "failed", "refunded"];
  safeSet("#orderListMeta", `${state.orders.length} đơn`);
  safeHtml("#ordersBody", state.orders.map((o) => `<tr>
    <td>${o.order_number || "-"}</td><td>${o.customer_name || "-"}</td><td>${o.customer_phone || "-"}</td><td>${money(o.grand_total)}</td>
    <td><select class="table-select" data-payment-for="${o.id}">${paymentOptions.map((item) => `<option value="${item}" ${item === o.payment_status ? "selected" : ""}>${item}</option>`).join("")}</select></td>
    <td><select class="table-select" data-status-for="${o.id}">${orderStatusOptions.map((item) => `<option value="${item}" ${item === o.status ? "selected" : ""}>${item}</option>`).join("")}</select></td>
    <td>${date(o.created_at)}</td><td><button class="mini-btn" data-update-order="${o.id}">Lưu</button></td>
  </tr>`).join("") || empty(8, "Chưa có đơn hàng"));
}
function renderCustomers() {
  if (!$("#customersBody")) return;
  safeSet("#customerListMeta", `${state.customers.length} khách`);
  safeHtml("#customersBody", state.customers.map((c) => `<tr><td>${c.full_name || "-"}</td><td>${c.phone || "-"}</td><td>${c.email || "-"}</td><td>${c.note || "-"}</td></tr>`).join("") || empty(4, "Chưa có khách hàng"));
}
function renderGenericLists() {
  safeHtml("#categoryList", state.categories.map((x) => compact(x, "product_categories", x.name, x.description)).join("") || `<p class="muted">Chưa có danh mục</p>`);
  safeHtml("#couponList", state.coupons.map((x) => compact(x, "coupons", x.code, `${x.name} - ${x.discount_type}: ${x.discount_value}`)).join("") || `<p class="muted">Chưa có coupon</p>`);
  safeHtml("#paymentShippingList", [...state.shippingMethods.map((x) => compact(x, "shipping_methods", x.name, `Phí ${money(x.fee)}`)), ...state.paymentMethods.map((x) => compact(x, "payment_methods", x.name, x.code))].join("") || `<p class="muted">Chưa có cấu hình</p>`);
  safeHtml("#postList", state.posts.map((x) => compact(x, "posts", x.title, x.excerpt || x.slug)).join("") || `<p class="muted">Chưa có bài viết</p>`);
  safeHtml("#postCategoryList", state.postCategories.map((x) => compact(x, "post_categories", x.name, x.description)).join("") || `<p class="muted">Chưa có chuyên mục</p>`);
  safeHtml("#bannerList", state.banners.map((x) => compact(x, "banners", x.title, `${x.position || "home"} - ${x.is_active ? "đang bật" : "đang tắt"}`)).join("") || `<p class="muted">Chưa có banner</p>`);
  safeHtml("#newsletterList", `<h3 class="subhead">Đăng ký nhận tin</h3>` + (state.newsletters.map((x) => compact(x, "newsletter_subscribers", x.email, x.status)).join("") || `<p class="muted">Chưa có subscriber</p>`));
  safeHtml("#contactList", `<h3 class="subhead">Liên hệ</h3>` + (state.contacts.map((x) => compact(x, "contacts", x.full_name, `${x.phone || ""} ${x.message || ""}`)).join("") || `<p class="muted">Chưa có liên hệ</p>`));
  safeHtml("#reviewList", state.reviews.map((x) => compact(x, "reviews", `${x.customer_name || "Khách"} - ${x.rating || 5}/5`, x.comment)).join("") || `<p class="muted">Chưa có đánh giá</p>`);
  safeHtml("#pageList", state.pages.map((x) => compact(x, "pages", x.title, x.slug)).join("") || `<p class="muted">Chưa có trang</p>`);
  safeHtml("#menuList", [...state.menus.map((x) => compact(x, "menus", x.name, x.slug)), ...state.menuItems.map((x) => compact(x, "menu_items", x.label, x.url))].join("") || `<p class="muted">Chưa có menu</p>`);
  safeHtml("#customerCompactList", state.customers.map((x) => compact(x, "customers", x.full_name || x.email || x.phone, `${x.phone || ""} ${x.email || ""} ${x.note || ""}`)).join("") || `<p class="muted">Chưa có khách hàng</p>`);
  safeHtml("#customerAddressList", state.customerAddresses.map((x) => compact(x, "customer_addresses", x.receiver_name || x.address_line || x.customer_id, `${x.phone || ""} ${x.address_line || ""} ${x.province || ""}`)).join("") || `<p class="muted">Chưa có địa chỉ</p>`);
  safeHtml("#contactManageList", state.contacts.map((x) => compact(x, "contacts", x.full_name || x.email || x.phone, `${x.status || "new"} - ${x.subject || ""} ${x.message || ""}`)).join("") || `<p class="muted">Chưa có liên hệ</p>`);
  safeHtml("#newsletterManageList", state.newsletters.map((x) => compact(x, "newsletter_subscribers", x.email, x.status)).join("") || `<p class="muted">Chưa có newsletter</p>`);
  safeHtml("#reviewManageList", state.reviews.map((x) => compact(x, "reviews", `${x.customer_name || "Khách"} - ${x.rating || 5}/5`, `${x.is_approved ? "Đã duyệt" : "Chưa duyệt"} - ${x.comment || ""}`)).join("") || `<p class="muted">Chưa có đánh giá</p>`);
  safeHtml("#productImageList", state.productImages.map((x) => compact(x, "product_images", x.alt_text || x.url, `${x.is_primary ? "Ảnh chính" : "Ảnh phụ"} - ${x.url || ""}`)).join("") || `<p class="muted">Chưa có ảnh sản phẩm</p>`);
}
function renderMedia() {
  if (!$("#mediaGrid")) return;
  safeHtml("#mediaGrid", state.media.filter((x) => x.name && !x.name.endsWith("/")).map((x) => `<article class="media-card"><img src="${x.publicUrl}" alt="${x.name}"><span>${x.name}</span></article>`).join("") || `<p class="muted">Chưa có file trong thư mục products</p>`);
}
function renderSettings() {
  const form = $("#storeSettingsForm");
  if (!form) return;
  const store = state.settings.find((x) => x.key === "store")?.value || {};
  Object.entries(store).forEach(([key, value]) => {
    const input = form.elements[key];
    if (input) input.value = value || "";
  });
}
function renderAll() {
  renderMetrics();
  renderDashboard();
  renderCategoryOptions();
  renderProductSelectors();
  renderProducts();
  renderVariants();
  renderInventoryMovements();
  renderOrders();
  renderCustomers();
  renderGenericLists();
  renderMedia();
  renderSettings();
}

function dateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function collect(form) {
  const data = {};
  new FormData(form).forEach((value, key) => { data[key] = value; });
  form.querySelectorAll('input[type="checkbox"][name]').forEach((input) => { data[input.name] = input.checked; });
  form.querySelectorAll('input[type="number"][name]').forEach((input) => { if (input.value !== "") data[input.name] = Number(input.value); });
  return data;
}
async function saveGeneric(form) {
  const tableName = form.dataset.genericForm;
  const id = form.dataset.editId;
  const payload = collect(form);
  if (tableName === "menu_items" && !payload.menu_id && state.menus[0]) payload.menu_id = state.menus[0].id;
  const method = id ? "PUT" : "POST";
  const path = id ? `/api/admin-data/${tableName}/${id}` : `/api/admin-data/${tableName}`;
  await api(path, { method, body: JSON.stringify(payload) });
  form.reset();
  delete form.dataset.editId;
  await loadAll();
  toast(id ? "Đã cập nhật" : "Đã thêm mới");
}
function fillGeneric(tableName, item) {
  const form = document.querySelector(`[data-generic-form="${tableName}"]`);
  if (!form) return;
  form.dataset.editId = item.key || item.id;
  Object.entries(item).forEach(([key, value]) => {
    const input = form.elements[key];
    if (!input) return;
    if (input.type === "checkbox") input.checked = Boolean(value);
    else if (input.type === "datetime-local") input.value = dateTimeLocalValue(value);
    else input.value = value ?? "";
  });
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}
async function deleteGeneric(tableName, id) {
  if (!confirm("Xóa mục này?")) return;
  await api(`/api/admin-data/${tableName}/${id}`, { method: "DELETE" });
  await loadAll();
  toast("Đã xóa");
}
function resetProductForm() {
  const form = $("#productForm");
  if (!form) return;
  form.reset();
  $("#productId").value = "";
  $("#productImageUrl").value = "";
  const preview = $("#imagePreview");
  if (preview) preview.hidden = true;
  safeSet("#productFormTitle", "Thêm sản phẩm");
  if (state.categories[0]) $("#productCategory").value = state.categories[0].id;
}
function fillProduct(p) {
  if (!p || !$("#productForm")) return;
  $("#productId").value = p.id;
  $("#productName").value = p.name || "";
  $("#productCategory").value = p.category_id || "";
  $("#productSku").value = p.sku || "";
  $("#productPrice").value = p.price || 0;
  $("#productComparePrice").value = p.compare_at_price || "";
  $("#productStock").value = p.stock_quantity || 0;
  $("#productUnit").value = p.unit || "";
  $("#productBrand").value = p.brand || "";
    if ($("#productAgeRange")) $("#productAgeRange").value = p.age_range || "";
  if ($("#productOrigin")) $("#productOrigin").value = p.origin || "";
  if ($("#productTags")) $("#productTags").value = Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || "");
$("#productStatus").value = productState(p)[2];
  $("#productShortDescription").value = p.short_description || "";
  $("#productDescription").value = p.description || "";
  $("#productFeatured").checked = Boolean(p.is_featured);
  const img = imageOf(p);
  $("#productImageUrl").value = img;
  if (img && $("#imagePreview")) {
    $("#imagePreview").src = img;
    $("#imagePreview").hidden = false;
  }
  safeSet("#productFormTitle", "Sửa sản phẩm");
  $("#productForm").scrollIntoView({ behavior: "smooth", block: "start" });
}
function fileData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function uploadFile(file) {
  const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const body = { path: `products/${Date.now()}-${cleanName}`, fileBase64: await fileData(file), contentType: file.type };
  return api("/api/storage/upload", { method: "POST", body: JSON.stringify(body) });
}
async function saveProduct(event) {
  event.preventDefault();
  const id = $("#productId").value;
  const btn = $("#saveProductBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Đang lưu..."; }
  try {
    const file = $("#productImage")?.files[0];
    const uploaded = file ? await uploadFile(file) : null;
    const payload = {
      name: $("#productName").value.trim(),
      category_id: $("#productCategory").value,
      sku: $("#productSku").value.trim(),
      price: Number($("#productPrice").value || 0),
      compare_at_price: $("#productComparePrice").value ? Number($("#productComparePrice").value) : null,
      stock_quantity: Number($("#productStock").value || 0),
      unit: $("#productUnit").value || "hop",
      brand: $("#productBrand").value,
            age_range: $("#productAgeRange")?.value || null,
      origin: $("#productOrigin")?.value || null,
      tags: ($("#productTags")?.value || "").split(",").map((tag) => tag.trim()).filter(Boolean),
status: $("#productStatus").value,
      short_description: $("#productShortDescription").value,
      description: $("#productDescription").value,
      is_featured: $("#productFeatured").checked,
      image_url: uploaded?.publicUrl || $("#productImageUrl").value
    };
    await api(id ? `/api/products/${id}` : "/api/products", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    resetProductForm();
    await loadAll();
    toast("Đã lưu sản phẩm");
  } catch (error) {
    toast(`Không lưu được: ${error.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Lưu sản phẩm"; }
  }
}
async function deleteProduct(id) {
  if (!confirm("Xóa sản phẩm này?")) return;
  await api(`/api/products/${id}`, { method: "DELETE" });
  await loadAll();
  toast("Đã xóa sản phẩm");
}
async function saveStoreSettings(event) {
  event.preventDefault();
  const value = collect(event.currentTarget);
  const payload = { key: "store", value, description: "Thông tin cửa hàng" };
  try {
    await api("/api/admin-data/app_settings/store", { method: "PUT", body: JSON.stringify(payload) });
  } catch (error) {
    await api("/api/admin-data/app_settings", { method: "POST", body: JSON.stringify(payload) });
  }
  await loadAll();
  toast("Đã lưu thông tin cửa hàng");
}
async function uploadMedia() {
  const file = $("#mediaFile")?.files[0];
  if (!file) return toast("Chọn ảnh trước");
  const uploaded = await uploadFile(file);
  await loadAll();
  toast(`Đã upload ${uploaded.path}`);
}
async function saveVariant(event) {
  event.preventDefault();
  const payload = {
    product_id: $("#variantProduct").value,
    name: $("#variantName").value.trim(),
    sku: $("#variantSku").value.trim() || null,
    price: $("#variantPrice").value ? Number($("#variantPrice").value) : null,
    stock_quantity: Number($("#variantStock").value || 0),
    is_active: true
  };
  await api("/api/admin-data/product_variants", { method: "POST", body: JSON.stringify(payload) });
  event.currentTarget.reset();
  await loadAll();
  toast("Đã lưu biến thể sản phẩm");
}
async function saveInventoryMovement(event) {
  event.preventDefault();
  const productId = $("#inventoryProduct").value;
  const type = $("#inventoryType").value;
  const quantity = Number($("#inventoryQuantity").value || 0);
  await api("/api/admin-data/inventory_movements", { method: "POST", body: JSON.stringify({ product_id: productId, movement_type: type, quantity, note: $("#inventoryNote").value.trim() }) });
  const product = state.products.find((item) => item.id === productId);
  if (product && ["import", "export", "adjustment"].includes(type)) {
    const nextStock = type === "import" ? Number(product.stock_quantity || 0) + quantity : type === "export" ? Math.max(0, Number(product.stock_quantity || 0) - quantity) : quantity;
    await api(`/api/products/${productId}`, { method: "PUT", body: JSON.stringify({ ...product, status: productState(product)[2], stock_quantity: nextStock }) });
  }
  event.currentTarget.reset();
  await loadAll();
  toast("Đã lưu phiếu kho");
}
async function updateOrderStatus(orderId) {
  const status = document.querySelector(`[data-status-for="${orderId}"]`)?.value;
  const payment_status = document.querySelector(`[data-payment-for="${orderId}"]`)?.value;
  await api(`/api/orders/${orderId}/status`, { method: "PUT", body: JSON.stringify({ status, payment_status }) });
  await loadAll();
  toast("Đã cập nhật đơn hàng");
}

function bindEvents() {
  $$(".admin-nav a").forEach((link) => link.classList.toggle("active", link.dataset.page === document.body.dataset.adminPage));
  if ($("#apiBaseInput")) $("#apiBaseInput").value = apiBase;
  $("#reloadBtn")?.addEventListener("click", loadAll);
  $("#saveApiBaseBtn")?.addEventListener("click", () => {
    apiBase = ($("#apiBaseInput")?.value || defaultApiBase).replace(/\/$/, "") || defaultApiBase;
    localStorage.setItem("thanhHauApiBase", apiBase);
    loadAll();
  });
  $("#productForm")?.addEventListener("submit", saveProduct);
  $("#resetProductForm")?.addEventListener("click", resetProductForm);
  $("#newProductBtn")?.addEventListener("click", resetProductForm);
  $("#productCategoryFilter")?.addEventListener("change", renderProducts);
  $("#productStatusFilter")?.addEventListener("change", renderProducts);
  $("#globalSearch")?.addEventListener("input", () => { renderProducts(); renderGenericLists(); });
  $("#storeSettingsForm")?.addEventListener("submit", saveStoreSettings);
  $("#variantForm")?.addEventListener("submit", async (event) => { try { await saveVariant(event); } catch (error) { toast(`Không lưu được biến thể: ${error.message}`); } });
  $("#inventoryForm")?.addEventListener("submit", async (event) => { try { await saveInventoryMovement(event); } catch (error) { toast(`Không lưu được phiếu kho: ${error.message}`); } });
  $("#uploadMediaBtn")?.addEventListener("click", uploadMedia);
  $("#reloadMediaBtn")?.addEventListener("click", loadAll);
  $("#productImage")?.addEventListener("change", async () => {
    const file = $("#productImage").files[0];
    if (!file) return;
    $("#imagePreview").src = await fileData(file);
    $("#imagePreview").hidden = false;
  });
  $("#mediaFile")?.addEventListener("change", async () => {
    const file = $("#mediaFile").files[0];
    if (!file) return;
    $("#mediaPreview").src = await fileData(file);
    $("#mediaPreview").hidden = false;
  });
  $$("[data-generic-form]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try { await saveGeneric(form); } catch (error) { toast(`Không lưu được: ${error.message}`); }
  }));
  document.addEventListener("click", (event) => {
    const editProduct = event.target.closest("[data-edit-product]");
    if (editProduct) fillProduct(state.products.find((p) => p.id === editProduct.dataset.editProduct));
    const deleteProductButton = event.target.closest("[data-delete-product]");
    if (deleteProductButton) deleteProduct(deleteProductButton.dataset.deleteProduct);
    const fill = event.target.closest("[data-fill]");
    if (fill) fillGeneric(fill.dataset.fillTable, JSON.parse(decodeURIComponent(fill.dataset.fill)));
    const del = event.target.closest("[data-delete-table]");
    if (del) deleteGeneric(del.dataset.deleteTable, del.dataset.deleteId);
    const updateOrder = event.target.closest("[data-update-order]");
    if (updateOrder) updateOrderStatus(updateOrder.dataset.updateOrder);
  });
}

bindEvents();
loadAll();








