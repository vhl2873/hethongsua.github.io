"use strict";

(function () {
  const defaultApiBase = "http://localhost:3001";
  const apiBase = (localStorage.getItem("thanhHauApiBase") || window.THANH_HAU_API_BASE || defaultApiBase).replace(/\/$/, "");
  const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });
  const fallbackProductImage = "assets/img/product/product1.png";
  const fallbackBlogImage = "assets/img/blog/blog1.png";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { products: [], categories: [], banners: [], posts: [], pages: [], settings: [] };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function text(value, fallback = "") {
    return escapeHtml(value || fallback);
  }

  function active(items) {
    return (items || []).filter((item) => item.is_active !== false);
  }

  function api(path) {
    return fetch(`${apiBase}${path}`).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  }

  function setting(key) {
    return state.settings.find((item) => item.key === key)?.value || {};
  }

  function imageOf(product) {
    return product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url || product.image_url || fallbackProductImage;
  }

  function productUrl(product) {
    return `product-details.html?slug=${encodeURIComponent(product.slug || product.id || "")}`;
  }

  function blogUrl(post) {
    return `blog-details.html?slug=${encodeURIComponent(post.slug || post.id || "")}`;
  }

  function starRating(className = "rating product__rating d-flex") {
    const star = `<li class="rating__list"><span class="rating__list--icon"><svg class="rating__list--icon__svg" xmlns="http://www.w3.org/2000/svg" width="14.105" height="14.732" viewBox="0 0 10.105 9.732"><path d="M9.837,3.5,6.73,3.039,5.338.179a.335.335,0,0,0-.571,0L3.375,3.039.268,3.5a.3.3,0,0,0-.178.514L2.347,6.242,1.813,9.4a.314.314,0,0,0,.464.316L5.052,8.232,7.827,9.712A.314.314,0,0,0,8.292,9.4L7.758,6.242l2.257-2.231A.3.3,0,0,0,9.837,3.5Z" transform="translate(0 -0.018)" fill="currentColor"></path></svg></span></li>`;
    return `<ul class="${className}">${star.repeat(5)}</ul>`;
  }

  function productCard(product, wrapperClass = "col mb-30") {
    const img = imageOf(product);
    const href = productUrl(product);
    const oldPrice = product.compare_at_price ? `<span class="price__divided"></span><span class="old__price">${money.format(product.compare_at_price)}</span>` : "";
    const category = product.category?.name || product.brand || "Sữa dinh dưỡng";
    const badge = product.compare_at_price ? `<div class="product__badge"><span class="product__badge--items sale">Khuyến mãi</span></div>` : "";
    const wrapOpen = wrapperClass ? `<div class="${wrapperClass}">` : "";
    const wrapClose = wrapperClass ? "</div>" : "";

    return `${wrapOpen}<div class="product__items">
      <div class="product__items--thumbnail">
        <a class="product__items--link" href="${href}">
          <img class="product__items--img product__primary--img" src="${img}" alt="${text(product.name, "product-img")}">
          <img class="product__items--img product__secondary--img" src="${img}" alt="${text(product.name, "product-img")}">
        </a>
        ${badge}
      </div>
      <div class="product__items--content">
        <span class="product__items--content__subtitle">${text(category)}</span>
        <h3 class="product__items--content__title h4"><a href="${href}">${text(product.name)}</a></h3>
        <div class="product__items--price"><span class="current__price">${money.format(product.price || 0)}</span>${oldPrice}</div>
        ${starRating()}
        <ul class="product__items--action d-flex">
          <li class="product__items--action__list"><a class="product__items--action__btn add__to--cart" href="cart.html"><svg class="product__items--action__btn--svg" xmlns="http://www.w3.org/2000/svg" width="22.51" height="20.443" viewBox="0 0 14.706 13.534"><path d="M4.738,472.271h7.814a.434.434,0,0,0,.414-.328l1.723-6.316a.466.466,0,0,0-.071-.4.424.424,0,0,0-.344-.179H3.745L3.437,463.6a.435.435,0,0,0-.421-.353H.431a.451.451,0,0,0,0,.9h2.24c.054.257,1.474,6.946,1.555,7.33a1.36,1.36,0,0,0-.779,1.242,1.326,1.326,0,0,0,1.293,1.354h7.812a.452.452,0,0,0,0-.9H4.74a.451.451,0,0,1,0-.9Zm8.966-6.317-1.477,5.414H5.085l-1.149-5.414Z" transform="translate(0 -463.248)" fill="currentColor"></path></svg><span class="add__to--cart__text">+ Thêm vào giỏ</span></a></li>
          <li class="product__items--action__list"><a class="product__items--action__btn" href="wishlist.html"><svg class="product__items--action__btn--svg" xmlns="http://www.w3.org/2000/svg" width="25.51" height="23.443" viewBox="0 0 512 512"><path d="M352.92 80C288 80 256 144 256 144s-32-64-96.92-64c-52.76 0-94.54 44.14-95.08 96.81-1.1 109.33 86.73 187.08 183 252.42a16 16 0 0018 0c96.26-65.34 184.09-143.09 183-252.42-.54-52.67-42.32-96.81-95.08-96.81z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"></path></svg><span class="visually-hidden">Yêu thích</span></a></li>
          <li class="product__items--action__list"><a class="product__items--action__btn" href="${href}"><svg class="product__items--action__btn--svg" xmlns="http://www.w3.org/2000/svg" width="25.51" height="23.443" viewBox="0 0 512 512"><path d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"></path><circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"></circle></svg><span class="visually-hidden">Xem nhanh</span></a></li>
        </ul>
      </div>
    </div>${wrapClose}`;
  }

  function productSlide(product) {
    return `<div class="swiper-slide">${productCard(product, "")}</div>`;
  }

  function blogItem(post, wrapperClass = "col mb-30") {
    const img = post.image_url || post.thumbnail_url || fallbackBlogImage;
    const href = blogUrl(post);
    const wrapOpen = wrapperClass ? `<div class="${wrapperClass}">` : "";
    const wrapClose = wrapperClass ? "</div>" : "";
    return `${wrapOpen}<article class="blog__items">
      <div class="blog__thumbnail"><a class="blog__thumbnail--link" href="${href}"><img class="blog__thumbnail--img" src="${img}" alt="${text(post.title, "blog-img")}"></a></div>
      <div class="blog__content">
        <span class="blog__content--meta">${post.created_at ? date.format(new Date(post.created_at)) : "Góc tư vấn"}</span>
        <h3 class="blog__content--title"><a href="${href}">${text(post.title)}</a></h3>
        <p class="blog__content--desc">${text(post.excerpt || post.description, "Thông tin tư vấn dinh dưỡng từ Siêu thị sữa Thành Hậu.")}</p>
        <a class="blog__content--btn primary__btn" href="${href}">Đọc thêm</a>
      </div>
    </article>${wrapClose}`;
  }

  function blogSlide(post) {
    return `<div class="swiper-slide">${blogItem(post, "")}</div>`;
  }

  function heroSlide(banner) {
    const title = banner.title || setting("store").name || "Siêu thị sữa Thành Hậu";
    const subtitle = banner.subtitle || banner.description || "Sữa chính hãng cho mẹ, bé và cả gia đình";
    const image = banner.image_url || "assets/img/slider/home1-slider1.png";
    const link = banner.link_url || "shop.html";
    return `<div class="swiper-slide">
      <div class="hero__slider--items home1__slider--bg" style="background-image:url('${image}')">
        <div class="container-fluid">
          <div class="hero__slider--items__inner">
            <div class="row row-cols-1"><div class="col"><div class="slider__content">
              <p class="slider__content--desc desc1 mb-15">${text(subtitle)}</p>
              <h2 class="slider__content--maintitle h1">${text(title)}</h2>
              <p class="slider__content--desc desc2 d-sm-2-none mb-40">Dữ liệu được quản lý từ Supabase.</p>
              <a class="slider__btn primary__btn" href="${link}">Mua ngay</a>
            </div></div></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function bannerItem(banner, index) {
    const image = banner.image_url || `assets/img/banner/banner${(index % 3) + 1}.png`;
    const link = banner.link_url || "shop.html";
    return `<div class="col mb-30"><div class="banner__items position__relative">
      <a class="banner__items--thumbnail" href="${link}"><img class="banner__items--thumbnail__img" src="${image}" alt="${text(banner.title, "banner-img")}"></a>
      <div class="banner__items--content"><span class="banner__items--content__subtitle">${text(banner.subtitle, "Ưu đãi")}</span><h2 class="banner__items--content__title h3">${text(banner.title)}</h2><a class="banner__items--content__link" href="${link}">Mua ngay</a></div>
    </div></div>`;
  }

  function categoryItem(category) {
    const href = `shop.html?category=${encodeURIComponent(category.slug || category.id || "")}`;
    return `<li class="shop__sidebar--widget__categories--menu__list"><a class="shop__sidebar--widget__categories--menu__link" href="${href}">${text(category.name)}</a></li>`;
  }

  function renderHome() {
    const heroBanners = active(state.banners).filter((item) => item.position === "home_hero");
    const heroWrapper = $(".hero__slider--wrapper");
    if (heroWrapper && heroBanners.length) heroWrapper.innerHTML = heroBanners.map(heroSlide).join("");

    const promoBanners = active(state.banners).filter((item) => item.position !== "home_hero").slice(0, 3);
    const bannerRow = $(".banner__section .row");
    if (bannerRow && promoBanners.length) bannerRow.innerHTML = promoBanners.map(bannerItem).join("");

    const featured = state.products.filter((item) => item.is_featured).concat(state.products).filter((item, index, list) => list.findIndex((p) => p.id === item.id) === index);
    const featuredRow = $("#featured .product__section--inner .row");
    if (featuredRow && featured.length) featuredRow.innerHTML = featured.slice(0, 10).map((product) => productCard(product)).join("");

    const firstProductSwiper = $(".product__swiper--activation .swiper-wrapper");
    if (firstProductSwiper && state.products.length) firstProductSwiper.innerHTML = state.products.slice(0, 8).map(productSlide).join("");

    const blogSwiper = $(".blog__section--inner .swiper-wrapper");
    if (blogSwiper && state.posts.length) blogSwiper.innerHTML = state.posts.slice(0, 4).map(blogSlide).join("");
  }

  function renderShop() {
    const row = $("#product_grid .product__section--inner .row");
    if (row) row.innerHTML = state.products.length ? state.products.map((product) => productCard(product)).join("") : `<div class="col"><p>Chưa có sản phẩm trong Supabase.</p></div>`;

    const count = $(".product__showing--count");
    if (count) count.textContent = `Hiển thị ${state.products.length} sản phẩm từ Supabase`;

    const categoryList = $(".shop__sidebar--widget__categories--menu");
    if (categoryList && state.categories.length) categoryList.innerHTML = state.categories.map(categoryItem).join("");
  }

  function renderBlog() {
    const row = $(".blog__section--inner .row");
    if (row) row.innerHTML = state.posts.length ? state.posts.map((post) => blogItem(post)).join("") : `<div class="col"><p>Chưa có bài viết trong Supabase.</p></div>`;
  }

  async function renderProductDetail() {
    if (!location.pathname.includes("product")) return;
    const slug = new URLSearchParams(location.search).get("slug") || state.products[0]?.slug;
    if (!slug) return;

    let product = state.products.find((item) => item.slug === slug || item.id === slug);
    if (!product) {
      try { product = await api(`/api/products/${encodeURIComponent(slug)}`); } catch (error) { product = state.products[0]; }
    }
    if (!product) return;

    const images = product.images?.length ? product.images.map((img) => img.url) : [imageOf(product)];
    const preview = images.map((img) => `<div class="swiper-slide"><div class="product__media--preview__items"><a class="product__media--preview__items--link glightbox" data-gallery="product-media-preview" href="${img}"><img class="product__media--preview__items--img" src="${img}" alt="${text(product.name, "product-media-img")}"></a></div></div>`).join("");
    const nav = images.map((img) => `<div class="swiper-slide"><div class="product__media--nav__items"><img class="product__media--nav__items--img" src="${img}" alt="${text(product.name, "product-nav-img")}"></div></div>`).join("");
    const oldPrice = product.compare_at_price ? `<span class="price__divided"></span><span class="old__price">${money.format(product.compare_at_price)}</span>` : "";

    const section = $(".product__details--section");
    if (!section) return;
    section.innerHTML = `<div class="container"><div class="row row-cols-lg-2 row-cols-md-2">
      <div class="col"><div class="product__details--media">
        <div class="product__media--preview swiper"><div class="swiper-wrapper">${preview}</div></div>
        <div class="product__media--nav swiper"><div class="swiper-wrapper">${nav}</div><div class="swiper__nav--btn swiper-button-next"></div><div class="swiper__nav--btn swiper-button-prev"></div></div>
      </div></div>
      <div class="col"><div class="product__details--info"><form action="#">
        <h2 class="product__details--info__title mb-15">${text(product.name)}</h2>
        <div class="product__details--info__price mb-10"><span class="current__price">${money.format(product.price || 0)}</span>${oldPrice}</div>
        <div class="product__details--info__rating d-flex align-items-center mb-15">${starRating("rating d-flex justify-content-center")}<span class="product__items--rating__count--number">(24)</span></div>
        <p class="product__details--info__desc mb-15">${text(product.short_description || product.description, "Sản phẩm đang được quản lý từ Supabase.")}</p>
        <div class="product__variant">
          <div class="product__variant--list mb-15"><fieldset class="variant__input--fieldset weight"><legend class="product__variant--title mb-8">Quy cách:</legend><input id="weight1" name="weight" type="radio" checked><label class="variant__size--value red" for="weight1">${text(product.unit, "hộp")}</label></fieldset></div>
          <div class="product__variant--list quantity d-flex align-items-center mb-20"><div class="quantity__box"><button type="button" class="quantity__value decrease">-</button><label><input type="number" class="quantity__number" value="1"></label><button type="button" class="quantity__value increase">+</button></div><button class="quickview__cart--btn primary__btn" type="submit">Thêm vào giỏ</button></div>
          <div class="product__variant--list mb-15"><a class="variant__wishlist--icon mb-15" href="wishlist.html" title="Thêm yêu thích">Thêm vào yêu thích</a><button class="variant__buy--now__btn primary__btn" type="submit">Mua ngay</button></div>
          <div class="product__details--info__meta"><p class="product__details--info__meta--list"><strong>SKU:</strong> <span>${text(product.sku, "Đang cập nhật")}</span></p><p class="product__details--info__meta--list"><strong>Thương hiệu:</strong> <span>${text(product.brand, "Thành Hậu")}</span></p><p class="product__details--info__meta--list"><strong>Loại:</strong> <span>${text(product.category?.name, "Sữa dinh dưỡng")}</span></p><p class="product__details--info__meta--list"><strong>Tồn kho:</strong> <span>${text(product.stock_quantity, "0")}</span></p></div>
        </div>
      </form></div></div>
    </div></div>`;
  }

  function renderCommon() {
    const store = setting("store");
    if (store.phone) $$('a[href^="tel:"]').forEach((link) => { link.href = `tel:${store.phone}`; });
    if (store.email) $$('a[href^="mailto:"]').forEach((link) => { link.href = `mailto:${store.email}`; });

    const searchSelects = $$(".header__select--inner");
    searchSelects.forEach((select) => {
      if (!state.categories.length) return;
      select.innerHTML = `<option selected value="">Tất cả danh mục</option>${state.categories.map((cat) => `<option value="${text(cat.slug || cat.id)}">${text(cat.name)}</option>`).join("")}`;
    });
  }

  function currentPage() {
    const path = location.pathname.replace(/\\/g, "/");
    return path.split("/").pop() || "index.html";
  }

  async function load() {
    try {
      const [products, categories, banners, posts, pages, settings] = await Promise.all([
        api("/api/products?public=true"),
        api("/api/categories"),
        api("/api/banners"),
        api("/api/posts?limit=12"),
        api("/api/pages"),
        api("/api/settings")
      ]);

      Object.assign(state, {
        products: active(products),
        categories: active(categories),
        banners: active(banners),
        posts: (posts || []).filter((item) => item.is_published !== false),
        pages: pages || [],
        settings: settings || []
      });

      renderCommon();
      const page = currentPage();
      if (page === "index.html" || page === "") renderHome();
      if (page === "shop.html" || page === "shop-list.html") renderShop();
      if (page === "blog.html") renderBlog();
      await renderProductDetail();
    } catch (error) {
      console.warn("Thanh Hau live render failed", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();

