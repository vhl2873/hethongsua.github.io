"use strict";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const defaultState = {
  products: [
    {
      id: 1,
      name: "Sữa bột dinh dưỡng 800g",
      category: "Sữa bột",
      price: 289000,
      stock: 42,
      status: "Đang bán",
      description: "Sản phẩm dinh dưỡng phù hợp cho trẻ nhỏ và gia đình."
    },
    {
      id: 2,
      name: "Sữa tươi tiệt trùng ít đường",
      category: "Sữa tươi",
      price: 120000,
      stock: 86,
      status: "Đang bán",
      description: "Lốc sữa tươi tiện lợi cho nhu cầu hằng ngày."
    },
    {
      id: 3,
      name: "Sữa chua uống cho bé",
      category: "Sữa chua",
      price: 195000,
      stock: 24,
      status: "Đang bán",
      description: "Hỗ trợ bổ sung lợi khuẩn và năng lượng."
    },
    {
      id: 4,
      name: "Bỉm em bé cao cấp",
      category: "Mẹ và bé",
      price: 315000,
      stock: 9,
      status: "Đang bán",
      description: "Sản phẩm mẹ và bé bán kèm trong siêu thị sữa."
    }
  ],
  orders: [
    {
      id: "DH-1024",
      customer: "Nguyễn Thị Lan",
      items: "Sữa bột dinh dưỡng 800g",
      date: "02/07/2026",
      status: "Chờ xác nhận",
      total: 604000
    },
    {
      id: "DH-1023",
      customer: "Trần Minh Hải",
      items: "Sữa tươi tiệt trùng ít đường",
      date: "02/07/2026",
      status: "Đang giao",
      total: 240000
    },
    {
      id: "DH-1022",
      customer: "Phạm Thu Hà",
      items: "Sữa chua uống cho bé",
      date: "01/07/2026",
      status: "Hoàn tất",
      total: 390000
    }
  ],
  posts: [
    {
      title: "Cách chọn sữa phù hợp cho từng độ tuổi",
      category: "Tư vấn chọn sữa",
      updated: "02/07/2026",
      status: "Đã đăng"
    },
    {
      title: "Bảo quản sữa đúng cách trong mùa nóng",
      category: "Dinh dưỡng gia đình",
      updated: "30/06/2026",
      status: "Đã đăng"
    },
    {
      title: "Những lưu ý khi chọn sản phẩm mẹ và bé",
      category: "Mẹ và bé",
      updated: "28/06/2026",
      status: "Nháp"
    }
  ],
  customers: [
    {
      name: "Nguyễn Thị Lan",
      phone: "0901 234 567",
      group: "Khách thân thiết",
      orders: 8,
      spent: 4820000
    },
    {
      name: "Trần Minh Hải",
      phone: "0912 345 678",
      group: "Khách mới",
      orders: 2,
      spent: 680000
    },
    {
      name: "Phạm Thu Hà",
      phone: "0987 654 321",
      group: "Khách thân thiết",
      orders: 5,
      spent: 2240000
    }
  ]
};

const pages = [
  ["Trang chủ", "index.html"],
  ["Sản phẩm", "shop.html"],
  ["Chi tiết sản phẩm", "product-details.html"],
  ["Giỏ hàng", "cart.html"],
  ["Thanh toán", "checkout.html"],
  ["So sánh sản phẩm", "compare.html"],
  ["Yêu thích", "wishlist.html"],
  ["Góc tư vấn", "blog.html"],
  ["Chi tiết bài viết", "blog-details.html"],
  ["Giới thiệu", "about.html"],
  ["Liên hệ", "contact.html"],
  ["Tài khoản", "my-account.html"],
  ["Đăng nhập", "login.html"],
  ["Câu hỏi thường gặp", "faq.html"],
  ["Chính sách bảo mật", "privacy-policy.html"],
  ["Hình ảnh cửa hàng", "portfolio.html"],
  ["Không tìm thấy trang", "404.html"]
];

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem("thanhHauAdminState");
    return saved ? JSON.parse(saved) : structuredClone(defaultState);
  } catch (error) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem("thanhHauAdminState", JSON.stringify(state));
}

function formatMoney(value) {
  return currency.format(Number(value || 0));
}

function statusClass(status) {
  if (["Hoàn tất", "Đã đăng", "Đang bán"].includes(status)) return "success";
  if (["Chờ xác nhận", "Nháp"].includes(status)) return "warning";
  if (["Đã hủy", "Hết hàng", "Ẩn"].includes(status)) return "danger";
  return "";
}

function showToast(message) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function switchTab(tabId) {
  document.querySelectorAll(".admin-nav__item").forEach((item) => {
    item.classList.toggle("active", item.dataset.adminTab === tabId);
  });
  document.querySelectorAll(".admin-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  const activePanel = document.getElementById(tabId);
  document.getElementById("adminPageTitle").textContent = activePanel.dataset.panelTitle || "Quản trị";
}

function renderMetrics() {
  document.getElementById("productCountMetric").textContent = state.products.length;
  document.getElementById("orderCountMetric").textContent = state.orders.filter((order) => order.status !== "Hoàn tất").length;
  document.getElementById("customerCountMetric").textContent = state.customers.length;
}

function renderRecentOrders() {
  const body = document.getElementById("recentOrdersBody");
  body.innerHTML = state.orders.slice(0, 4).map((order) => `
    <tr>
      <td>${order.id}</td>
      <td>${order.customer}</td>
      <td><span class="status-badge ${statusClass(order.status)}">${order.status}</span></td>
      <td>${formatMoney(order.total)}</td>
    </tr>
  `).join("");
}

function renderProducts() {
  const body = document.getElementById("productsBody");
  const category = document.getElementById("productCategoryFilter").value;
  const query = document.getElementById("globalSearch").value.trim().toLowerCase();
  const products = state.products.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesQuery = !query || `${product.name} ${product.category} ${product.status}`.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  body.innerHTML = products.map((product) => `
    <tr>
      <td>
        <strong>${product.name}</strong>
        <br><small>${product.description || "Chưa có mô tả"}</small>
      </td>
      <td>${product.category}</td>
      <td>${formatMoney(product.price)}</td>
      <td>${product.stock}</td>
      <td><span class="status-badge ${statusClass(product.status)}">${product.status}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" data-edit-product="${product.id}">Sửa</button>
          <button type="button" data-delete-product="${product.id}">Xóa</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderOrders() {
  const body = document.getElementById("ordersBody");
  const status = document.getElementById("orderStatusFilter").value;
  const query = document.getElementById("globalSearch").value.trim().toLowerCase();
  const orders = state.orders.filter((order) => {
    const matchesStatus = !status || order.status === status;
    const matchesQuery = !query || `${order.id} ${order.customer} ${order.items} ${order.status}`.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  body.innerHTML = orders.map((order) => `
    <tr>
      <td>${order.id}</td>
      <td>${order.customer}</td>
      <td>${order.items}</td>
      <td>${order.date}</td>
      <td><span class="status-badge ${statusClass(order.status)}">${order.status}</span></td>
      <td>${formatMoney(order.total)}</td>
      <td>
        <div class="row-actions">
          <button type="button" data-next-order="${order.id}">Đổi trạng thái</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderPosts() {
  document.getElementById("postsBody").innerHTML = state.posts.map((post) => `
    <tr>
      <td>${post.title}</td>
      <td>${post.category}</td>
      <td>${post.updated}</td>
      <td><span class="status-badge ${statusClass(post.status)}">${post.status}</span></td>
    </tr>
  `).join("");
}

function renderCustomers() {
  document.getElementById("customersBody").innerHTML = state.customers.map((customer) => `
    <tr>
      <td>${customer.name}</td>
      <td>${customer.phone}</td>
      <td>${customer.group}</td>
      <td>${customer.orders}</td>
      <td>${formatMoney(customer.spent)}</td>
    </tr>
  `).join("");
}

function renderPages() {
  document.getElementById("pagesGrid").innerHTML = pages.map(([label, href]) => `
    <article class="page-card">
      <strong>${label}</strong>
      <span class="admin-note">${href}</span>
      <a href="${href}" target="_blank" rel="noreferrer">Mở trang</a>
    </article>
  `).join("");
}

function renderAll() {
  renderMetrics();
  renderRecentOrders();
  renderProducts();
  renderOrders();
  renderPosts();
  renderCustomers();
  renderPages();
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("productFormTitle").textContent = "Thêm sản phẩm";
}

function fillProductForm(product) {
  document.getElementById("productId").value = product.id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productCategory").value = product.category;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productStock").value = product.stock;
  document.getElementById("productStatus").value = product.status;
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productFormTitle").textContent = "Sửa sản phẩm";
}

function handleProductSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("productId").value;
  const payload = {
    id: id ? Number(id) : Date.now(),
    name: document.getElementById("productName").value.trim(),
    category: document.getElementById("productCategory").value,
    price: Number(document.getElementById("productPrice").value),
    stock: Number(document.getElementById("productStock").value),
    status: document.getElementById("productStatus").value,
    description: document.getElementById("productDescription").value.trim()
  };

  if (id) {
    state.products = state.products.map((product) => product.id === payload.id ? payload : product);
    showToast("Đã cập nhật sản phẩm");
  } else {
    state.products.unshift(payload);
    showToast("Đã thêm sản phẩm mới");
  }

  saveState();
  resetProductForm();
  renderAll();
}

function nextOrderStatus(orderId) {
  const flow = ["Chờ xác nhận", "Đang giao", "Hoàn tất", "Đã hủy"];
  state.orders = state.orders.map((order) => {
    if (order.id !== orderId) return order;
    const index = flow.indexOf(order.status);
    return { ...order, status: flow[(index + 1) % flow.length] };
  });
  saveState();
  renderAll();
  showToast("Đã đổi trạng thái đơn hàng");
}

document.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-admin-tab]");
  if (tabButton) {
    switchTab(tabButton.dataset.adminTab);
  }

  const jumpButton = event.target.closest("[data-admin-jump]");
  if (jumpButton) {
    switchTab(jumpButton.dataset.adminJump);
  }

  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) {
    const product = state.products.find((item) => item.id === Number(editButton.dataset.editProduct));
    if (product) fillProductForm(product);
  }

  const deleteButton = event.target.closest("[data-delete-product]");
  if (deleteButton) {
    const id = Number(deleteButton.dataset.deleteProduct);
    state.products = state.products.filter((item) => item.id !== id);
    saveState();
    renderAll();
    showToast("Đã xóa sản phẩm khỏi dữ liệu mẫu");
  }

  const orderButton = event.target.closest("[data-next-order]");
  if (orderButton) {
    nextOrderStatus(orderButton.dataset.nextOrder);
  }
});

document.getElementById("productForm").addEventListener("submit", handleProductSubmit);
document.getElementById("resetProductForm").addEventListener("click", resetProductForm);
document.getElementById("productCategoryFilter").addEventListener("change", renderProducts);
document.getElementById("orderStatusFilter").addEventListener("change", renderOrders);
document.getElementById("globalSearch").addEventListener("input", () => {
  renderProducts();
  renderOrders();
});

document.getElementById("exportDataBtn").addEventListener("click", async () => {
  const data = JSON.stringify(state, null, 2);
  try {
    await navigator.clipboard.writeText(data);
    showToast("Đã copy dữ liệu JSON vào clipboard");
  } catch (error) {
    showToast("Không thể copy tự động, hãy dùng trình duyệt hỗ trợ clipboard");
  }
});

renderAll();
