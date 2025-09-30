const LaundryPOS = (() => {
  const STORAGE_KEY = "laundry-pos-state-v1";
  const viewContainer = document.getElementById("view-container");
  const modalRoot = document.getElementById("modal-root");
  const toastEl = document.getElementById("toast");
  const navButtons = document.querySelectorAll(".nav-btn");
  const importFileInput = document.getElementById("import-file");

  const statusTemplates = [
    { id: "received", label: "Diterima" },
    { id: "washing", label: "Dicuci" },
    { id: "drying", label: "Pengeringan" },
    { id: "ironing", label: "Disetrika" },
    { id: "ready", label: "Siap Diambil" },
    { id: "completed", label: "Selesai" },
  ];

  const clone = (obj) => {
    if (typeof structuredClone === "function") {
      return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
  };

  const defaultState = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    business: {
      name: "Laundry Bersih Sejahtera",
      address: "Jl. Melati No. 12, Jakarta",
      phone: "+62 812-3456-7890",
      email: "info@laundrybersih.id",
      footerNotes: "Terima kasih telah menggunakan layanan kami",
      logoDataUrl: "",
    },
    settings: {
      currency: "Rp",
      taxPercentage: 0,
      statusFlow: statusTemplates,
    },
    outlets: [
      {
        id: generateId("outlet"),
        name: "Outlet Pusat",
        address: "Jl. Melati No. 12, Jakarta",
        phone: "+62 812-3456-7890",
      },
      {
        id: generateId("outlet"),
        name: "Outlet Selatan",
        address: "Jl. Cinere Raya No. 8, Depok",
        phone: "+62 857-9876-5432",
      },
    ],
    services: [
      {
        id: generateId("svc"),
        name: "Cuci Kering Reguler",
        unit: "kg",
        price: 8000,
        category: "Laundry Kiloan",
        description: "Durasi 2 hari kerja",
      },
      {
        id: generateId("svc"),
        name: "Cuci + Setrika Ekspres",
        unit: "kg",
        price: 12000,
        category: "Laundry Kiloan",
        description: "Selesai 12 jam",
      },
      {
        id: generateId("svc"),
        name: "Dry Cleaning Jas",
        unit: "pcs",
        price: 45000,
        category: "Dry Cleaning",
        description: "Termasuk gantungan premium",
      },
    ],
    paymentMethods: [
      { id: generateId("pay"), name: "Tunai", type: "cash", details: "Kasir" },
      { id: generateId("pay"), name: "Transfer BCA", type: "transfer", details: "1234567890 a.n Laundry" },
      { id: generateId("pay"), name: "OVO", type: "ewallet", details: "081234567890" },
    ],
    cashiers: [
      {
        id: generateId("user"),
        name: "Rina",
        outletId: null,
        email: "rina@laundry.id",
        phone: "081234567890",
        role: "manager",
        pin: "1234",
      },
      {
        id: generateId("user"),
        name: "Adi",
        outletId: null,
        email: "",
        phone: "081298765432",
        role: "cashier",
        pin: "4321",
      },
    ],
    customers: [
      {
        id: generateId("cust"),
        name: "Siti Nurhaliza",
        phone: "081234000123",
        email: "",
        address: "Jl. Merpati No. 7",
        notes: "Sering ekspres",
      },
      {
        id: generateId("cust"),
        name: "Budi Santoso",
        phone: "081233344455",
        email: "budi@mail.com",
        address: "Jl. Kenari No. 3",
        notes: "",
      },
    ],
    expenses: [
      {
        id: generateId("exp"),
        outletId: null,
        category: "Detergen",
        description: "Restock detergen cair",
        amount: 350000,
        date: new Date().toISOString(),
      },
    ],
    orders: [],
  };

  // Create initial sample orders
  defaultState.orders = createSampleOrders(defaultState);

  let state = loadState();
  let currentView = "dashboard";

  // ---- Initialization ----
  function init() {
    renderView(currentView);
    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.view;
        if (!target) return;
        currentView = target;
        navButtons.forEach((b) => b.classList.toggle("active", b === btn));
        renderView(target);
      });
    });

    document.getElementById("open-settings").addEventListener("click", () => {
      openReceiptSettings();
    });

    document.getElementById("download-backup").addEventListener("click", downloadBackup);
    document.getElementById("import-backup").addEventListener("click", () => importFileInput.click());
    importFileInput.addEventListener("change", handleImportFile);

    checkPublicStatusView();
  }

  // ---- Rendering ----
  function renderView(view) {
    const renderer = views[view];
    if (!renderer) {
      viewContainer.innerHTML = `<div class="section"><p>Fitur belum tersedia.</p></div>`;
      return;
    }
    viewContainer.innerHTML = renderer.template(state);
    renderer.bind(viewContainer);
  }

  const views = {
    dashboard: {
      template: (data) => {
        const stats = calculateDashboardStats(data);
        const recentOrders = data.orders.slice(-5).reverse();
        return `
          <section class="section">
            <h2>Ringkasan Bisnis</h2>
            <div class="grid three">
              <div class="card">
                <h3>Total Pesanan Bulan Ini</h3>
                <div class="stat-value">${stats.monthOrders}</div>
                <p class="text-muted">${stats.monthCompared}</p>
              </div>
              <div class="card">
                <h3>Pendapatan Kotor</h3>
                <div class="stat-value">${formatCurrency(stats.monthRevenue)}</div>
                <p class="text-muted">${stats.revenueCompared}</p>
              </div>
              <div class="card">
                <h3>Laba Perkiraan</h3>
                <div class="stat-value">${formatCurrency(stats.estimatedProfit)}</div>
                <p class="text-muted">Setelah dikurangi pengeluaran</p>
              </div>
            </div>
          </section>
          <section class="section">
            <h2>Pesanan Terbaru</h2>
            <div class="table-scroll">
              <table class="table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Pelanggan</th>
                    <th>Layanan</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${recentOrders
                    .map((order) => renderOrderRow(order, data))
                    .join("") ||
                  `<tr><td colspan="6">Belum ada pesanan.</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>
        `;
      },
      bind: (root) => {
        root.querySelectorAll("[data-action]").forEach((btn) => {
          btn.addEventListener("click", handleOrderAction);
        });
      },
    },

    orders: {
      template: (data) => {
        const servicesOptions = data.services
          .map((svc) => `<option value="${svc.id}">${svc.name} - ${formatCurrency(svc.price)} / ${svc.unit}</option>`)
          .join("");
        const outfit = data.outlets
          .map((out) => `<option value="${out.id}">${out.name}</option>`)
          .join("");
        const customersOptions = data.customers
          .map((cust) => `<option value="${cust.id}">${cust.name} (${cust.phone || ""})</option>`)
          .join("");
        const cashiersOptions = data.cashiers
          .map((cash) => `<option value="${cash.id}">${cash.name}</option>`)
          .join("");
        const paymentsOptions = data.paymentMethods
          .map((pay) => `<option value="${pay.id}">${pay.name}</option>`)
          .join("");
        return `
          <section class="section">
            <div class="inline-group">
              <h2>Kelola Pesanan</h2>
              <button class="ghost-btn" id="new-order-btn">Buat Nota Manual</button>
            </div>
            <form id="order-form">
              <div class="grid two">
                <div>
                  <label>Pelanggan</label>
                  <select id="order-customer" required>
                    <option value="">Pilih pelanggan</option>
                    ${customersOptions}
                    <option value="__new">+ Pelanggan baru</option>
                  </select>
                </div>
                <div>
                  <label>Outlet</label>
                  <select id="order-outlet" required>
                    ${outfit}
                  </select>
                </div>
                <div>
                  <label>Kasir</label>
                  <select id="order-cashier" required>
                    ${cashiersOptions}
                  </select>
                </div>
                <div>
                  <label>Metode Pembayaran</label>
                  <select id="order-payment" required>
                    ${paymentsOptions}
                  </select>
                </div>
                <div>
                  <label>Tanggal Pengambilan</label>
                  <input type="date" id="order-due-date" value="${today()}" required>
                </div>
                <div id="new-customer-fields" class="hidden">
                  <div class="grid two">
                    <div>
                      <label>Nama Pelanggan Baru</label>
                      <input type="text" id="new-customer-name" placeholder="Nama lengkap">
                    </div>
                    <div>
                      <label>No. WhatsApp</label>
                      <input type="tel" id="new-customer-phone" placeholder="08xxxxxxxx">
                    </div>
                    <div>
                      <label>Alamat</label>
                      <input type="text" id="new-customer-address" placeholder="Alamat singkat">
                    </div>
                    <div>
                      <label>Catatan</label>
                      <input type="text" id="new-customer-notes" placeholder="Preferensi pelanggan">
                    </div>
                  </div>
                </div>
              </div>

              <div class="order-items">
                <div class="inline-group">
                  <div>
                    <label>Pilih Layanan</label>
                    <select id="item-service">
                      <option value="">Pilih layanan</option>
                      ${servicesOptions}
                    </select>
                  </div>
                  <div>
                    <label>Qty/Berat</label>
                    <input type="number" id="item-qty" min="0" step="0.1" placeholder="0">
                  </div>
                  <div>
                    <label>Harga Satuan</label>
                    <input type="number" id="item-price" min="0" step="100" placeholder="0">
                  </div>
                  <div>
                    <label>&nbsp;</label>
                    <button type="button" class="primary-btn" id="add-item-btn">Tambah</button>
                  </div>
                </div>
                <div>
                  <label>Catatan Item</label>
                  <input type="text" id="item-notes" placeholder="Misal: tanpa pewangi">
                </div>
                <div class="table-scroll">
                  <table class="table" id="order-items-table">
                    <thead>
                      <tr>
                        <th>Layanan</th>
                        <th>Qty/Berat</th>
                        <th>Harga</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td colspan="5">Belum ada item.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="grid two">
                <div>
                  <label>Diskon (Rp)</label>
                  <input type="number" id="order-discount" min="0" step="100" value="0">
                </div>
                <div>
                  <label>Biaya Tambahan (Rp)</label>
                  <input type="number" id="order-additional" min="0" step="100" value="0">
                </div>
                <div>
                  <label>Status Awal</label>
                  <select id="order-status">
                    ${state.settings.statusFlow
                      .map((st) => `<option value="${st.id}">${st.label}</option>`)
                      .join("")}
                  </select>
                </div>
                <div>
                  <label>Catatan Pesanan</label>
                  <input type="text" id="order-notes" placeholder="Contoh: ambil sore jam 5">
                </div>
              </div>

              <div class="order-total">
                <span>Total:</span>
                <strong id="order-total">Rp 0</strong>
                <button class="primary-btn" type="submit">Simpan Pesanan</button>
              </div>
            </form>
          </section>
          <section class="section">
            <div class="inline-group">
              <h2>Daftar Pesanan</h2>
              <div class="inline-group">
                <select id="order-filter-status">
                  <option value="">Semua Status</option>
                  ${state.settings.statusFlow
                    .map((st) => `<option value="${st.id}">${st.label}</option>`)
                    .join("")}
                </select>
                <input type="search" id="order-search" placeholder="Cari kode atau pelanggan">
              </div>
            </div>
            <div class="table-scroll">
              <table class="table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Pelanggan</th>
                    <th>Layanan</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="orders-table-body">
                  ${state.orders.length ? state.orders.slice().reverse().map((o) => renderOrderRow(o, state)).join("") : `<tr><td colspan="6">Belum ada pesanan.</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>
        `;
      },
      bind: bindOrdersView,
    },

    customers: {
      template: (data) => {
        return `
          <section class="section">
            <h2>Kelola Pelanggan</h2>
            <form id="customer-form">
              <div class="grid two">
                <div>
                  <label>Nama</label>
                  <input type="text" id="customer-name" required placeholder="Nama pelanggan">
                </div>
                <div>
                  <label>No. WhatsApp</label>
                  <input type="tel" id="customer-phone" placeholder="08xxxxxxxx">
                </div>
                <div>
                  <label>Email</label>
                  <input type="email" id="customer-email" placeholder="opsional">
                </div>
                <div>
                  <label>Alamat</label>
                  <input type="text" id="customer-address" placeholder="Alamat singkat">
                </div>
                <div>
                  <label>Catatan</label>
                  <input type="text" id="customer-notes" placeholder="Catatan preferensi">
                </div>
                <div>
                  <label>&nbsp;</label>
                  <button class="primary-btn" type="submit">Simpan</button>
                </div>
              </div>
            </form>
          </section>
          <section class="section">
            <h2>Daftar Pelanggan</h2>
            <div class="table-scroll">
              <table class="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Kontak</th>
                    <th>Total Pesanan</th>
                    <th>Terakhir</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${data.customers
                    .map((cust) => {
                      const orders = data.orders.filter((o) => o.customerId === cust.id);
                      const lastOrder = orders.length
                        ? formatDateHuman(orders[orders.length - 1].createdAt)
                        : "-";
                      return `
                        <tr>
                          <td>
                            <div class="strong">${cust.name}</div>
                            <small>${cust.address || ""}</small>
                          </td>
                          <td>
                            <div>${cust.phone || ""}</div>
                            <small>${cust.email || ""}</small>
                          </td>
                          <td>${orders.length}</td>
                          <td>${lastOrder}</td>
                          <td>
                            <div class="table-actions">
                              <button class="icon-btn" data-action="view-customer" data-id="${cust.id}">👁️</button>
                              <button class="icon-btn" data-action="delete-customer" data-id="${cust.id}">🗑️</button>
                            </div>
                          </td>
                        </tr>`;
                    })
                    .join("") || `<tr><td colspan="5">Belum ada pelanggan.</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>
        `;
      },
      bind: bindCustomersView,
    },

    outlets: entityManagerView("Outlet", "outlets", [
      { id: "name", label: "Nama Outlet", type: "text", required: true },
      { id: "address", label: "Alamat", type: "text" },
      { id: "phone", label: "Telepon", type: "text" },
    ]),

    services: entityManagerView("Layanan / Produk", "services", [
      { id: "name", label: "Nama Layanan", type: "text", required: true },
      { id: "category", label: "Kategori", type: "text" },
      { id: "unit", label: "Satuan (kg/pcs)", type: "text", required: true },
      { id: "price", label: "Harga", type: "number", required: true },
      { id: "description", label: "Deskripsi", type: "text" },
    ], (item) => `${formatCurrency(item.price)} / ${item.unit}`),

    payments: entityManagerView("Metode Pembayaran", "paymentMethods", [
      { id: "name", label: "Nama Metode", type: "text", required: true },
      { id: "type", label: "Tipe", type: "text" },
      { id: "details", label: "Detail / Nomor Rekening", type: "text" },
    ]),

    cashiers: entityManagerView("Kasir", "cashiers", [
      { id: "name", label: "Nama", type: "text", required: true },
      { id: "phone", label: "Telepon", type: "text" },
      { id: "email", label: "Email", type: "email" },
      { id: "role", label: "Peran", type: "text", required: true },
      { id: "pin", label: "PIN Kasir", type: "text", required: true },
    ], (item) => `${item.role}`),

    expenses: {
      template: (data) => {
        const outlets = data.outlets
          .map((out) => `<option value="${out.id}">${out.name}</option>`)
          .join("");
        return `
          <section class="section">
            <h2>Catat Pengeluaran</h2>
            <form id="expense-form">
              <div class="grid two">
                <div>
                  <label>Tanggal</label>
                  <input type="date" id="expense-date" value="${today()}" required>
                </div>
                <div>
                  <label>Outlet</label>
                  <select id="expense-outlet">
                    <option value="">Semua Outlet</option>
                    ${outlets}
                  </select>
                </div>
                <div>
                  <label>Kategori</label>
                  <input type="text" id="expense-category" placeholder="Contoh: Deterjen" required>
                </div>
                <div>
                  <label>Nominal (Rp)</label>
                  <input type="number" id="expense-amount" min="0" step="1000" required>
                </div>
                <div class="grid" style="grid-template-columns: 1fr">
                  <label>Keterangan</label>
                  <textarea id="expense-notes" placeholder="Detail pengeluaran"></textarea>
                </div>
                <div>
                  <label>&nbsp;</label>
                  <button class="primary-btn" type="submit">Simpan</button>
                </div>
              </div>
            </form>
          </section>
          <section class="section">
            <div class="inline-group">
              <h2>Riwayat Pengeluaran</h2>
              <input type="month" id="expense-filter" value="${currentYearMonth()}">
            </div>
            <div class="table-scroll">
              <table class="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kategori</th>
                    <th>Outlet</th>
                    <th>Nominal</th>
                    <th>Keterangan</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="expense-table">
                  ${renderExpenseRows(data.expenses, data)}
                </tbody>
              </table>
            </div>
          </section>
        `;
      },
      bind: bindExpensesView,
    },

    reports: {
      template: (data) => {
        return `
          <section class="section">
            <h2>Laporan Excel</h2>
            <form id="report-form">
              <div class="grid two">
                <div>
                  <label>Rentang Mulai</label>
                  <input type="date" id="report-start" value="${monthStart()}" required>
                </div>
                <div>
                  <label>Rentang Selesai</label>
                  <input type="date" id="report-end" value="${today()}" required>
                </div>
                <div>
                  <label>Jenis Laporan</label>
                  <select id="report-type">
                    <option value="orders">Pesanan</option>
                    <option value="revenue">Pendapatan</option>
                    <option value="expenses">Pengeluaran</option>
                    <option value="profit">Laba Rugi</option>
                  </select>
                </div>
                <div>
                  <label>&nbsp;</label>
                  <button class="primary-btn" type="submit">Unduh Laporan</button>
                </div>
              </div>
            </form>
          </section>
          <section class="section">
            <h2>Ringkasan</h2>
            <div id="report-preview">Pilih rentang tanggal untuk melihat ringkasan.</div>
          </section>
        `;
      },
      bind: bindReportsView,
    },

    "qr-scanner": {
      template: (data) => {
        const orderOptions = data.orders
          .slice()
          .reverse()
          .map((order) => `<option value="${order.id}">${order.code} - ${resolveCustomer(order.customerId)?.name || ""}</option>`)
          .join("");
        return `
          <section class="section">
            <h2>QR Code & Status Pesanan</h2>
            <div class="grid two">
              <div>
                <label>Pilih Pesanan</label>
                <select id="qr-order-select">
                  <option value="">Pilih pesanan</option>
                  ${orderOptions}
                </select>
                <div class="qr-preview" id="qr-canvas-wrapper">
                  <canvas id="qr-canvas" width="220" height="220"></canvas>
                </div>
                <div id="qr-actions" class="grid" style="grid-template-columns: 1fr">
                  <button class="primary-btn" id="download-qr" disabled>Unduh QR</button>
                  <button class="ghost-btn" id="share-status" disabled>Salin Link Status</button>
                </div>
              </div>
              <div>
                <label>Scanner manual</label>
                <input type="search" id="qr-search" placeholder="Masukkan kode pesanan">
                <div id="qr-result"></div>
              </div>
            </div>
          </section>
        `;
      },
      bind: bindQRView,
    },
  };

  // ---- View binders ----
  function bindOrdersView(root) {
    const form = root.querySelector("#order-form");
    const orderCustomer = form.querySelector("#order-customer");
    const newCustomerFields = form.querySelector("#new-customer-fields");
    const orderItemsTableBody = form.querySelector("#order-items-table tbody");
    const orderTotalEl = form.querySelector("#order-total");
    const discountEl = form.querySelector("#order-discount");
    const additionalEl = form.querySelector("#order-additional");
    const addItemBtn = root.querySelector("#add-item-btn");
    const newOrderBtn = root.querySelector("#new-order-btn");

    let draftItems = [];

    const recalc = () => {
      const subtotal = draftItems.reduce((sum, item) => sum + item.subtotal, 0);
      const total = subtotal - Number(discountEl.value || 0) + Number(additionalEl.value || 0);
      orderTotalEl.textContent = formatCurrency(total);
    };

    const renderItems = () => {
      if (!draftItems.length) {
        orderItemsTableBody.innerHTML = `<tr><td colspan="5">Belum ada item.</td></tr>`;
        recalc();
        return;
      }
      orderItemsTableBody.innerHTML = draftItems
        .map(
          (item) => `<tr data-id="${item.id}">
            <td>
              <div class="strong">${item.name}</div>
              <small>${item.notes || ""}</small>
            </td>
            <td>${item.quantity} ${item.unit}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.subtotal)}</td>
            <td><button class="icon-btn" data-action="remove-item">🗑️</button></td>
          </tr>`
        )
        .join("");
      recalc();
    };

    const resetForm = () => {
      draftItems = [];
      form.reset();
      form.querySelector("#order-due-date").value = today();
      renderItems();
      showToast("Form pesanan baru siap.");
    };

    newOrderBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetForm();
    });

    orderCustomer.addEventListener("change", () => {
      if (orderCustomer.value === "__new") {
        newCustomerFields.classList.remove("hidden");
        form.querySelector("#new-customer-name").focus();
      } else {
        newCustomerFields.classList.add("hidden");
      }
    });

    addItemBtn.addEventListener("click", () => {
      const serviceId = form.querySelector("#item-service").value;
      const quantity = Number(form.querySelector("#item-qty").value) || 0;
      const priceInput = form.querySelector("#item-price");
      const notes = form.querySelector("#item-notes").value.trim();

      if (!serviceId) {
        showToast("Pilih layanan terlebih dahulu.");
        return;
      }
      if (!quantity) {
        showToast("Masukkan kuantitas/berat yang valid.");
        return;
      }
      const service = state.services.find((s) => s.id === serviceId);
      const price = Number(priceInput.value || service.price || 0);
      const subtotal = quantity * price;
      draftItems.push({
        id: generateId("itm"),
        serviceId,
        name: service.name,
        unit: service.unit,
        quantity,
        price,
        subtotal,
        notes,
      });
      priceInput.value = "";
      form.querySelector("#item-qty").value = "";
      form.querySelector("#item-notes").value = "";
      renderItems();
    });

    orderItemsTableBody.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-action='remove-item']");
      if (!actionBtn) return;
      const row = actionBtn.closest("tr");
      const id = row.dataset.id;
      draftItems = draftItems.filter((item) => item.id !== id);
      renderItems();
    });

    [discountEl, additionalEl].forEach((input) => {
      input.addEventListener("input", recalc);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!draftItems.length) {
        showToast("Tambahkan minimal satu layanan.");
        return;
      }

      let customerId = orderCustomer.value;
      if (!customerId) {
        showToast("Pilih pelanggan.");
        return;
      }

      if (customerId === "__new") {
        const name = form.querySelector("#new-customer-name").value.trim();
        const phone = form.querySelector("#new-customer-phone").value.trim();
        if (!name) {
          showToast("Nama pelanggan baru wajib diisi.");
          return;
        }
        const newCustomer = {
          id: generateId("cust"),
          name,
          phone,
          email: form.querySelector("#new-customer-email")?.value || "",
          address: form.querySelector("#new-customer-address").value.trim(),
          notes: form.querySelector("#new-customer-notes").value.trim(),
        };
        state.customers.push(newCustomer);
        customerId = newCustomer.id;
      }

      const order = buildOrderFromForm(form, draftItems, customerId);
      state.orders.push(order);
      saveState();
      renderView("orders");
      showToast("Pesanan berhasil disimpan.");
    });

    const tableBody = root.querySelector("#orders-table-body");
    tableBody.addEventListener("click", handleOrderAction);

    const filterStatus = root.querySelector("#order-filter-status");
    const searchInput = root.querySelector("#order-search");

    const rebuildTable = () => {
      const statusVal = filterStatus.value;
      const searchVal = searchInput.value.trim().toLowerCase();
      const list = state.orders
        .slice()
        .reverse()
        .filter((order) => {
          const matchStatus = !statusVal || order.status === statusVal;
          const customer = resolveCustomer(order.customerId);
          const searchText = `${order.code} ${customer?.name || ""}`.toLowerCase();
          const matchSearch = !searchVal || searchText.includes(searchVal);
          return matchStatus && matchSearch;
        });
      tableBody.innerHTML = list.length
        ? list.map((o) => renderOrderRow(o, state)).join("")
        : `<tr><td colspan="6">Tidak ada pesanan dengan filter tersebut.</td></tr>`;
    };

    filterStatus.addEventListener("change", rebuildTable);
    searchInput.addEventListener("input", rebuildTable);
  }

  function bindCustomersView(root) {
    const form = root.querySelector("#customer-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#customer-name").value.trim();
      if (!name) {
        showToast("Nama pelanggan wajib diisi.");
        return;
      }
      const customer = {
        id: generateId("cust"),
        name,
        phone: form.querySelector("#customer-phone").value.trim(),
        email: form.querySelector("#customer-email").value.trim(),
        address: form.querySelector("#customer-address").value.trim(),
        notes: form.querySelector("#customer-notes").value.trim(),
      };
      state.customers.push(customer);
      saveState();
      renderView("customers");
      showToast("Pelanggan baru disimpan.");
    });

    root.querySelectorAll("[data-action='view-customer']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const customer = state.customers.find((c) => c.id === id);
        if (!customer) return;
        const orders = state.orders.filter((o) => o.customerId === id);
        openModal(renderCustomerModal(customer, orders));
      });
    });

    root.querySelectorAll("[data-action='delete-customer']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        if (!confirm("Hapus pelanggan ini?")) return;
        state.customers = state.customers.filter((c) => c.id !== id);
        saveState();
        renderView("customers");
      });
    });
  }

  function bindExpensesView(root) {
    const form = root.querySelector("#expense-form");
    const tableBody = root.querySelector("#expense-table");
    const filter = root.querySelector("#expense-filter");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const expense = {
        id: generateId("exp"),
        date: form.querySelector("#expense-date").value,
        outletId: form.querySelector("#expense-outlet").value || null,
        category: form.querySelector("#expense-category").value.trim(),
        amount: Number(form.querySelector("#expense-amount").value || 0),
        description: form.querySelector("#expense-notes").value.trim(),
      };
      if (!expense.category || !expense.amount) {
        showToast("Lengkapi kategori dan nominal.");
        return;
      }
      state.expenses.push(expense);
      saveState();
      form.reset();
      form.querySelector("#expense-date").value = today();
      filter.value = currentYearMonth();
      tableBody.innerHTML = renderExpenseRows(state.expenses, state);
      showToast("Pengeluaran tersimpan.");
    });

    tableBody.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action='delete-expense']");
      if (!btn) return;
      const id = btn.dataset.id;
      if (!confirm("Hapus pengeluaran ini?")) return;
      state.expenses = state.expenses.filter((exp) => exp.id !== id);
      saveState();
      tableBody.innerHTML = renderExpenseRows(state.expenses, state);
    });

    filter.addEventListener("change", () => {
      const [year, month] = filter.value.split("-");
      const filtered = state.expenses.filter((exp) => {
        const d = new Date(exp.date);
        return d.getFullYear() === Number(year) && d.getMonth() + 1 === Number(month);
      });
      tableBody.innerHTML = filtered.length
        ? renderExpenseRows(filtered, state)
        : `<tr><td colspan="6">Tidak ada pengeluaran.</td></tr>`;
    });
  }

  function bindReportsView(root) {
    const form = root.querySelector("#report-form");
    const preview = root.querySelector("#report-preview");

    const updatePreview = () => {
      const start = form.querySelector("#report-start").value;
      const end = form.querySelector("#report-end").value;
      const type = form.querySelector("#report-type").value;
      const { ordersRange, revenue, expensesTotal } = collectRangeData(start, end);
      if (!ordersRange.length) {
        preview.innerHTML = `<p>Tidak ada data di rentang tersebut.</p>`;
        return;
      }
      let html = `<div class="grid three">
        <div class="card"><h3>Total Pesanan</h3><div class="stat-value">${ordersRange.length}</div></div>
        <div class="card"><h3>Pendapatan</h3><div class="stat-value">${formatCurrency(revenue)}</div></div>
        <div class="card"><h3>Pengeluaran</h3><div class="stat-value">${formatCurrency(expensesTotal)}</div></div>
      </div>`;
      if (type === "profit") {
        html += `<p>Laba kotor: <strong>${formatCurrency(revenue - expensesTotal)}</strong></p>`;
      }
      preview.innerHTML = html;
    };

    form.addEventListener("change", updatePreview);
    updatePreview();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const start = form.querySelector("#report-start").value;
      const end = form.querySelector("#report-end").value;
      const type = form.querySelector("#report-type").value;
      exportReport(type, start, end);
    });
  }

  function bindQRView(root) {
    const select = root.querySelector("#qr-order-select");
    const qrCanvas = root.querySelector("#qr-canvas");
    const qrWrapper = root.querySelector("#qr-canvas-wrapper");
    const downloadBtn = root.querySelector("#download-qr");
    const shareBtn = root.querySelector("#share-status");
    const searchInput = root.querySelector("#qr-search");
    const resultBox = root.querySelector("#qr-result");

    const clearCanvas = () => {
      const ctx = qrCanvas.getContext("2d");
      ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    };

    select.addEventListener("change", () => {
      const order = state.orders.find((o) => o.id === select.value);
      if (!order) {
        clearCanvas();
        downloadBtn.disabled = true;
        shareBtn.disabled = true;
        return;
      }
      const url = buildStatusUrl(order.id);
      generateQRCode(qrCanvas, url, { size: 220 });
      downloadBtn.disabled = false;
      shareBtn.disabled = false;
      downloadBtn.onclick = () => downloadCanvas(qrCanvas, `${order.code}-qr.png`);
      shareBtn.onclick = async () => {
        await navigator.clipboard.writeText(url);
        showToast("Link status disalin ke clipboard.");
      };
    });

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) {
        resultBox.innerHTML = "";
        return;
      }
      const order = state.orders.find((o) => o.code.toLowerCase().includes(query));
      if (!order) {
        resultBox.innerHTML = `<p>Tidak ditemukan.</p>`;
        return;
      }
      resultBox.innerHTML = renderOrderSummary(order);
    });

    const order = state.orders.slice(-1)[0];
    if (order) {
      select.value = order.id;
      select.dispatchEvent(new Event("change"));
    }
  }

  // ---- Generic entity manager ----
  function entityManagerView(title, key, fields, subtitleFn) {
    return {
      template: () => {
        return `
          <section class="section">
            <h2>${title}</h2>
            <form data-entity-form="${key}">
              <div class="grid two">
                ${fields
                  .map(
                    (field) => `
                  <div>
                    <label>${field.label}${field.required ? " *" : ""}</label>
                    ${field.type === "textarea"
                      ? `<textarea id="${key}-${field.id}" ${field.required ? "required" : ""}></textarea>`
                      : `<input id="${key}-${field.id}" type="${field.type}" ${field.required ? "required" : ""}>`}
                  </div>`
                  )
                  .join("")}
                <div>
                  <label>&nbsp;</label>
                  <button class="primary-btn" type="submit">Simpan</button>
                </div>
              </div>
            </form>
          </section>
          <section class="section">
            <h2>Daftar</h2>
            <div class="table-scroll">
              <table class="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Detail</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${state[key]
                    .map((item) => `
                      <tr data-id="${item.id}">
                        <td class="strong">${item.name}</td>
                        <td>${subtitleFn ? subtitleFn(item) : ""}</td>
                        <td><button class="icon-btn" data-action="delete-entity">🗑️</button></td>
                      </tr>`)
                    .join("") || `<tr><td colspan="3">Belum ada data.</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>
        `;
      },
      bind: (root) => {
        const form = root.querySelector(`[data-entity-form='${key}']`);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const entry = { id: generateId(key.slice(0, 3)) };
          let valid = true;
          fields.forEach((field) => {
            const input = form.querySelector(`#${key}-${field.id}`);
            const value = input.value.trim();
            if (field.required && !value) {
              valid = false;
            }
            entry[field.id] = field.type === "number" ? Number(value || 0) : value;
          });
          if (!valid) {
            showToast("Lengkapi data wajib.");
            return;
          }
          state[key].push(entry);
          saveState();
          renderView(key);
          showToast(`${title} tersimpan.`);
        });
        root.querySelectorAll("[data-action='delete-entity']").forEach((btn) => {
          btn.addEventListener("click", () => {
            const row = btn.closest("tr");
            const id = row.dataset.id;
            if (!confirm("Hapus data ini?")) return;
            state[key] = state[key].filter((item) => item.id !== id);
            saveState();
            renderView(key);
          });
        });
      },
    };
  }

  // ---- Helpers & utilities ----
  function generateId(prefix) {
    if (window.crypto?.randomUUID) {
      return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
    }
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(defaultState);
      const parsed = JSON.parse(raw);
      if (!parsed.settings) {
        parsed.settings = clone(defaultState.settings);
      }
      return { ...clone(defaultState), ...parsed };
    } catch (error) {
      console.error("Gagal memuat state", error);
      return clone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function createSampleOrders(base) {
    const cust = base.customers[0];
    const order = {
      id: generateId("ord"),
      code: buildOrderCode(1),
      customerId: cust.id,
      outletId: base.outlets[0].id,
      cashierId: base.cashiers[0].id,
      paymentMethodId: base.paymentMethods[0].id,
      createdAt: new Date().toISOString(),
      dueDate: addDays(new Date(), 1).toISOString(),
      status: "washing",
      statusHistory: [
        { status: "received", at: new Date().toISOString() },
        { status: "washing", at: new Date().toISOString() },
      ],
      items: [
        {
          id: generateId("itm"),
          serviceId: base.services[0].id,
          name: base.services[0].name,
          unit: base.services[0].unit,
          quantity: 3,
          price: base.services[0].price,
          subtotal: 3 * base.services[0].price,
          notes: "",
        },
      ],
      amounts: {
        subtotal: 3 * base.services[0].price,
        discount: 0,
        additional: 0,
        total: 3 * base.services[0].price,
        paid: 0,
      },
      notes: "Siapkan sebelum jam 5",
    };
    return [order];
  }

  function buildOrderFromForm(form, items, customerId) {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = Number(form.querySelector("#order-discount").value || 0);
    const additional = Number(form.querySelector("#order-additional").value || 0);
    const total = subtotal - discount + additional;
    const orderNumber = state.orders.length + 1;
    const order = {
      id: generateId("ord"),
      code: buildOrderCode(orderNumber),
      customerId,
      outletId: form.querySelector("#order-outlet").value,
      cashierId: form.querySelector("#order-cashier").value,
      paymentMethodId: form.querySelector("#order-payment").value,
      createdAt: new Date().toISOString(),
      dueDate: new Date(form.querySelector("#order-due-date").value).toISOString(),
      status: form.querySelector("#order-status").value,
      statusHistory: [
        {
          status: form.querySelector("#order-status").value,
          at: new Date().toISOString(),
        },
      ],
      items,
      amounts: {
        subtotal,
        discount,
        additional,
        total,
        paid: 0,
      },
      notes: form.querySelector("#order-notes").value.trim(),
    };
    return order;
  }

  function buildOrderCode(number) {
    const date = new Date();
    const codeDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    return `INV-${codeDate}-${String(number).padStart(3, "0")}`;
  }

  function renderOrderRow(order, data) {
    const customer = data.customers.find((c) => c.id === order.customerId);
    const services = order.items.map((item) => `${item.name} (${item.quantity} ${item.unit})`).join(", ");
    return `
      <tr data-order-id="${order.id}">
        <td class="nowrap">
          <button class="link-btn" data-action="view-order">${order.code}</button>
          <div class="order-date">${formatDateHuman(order.createdAt)}</div>
        </td>
        <td>
          <div class="strong">${customer?.name || "-"}</div>
          <small>${customer?.phone || ""}</small>
        </td>
        <td>
          <div>${services}</div>
          <small>${resolveOutlet(order.outletId)?.name || ""}</small>
        </td>
        <td class="strong">${formatCurrency(order.amounts.total)}</td>
        <td>
          <span class="status-pill" data-status="${order.status}">${resolveStatus(order.status)?.label || order.status}</span>
        </td>
        <td>
          <div class="table-actions">
            <button class="icon-btn" data-action="advance-status" title="Update Status">⏱️</button>
            <button class="icon-btn" data-action="print-order" title="Cetak Nota">🖨️</button>
            <button class="icon-btn" data-action="share-whatsapp" title="Kirim WhatsApp">💬</button>
            <button class="icon-btn" data-action="show-qr" title="QR Code">📱</button>
            <button class="icon-btn" data-action="delete-order" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }

  function handleOrderAction(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const row = btn.closest("tr[data-order-id]");
    const orderId = row?.dataset.orderId;
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return;

    switch (action) {
      case "advance-status":
        advanceOrderStatus(order);
        break;
      case "print-order":
        openModal(renderPrintModal(order));
        break;
      case "share-whatsapp":
        shareViaWhatsApp(order);
        break;
      case "show-qr":
        openModal(renderQrModal(order));
        break;
      case "view-order":
        openModal(renderOrderDetail(order));
        break;
      case "delete-order":
        if (!confirm("Hapus pesanan ini?")) return;
        state.orders = state.orders.filter((o) => o.id !== order.id);
        saveState();
        renderView(currentView);
        break;
      default:
        break;
    }
  }

  function advanceOrderStatus(order) {
    const flow = state.settings.statusFlow;
    const idx = flow.findIndex((s) => s.id === order.status);
    if (idx === -1) {
      order.status = flow[0].id;
    } else if (idx < flow.length - 1) {
      order.status = flow[idx + 1].id;
    } else {
      showToast("Pesanan sudah dalam status terakhir.");
      return;
    }
    order.statusHistory.push({ status: order.status, at: new Date().toISOString() });
    saveState();
    renderView(currentView);
    showToast("Status pesanan diperbarui.");
  }

  function renderOrderDetail(order) {
    const customer = resolveCustomer(order.customerId);
    const outlet = resolveOutlet(order.outletId);
    const cashier = state.cashiers.find((c) => c.id === order.cashierId);
    const history = order.statusHistory
      .map((entry) => `<li><span class="badge">${resolveStatus(entry.status)?.label}</span> ${formatDateHuman(entry.at)}</li>`)
      .join("");
    const items = order.items
      .map(
        (item) => `<tr>
          <td>${item.name}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${formatCurrency(item.subtotal)}</td>
        </tr>`
      )
      .join("");
    return {
      title: `Detail Pesanan ${order.code}`,
      body: `
        <p><strong>Pelanggan:</strong> ${customer?.name || ""} (${customer?.phone || ""})</p>
        <p><strong>Outlet:</strong> ${outlet?.name || ""}</p>
        <p><strong>Kasir:</strong> ${cashier?.name || ""}</p>
        <p><strong>Tanggal Masuk:</strong> ${formatDateHuman(order.createdAt)}</p>
        <p><strong>Tanggal Selesai:</strong> ${formatDateHuman(order.dueDate)}</p>
        <div class="table-scroll">
          <table class="table">
            <thead><tr><th>Layanan</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
            <tbody>${items}</tbody>
          </table>
        </div>
        <p><strong>Total:</strong> ${formatCurrency(order.amounts.total)}</p>
        <p><strong>Catatan:</strong> ${order.notes || "-"}</p>
        <h3>Status</h3>
        <ul>${history}</ul>
      `,
    };
  }

  function renderPrintModal(order) {
    const customer = resolveCustomer(order.customerId);
    const outlet = resolveOutlet(order.outletId);
    const amounts = order.amounts;
    const business = state.business;
    const rows = order.items
      .map(
        (item) => `<tr>
        <td>${item.name}</td>
        <td>${item.quantity} ${item.unit}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(item.subtotal)}</td>
      </tr>`
      )
      .join("");
    return {
      title: `Cetak Nota ${order.code}`,
      footer: `<button class="primary-btn" id="print-now">Print</button>`,
      body: `
        <div class="print-preview">
          <div class="note-preview">
            <h3>${business.name}</h3>
            <p>${business.address}<br>${business.phone}</p>
            <hr>
            <p><strong>Nota:</strong> ${order.code}<br>
            <strong>Tanggal:</strong> ${formatDateHuman(order.createdAt)}<br>
            <strong>Pelanggan:</strong> ${customer?.name || ""} (${customer?.phone || ""})</p>
            <table class="table">
              <thead><tr><th>Layanan</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr><td colspan="3">Subtotal</td><td>${formatCurrency(amounts.subtotal)}</td></tr>
                <tr><td colspan="3">Diskon</td><td>${formatCurrency(amounts.discount)}</td></tr>
                <tr><td colspan="3">Biaya Tambahan</td><td>${formatCurrency(amounts.additional)}</td></tr>
                <tr><td colspan="3"><strong>Total</strong></td><td><strong>${formatCurrency(amounts.total)}</strong></td></tr>
              </tfoot>
            </table>
            <p>${business.footerNotes}</p>
          </div>
        </div>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector("#print-now").addEventListener("click", () => {
          const printWindow = window.open("", "_blank");
          if (!printWindow) return;
          printWindow.document.write(`<!DOCTYPE html><html><head><title>${order.code}</title><link rel="stylesheet" href="styles.css"></head><body>${modalEl.querySelector(".print-preview").outerHTML}</body></html>`);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        });
      },
    };
  }

  function renderQrModal(order) {
    const url = buildStatusUrl(order.id);
    setTimeout(() => {
      const canvas = modalRoot.querySelector("canvas");
      generateQRCode(canvas, url, { size: 240 });
    }, 0);
    return {
      title: `QR Code ${order.code}`,
      body: `
        <div class="qr-preview">
          <canvas width="240" height="240"></canvas>
        </div>
        <p>Scan QR untuk melihat status pesanan secara real time.</p>
        <button class="primary-btn" id="download-qr-modal">Unduh QR</button>
      `,
      onOpen: (modalEl) => {
        const canvas = modalEl.querySelector("canvas");
        generateQRCode(canvas, url, { size: 240 });
        modalEl.querySelector("#download-qr-modal").addEventListener("click", () => {
          downloadCanvas(canvas, `${order.code}-qr.png`);
        });
      },
    };
  }

  function renderCustomerModal(customer, orders) {
    const rows = orders
      .map(
        (order) => `<tr>
        <td>${order.code}</td>
        <td>${formatDateHuman(order.createdAt)}</td>
        <td>${formatCurrency(order.amounts.total)}</td>
        <td>${resolveStatus(order.status)?.label || order.status}</td>
        <td><button class="icon-btn" data-order-id="${order.id}" data-action="view-order">👁️</button></td>
      </tr>`
      )
      .join("");
    return {
      title: customer.name,
      body: `
        <p><strong>Kontak:</strong> ${customer.phone || "-"}</p>
        <p><strong>Email:</strong> ${customer.email || "-"}</p>
        <p><strong>Alamat:</strong> ${customer.address || "-"}</p>
        <p><strong>Catatan:</strong> ${customer.notes || "-"}</p>
        <h3>Riwayat Pesanan</h3>
        <div class="table-scroll">
          <table class="table">
            <thead><tr><th>Kode</th><th>Tanggal</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="5">Belum ada pesanan.</td></tr>`}</tbody>
          </table>
        </div>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelectorAll("[data-action='view-order']").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.orderId;
            const order = state.orders.find((o) => o.id === id);
            if (!order) return;
            closeModal();
            openModal(renderOrderDetail(order));
          });
        });
      },
    };
  }

  function renderExpenseRows(expenses, data) {
    if (!expenses.length) {
      return `<tr><td colspan="6">Belum ada pengeluaran.</td></tr>`;
    }
    return expenses
      .slice()
      .reverse()
      .map((exp) => {
        const outlet = data.outlets.find((o) => o.id === exp.outletId);
        return `<tr>
          <td>${formatDateHuman(exp.date)}</td>
          <td>${exp.category}</td>
          <td>${outlet?.name || "Umum"}</td>
          <td>${formatCurrency(exp.amount)}</td>
          <td>${exp.description || ""}</td>
          <td><button class="icon-btn" data-action="delete-expense" data-id="${exp.id}">🗑️</button></td>
        </tr>`;
      })
      .join("");
  }

  function renderOrderSummary(order) {
    const customer = resolveCustomer(order.customerId);
    return `
      <div class="card">
        <h3>${order.code}</h3>
        <p><strong>Pelanggan:</strong> ${customer?.name || ""}</p>
        <p><strong>Status:</strong> ${resolveStatus(order.status)?.label || order.status}</p>
        <p><strong>Total:</strong> ${formatCurrency(order.amounts.total)}</p>
        <a class="link-btn" href="${buildStatusUrl(order.id)}" target="_blank">Buka status</a>
      </div>
    `;
  }

  function buildStatusUrl(orderId) {
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.set("order", orderId);
    return url.toString();
  }

  function shareViaWhatsApp(order) {
    const customer = resolveCustomer(order.customerId);
    const phone = customer?.phone?.replace(/[^0-9]/g, "");
    const message = `Halo ${customer?.name || "pelanggan"},%0aPesanan ${order.code} saat ini: ${resolveStatus(order.status)?.label}.%0aCek status: ${buildStatusUrl(order.id)}`;
    const url = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, "_blank");
  }

  function downloadCanvas(canvas, filename) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL();
    link.click();
  }

  function exportReport(type, start, end) {
    const { ordersRange, expensesRange } = collectRangeData(start, end);
    let rows = [];
    let headers = [];

    switch (type) {
      case "orders":
        headers = ["Kode", "Tanggal", "Pelanggan", "Total", "Status"];
        rows = ordersRange.map((order) => [
          order.code,
          formatDateHuman(order.createdAt),
          resolveCustomer(order.customerId)?.name || "",
          formatCurrency(order.amounts.total),
          resolveStatus(order.status)?.label || order.status,
        ]);
        break;
      case "revenue":
        headers = ["Tanggal", "Kode", "Pelanggan", "Pendapatan"];
        rows = ordersRange.map((order) => [
          formatDateHuman(order.createdAt),
          order.code,
          resolveCustomer(order.customerId)?.name || "",
          formatCurrency(order.amounts.total),
        ]);
        break;
      case "expenses":
        headers = ["Tanggal", "Kategori", "Outlet", "Nominal", "Catatan"];
        rows = expensesRange.map((exp) => [
          formatDateHuman(exp.date),
          exp.category,
          resolveOutlet(exp.outletId)?.name || "Umum",
          formatCurrency(exp.amount),
          exp.description || "",
        ]);
        break;
      case "profit":
        headers = ["Tanggal", "Kode", "Pelanggan", "Pendapatan", "Pengeluaran"];
        const ordersByDate = groupByDate(ordersRange, (order) => order.createdAt);
        const expensesByDate = groupByDate(expensesRange, (exp) => exp.date);
        const allDates = Array.from(new Set([...Object.keys(ordersByDate), ...Object.keys(expensesByDate)])).sort();
        rows = allDates.map((dateKey) => {
          const ordersOfDay = ordersByDate[dateKey] || [];
          const expensesOfDay = expensesByDate[dateKey] || [];
          return [
            formatDateHuman(dateKey),
            ordersOfDay.map((o) => o.code).join(", "),
            ordersOfDay.map((o) => resolveCustomer(o.customerId)?.name || "").join(", "),
            formatCurrency(sumBy(ordersOfDay, (o) => o.amounts.total)),
            formatCurrency(sumBy(expensesOfDay, (e) => e.amount)),
          ];
        });
        break;
      default:
        return;
    }

    if (!rows.length) {
      showToast("Tidak ada data pada rentang tersebut.");
      return;
    }

    const table = `<table border="1"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`;
    const blob = new Blob([`\ufeff${table}`], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${type}-${start}-sd-${end}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Laporan diekspor dalam format Excel (.xls).");
  }

  function collectRangeData(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    const ordersRange = state.orders.filter((order) => {
      const created = new Date(order.createdAt);
      return created >= startDate && created <= endDate;
    });
    const expensesRange = state.expenses.filter((exp) => {
      const created = new Date(exp.date);
      return created >= startDate && created <= endDate;
    });
    const revenue = sumBy(ordersRange, (order) => order.amounts.total);
    const expensesTotal = sumBy(expensesRange, (exp) => exp.amount);
    return { ordersRange, expensesRange, revenue, expensesTotal };
  }

  function groupByDate(items, getter) {
    return items.reduce((acc, item) => {
      const dateKey = new Date(getter(item)).toISOString().split("T")[0];
      acc[dateKey] = acc[dateKey] || [];
      acc[dateKey].push(item);
      return acc;
    }, {});
  }

  function sumBy(list, fn) {
    return list.reduce((sum, item) => sum + fn(item), 0);
  }

  function formatCurrency(amount) {
    amount = Number(amount || 0);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDateHuman(date) {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function currentYearMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthStart() {
    const d = new Date();
    d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function resolveCustomer(id) {
    return state.customers.find((c) => c.id === id) || null;
  }

  function resolveOutlet(id) {
    return state.outlets.find((o) => o.id === id) || null;
  }

  function resolveStatus(id) {
    return state.settings.statusFlow.find((s) => s.id === id);
  }

  function openModal(content) {
    modalRoot.innerHTML = renderModal(content);
    modalRoot.classList.remove("hidden");
    modalRoot.querySelector("[data-modal-close]").addEventListener("click", closeModal);
    modalRoot.addEventListener("click", (e) => {
      if (e.target === modalRoot) closeModal();
    });
    if (content.onOpen) {
      content.onOpen(modalRoot.querySelector(".modal-content"));
    }
  }

  function closeModal() {
    modalRoot.classList.add("hidden");
    modalRoot.innerHTML = "";
  }

  function renderModal({ title, body, footer }) {
    return `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title || "Detail"}</h3>
          <button class="modal-close" data-modal-close>&times;</button>
        </div>
        <div class="modal-body">${body || ""}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
      </div>
    `;
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2500);
  }

  function calculateDashboardStats(data) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = data.orders.filter((order) => new Date(order.createdAt) >= start);
    const revenue = sumBy(monthOrders, (order) => order.amounts.total);
    const expenses = data.expenses.filter((exp) => new Date(exp.date) >= start);
    const expenseTotal = sumBy(expenses, (exp) => exp.amount);
    return {
      monthOrders: monthOrders.length,
      monthRevenue: revenue,
      estimatedProfit: revenue - expenseTotal,
      monthCompared: `${monthOrders.length} pesanan bulan ini`,
      revenueCompared: `${monthOrders.length ? Math.round(revenue / monthOrders.length) : 0} rata-rata/order`,
    };
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laundry-pos-backup-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup data diunduh.");
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        state = { ...clone(defaultState), ...imported };
        saveState();
        renderView(currentView);
        showToast("Data berhasil diimport.");
      } catch (error) {
        showToast("File tidak valid.");
      }
    };
    reader.readAsText(file);
  }

  function openReceiptSettings() {
    const settings = state.business;
    const content = {
      title: "Pengaturan Nota",
      body: `
        <form id="receipt-form">
          <label>Nama Bisnis</label>
          <input type="text" id="biz-name" value="${settings.name}" required>
          <label>Alamat</label>
          <textarea id="biz-address">${settings.address}</textarea>
          <label>No. Telepon</label>
          <input type="text" id="biz-phone" value="${settings.phone}">
          <label>Email</label>
          <input type="email" id="biz-email" value="${settings.email}">
          <label>Catatan Kaki Nota</label>
          <textarea id="biz-footer">${settings.footerNotes}</textarea>
          <label>Logo (URL atau Data URI)</label>
          <input type="text" id="biz-logo" value="${settings.logoDataUrl || ""}" placeholder="https://...">
          <button class="primary-btn" type="submit">Simpan</button>
        </form>
      `,
      onOpen: (modal) => {
        const form = modal.querySelector("#receipt-form");
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          state.business = {
            name: form.querySelector("#biz-name").value,
            address: form.querySelector("#biz-address").value,
            phone: form.querySelector("#biz-phone").value,
            email: form.querySelector("#biz-email").value,
            footerNotes: form.querySelector("#biz-footer").value,
            logoDataUrl: form.querySelector("#biz-logo").value,
          };
          saveState();
          closeModal();
          showToast("Pengaturan nota disimpan.");
        });
      },
    };
    openModal(content);
  }

  function checkPublicStatusView() {
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get("order");
    if (!orderParam) return;
    const order = state.orders.find((o) => o.id === orderParam);
    if (!order) return;
    navButtons.forEach((btn) => (btn.style.display = "none"));
    document.querySelector("header").style.display = "none";
    document.querySelector("nav").style.display = "none";
    viewContainer.innerHTML = renderPublicStatus(order);
  }

  function renderPublicStatus(order) {
    const status = resolveStatus(order.status);
    return `
      <section class="section" style="margin-top:40px">
        <h2>Status Pesanan</h2>
        <div class="card">
          <h3>${order.code}</h3>
          <p>Status terkini: <strong>${status?.label || order.status}</strong></p>
          <p>Terakhir diperbarui: ${formatDateHuman(order.statusHistory.slice(-1)[0].at)}</p>
          <ol>
            ${state.settings.statusFlow
              .map((step) => {
                const reached = order.statusHistory.some((entry) => entry.status === step.id);
                return `<li><span class="badge" style="background:${reached ? "rgba(34,197,94,0.2)" : "rgba(15,23,42,0.1)"};">${step.label}</span></li>`;
              })
              .join("")}
          </ol>
        </div>
      </section>
    `;
  }

  function renderOrderSummaryCard(order) {
    const customer = resolveCustomer(order.customerId);
    return `
      <div class="card">
        <h3>${order.code}</h3>
        <p><strong>Pelanggan:</strong> ${customer?.name || ""}</p>
        <p><strong>Status:</strong> ${resolveStatus(order.status)?.label || order.status}</p>
        <p><strong>Total:</strong> ${formatCurrency(order.amounts.total)}</p>
      </div>
    `;
  }

  function renderOrderSummaryInline(order) {
    const customer = resolveCustomer(order.customerId);
    return `
      <p>${order.code} - ${customer?.name || ""} (${formatCurrency(order.amounts.total)})</p>
    `;
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => LaundryPOS.init());
