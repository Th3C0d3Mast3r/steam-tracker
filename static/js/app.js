/**
 * Steam Tracker - Frontend UI Controller & Application Logic
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Database
  try {
    await db.init();
    await db.seedDemoData(); // Pre-fill demo games if empty
  } catch (err) {
    console.error("Failed to initialize IndexedDB:", err);
    showToast("Error initializing storage", "error");
  }

  // App State
  let trackedGames = [];
  let currentFilter = "all";
  let currentSort = "discount_desc";
  let activeSearchDebounce = null;
  let historyChartInstance = null;
  let currentGameForTargetEdit = null;

  // DOM Elements
  const gamesGrid = document.getElementById("gamesGrid");
  const emptyState = document.getElementById("emptyState");
  
  // Stats Elements
  const statTotalTracked = document.getElementById("statTotalTracked");
  const statOnSale = document.getElementById("statOnSale");
  const statSavings = document.getElementById("statSavings");
  const statTargetMet = document.getElementById("statTargetMet");

  // Controls Elements
  const filterBtns = document.querySelectorAll(".filter-btn");
  const sortSelect = document.getElementById("sortSelect");

  // Header Actions
  const btnOpenSearch = document.getElementById("btnOpenSearch");
  const btnRefreshAll = document.getElementById("btnRefreshAll");
  const btnExportData = document.getElementById("btnExportData");
  const btnImportData = document.getElementById("btnImportData");
  const fileImportInput = document.getElementById("fileImportInput");

  // Search Modal Elements
  const searchModal = document.getElementById("searchModal");
  const btnCloseSearchModal = document.getElementById("btnCloseSearchModal");
  const searchInput = document.getElementById("searchInput");
  const searchResultsList = document.getElementById("searchResultsList");
  const searchSpinner = document.getElementById("searchSpinner");

  // Edit Target Modal Elements
  const editTargetModal = document.getElementById("editTargetModal");
  const btnCloseEditTargetModal = document.getElementById("btnCloseEditTargetModal");
  const editTargetGameTitle = document.getElementById("editTargetGameTitle");
  const editTargetInput = document.getElementById("editTargetInput");
  const formEditTarget = document.getElementById("formEditTarget");

  // Price History Modal Elements
  const historyModal = document.getElementById("historyModal");
  const btnCloseHistoryModal = document.getElementById("btnCloseHistoryModal");
  const historyGameTitle = document.getElementById("historyGameTitle");
  const historyCanvas = document.getElementById("historyCanvas");

  // Toast Container
  const toastContainer = document.getElementById("toastContainer");

  // --- Initial Render ---
  await loadAndRenderGames();

  // --- Event Listeners ---

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderGames();
    });
  });

  // Sort select
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderGames();
  });

  // Search modal trigger
  btnOpenSearch.addEventListener("click", () => {
    openModal(searchModal);
    searchInput.value = "";
    searchResultsList.innerHTML = `<div style="text-align:center; color: var(--text-dim); padding: 20px;">Type a game title above to search Steam...</div>`;
    setTimeout(() => searchInput.focus(), 100);
  });

  btnCloseSearchModal.addEventListener("click", () => closeModal(searchModal));

  // Live search debounced input
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (activeSearchDebounce) clearTimeout(activeSearchDebounce);

    if (query.length < 2) {
      searchResultsList.innerHTML = `<div style="text-align:center; color: var(--text-dim); padding: 20px;">Type at least 2 characters to search...</div>`;
      searchSpinner.style.display = "none";
      return;
    }

    searchSpinner.style.display = "block";
    searchResultsList.innerHTML = "";

    activeSearchDebounce = setTimeout(async () => {
      await performSearch(query);
    }, 350);
  });

  // Edit target modal handlers
  btnCloseEditTargetModal.addEventListener("click", () => closeModal(editTargetModal));
  
  formEditTarget.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentGameForTargetEdit) return;

    const newTarget = parseFloat(editTargetInput.value);
    if (isNaN(newTarget) || newTarget < 0) {
      showToast("Please enter a valid target price", "error");
      return;
    }

    currentGameForTargetEdit.target_price = newTarget;
    await db.updateGame(currentGameForTargetEdit);
    showToast(`Updated target price for ${currentGameForTargetEdit.name}`, "success");
    closeModal(editTargetModal);
    await loadAndRenderGames();
  });

  // History modal handler
  btnCloseHistoryModal.addEventListener("click", () => closeModal(historyModal));

  // Refresh All Prices button
  btnRefreshAll.addEventListener("click", async () => {
    if (trackedGames.length === 0) {
      showToast("No games to refresh", "info");
      return;
    }

    btnRefreshAll.disabled = true;
    btnRefreshAll.innerHTML = `<div class="spinner" style="width:16px;height:16px;margin:0;"></div> Refreshing...`;
    showToast("Refreshing game prices from Steam...", "info");

    let updatedCount = 0;
    for (const game of trackedGames) {
      try {
        const res = await fetch(`/api/game/${game.appid}`);
        if (res.ok) {
          const updated = await res.json();
          if (updated.price !== null) {
            game.current_price = updated.price;
            game.original_price = updated.original_price;
            game.discount = updated.discount;
            await db.updateGame(game);
            await db.logPriceHistory(game.appid, updated.price, updated.original_price, updated.discount);
            updatedCount++;
          }
        }
      } catch (err) {
        console.error(`Failed to refresh appid ${game.appid}:`, err);
      }
    }

    btnRefreshAll.disabled = false;
    btnRefreshAll.innerHTML = `<span class="icon">↻</span> Refresh All`;
    showToast(`Successfully refreshed prices for ${updatedCount} games!`, "success");
    await loadAndRenderGames();
  });

  // Export Data button
  btnExportData.addEventListener("click", async () => {
    try {
      const data = await db.exportData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `steam_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Backup downloaded successfully!", "success");
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    }
  });

  // Import Data trigger
  btnImportData.addEventListener("click", () => fileImportInput.click());

  fileImportInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        await db.importData(json);
        showToast("Data imported successfully!", "success");
        await loadAndRenderGames();
      } catch (err) {
        showToast("Import failed: " + err.message, "error");
      }
      fileImportInput.value = "";
    };
    reader.readAsText(file);
  });

  // Close modals when clicking overlay
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      closeModal(e.target);
    }
  });

  // --- Core Methods ---

  async function loadAndRenderGames() {
    trackedGames = await db.getAllGames();
    updateStats();
    renderGames();
  }

  function updateStats() {
    statTotalTracked.textContent = trackedGames.length;

    const onSaleCount = trackedGames.filter(g => g.discount > 0).length;
    statOnSale.textContent = onSaleCount;

    let targetMetCount = 0;
    let totalSavings = 0;

    trackedGames.forEach(g => {
      if (g.current_price !== null && g.target_price > 0 && g.current_price <= g.target_price) {
        targetMetCount++;
      }
      if (g.original_price && g.current_price && g.original_price > g.current_price) {
        totalSavings += (g.original_price - g.current_price);
      }
    });

    statTargetMet.textContent = targetMetCount;
    statSavings.textContent = formatCurrency(totalSavings);
  }

  function renderGames() {
    let filtered = [...trackedGames];

    // Filter
    if (currentFilter === "target_met") {
      filtered = filtered.filter(g => g.current_price !== null && g.current_price <= g.target_price);
    } else if (currentFilter === "on_sale") {
      filtered = filtered.filter(g => g.discount > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      if (currentSort === "discount_desc") return b.discount - a.discount;
      if (currentSort === "price_asc") return (a.current_price || 0) - (b.current_price || 0);
      if (currentSort === "price_desc") return (b.current_price || 0) - (a.current_price || 0);
      if (currentSort === "title_asc") return a.name.localeCompare(b.name);
      if (currentSort === "date_added") return new Date(b.date_added) - new Date(a.date_added);
      return 0;
    });

    gamesGrid.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    filtered.forEach(game => {
      const card = createGameCard(game);
      gamesGrid.appendChild(card);
    });
  }

  function createGameCard(game) {
    const card = document.createElement("div");
    card.className = "game-card";

    const isTargetMet = game.current_price !== null && game.target_price > 0 && game.current_price <= game.target_price;
    const formattedPrice = game.current_price !== null ? formatCurrency(game.current_price, game.currency) : "N/A";
    const formattedOrigPrice = (game.original_price && game.discount > 0) ? formatCurrency(game.original_price, game.currency) : "";
    const formattedTarget = formatCurrency(game.target_price, game.currency);

    // Progress bar calculation
    let fillPct = 100;
    if (game.current_price && game.target_price) {
      fillPct = Math.min(100, Math.round((game.target_price / game.current_price) * 100));
    }

    card.innerHTML = `
      <div class="game-cover">
        <img src="${game.image}" alt="${escapeHtml(game.name)}" onerror="this.src='https://via.placeholder.com/280x140?text=No+Cover'"/>
        ${game.discount > 0 ? `<div class="badge-discount">-${game.discount}%</div>` : ""}
        <div class="badge-status ${isTargetMet ? "met" : "tracking"}">
          ${isTargetMet ? "🎯 Target Met!" : "Tracking"}
        </div>
      </div>
      <div class="game-body">
        <a href="${game.url}" target="_blank" rel="noopener" class="game-title" title="${escapeHtml(game.name)}">
          ${escapeHtml(game.name)}
        </a>
        
        <div class="price-section">
          <div>
            <span class="current-price ${game.discount > 0 ? "discounted" : ""}">${formattedPrice}</span>
            ${formattedOrigPrice ? `<span class="original-price">${formattedOrigPrice}</span>` : ""}
          </div>
        </div>

        <div class="target-price-info">
          <span>Target Price</span>
          <span class="target-price-value">${formattedTarget}</span>
        </div>

        <div class="price-progress-bg">
          <div class="price-progress-fill" style="width: ${fillPct}%"></div>
        </div>

        <div class="game-card-footer">
          <button class="btn btn-secondary btn-icon btn-history" title="Price History" style="flex:1;">
            📈 History
          </button>
          <button class="btn btn-secondary btn-icon btn-edit-target" title="Edit Target">
            ✏️
          </button>
          <button class="btn btn-danger-outline btn-icon btn-remove" title="Remove Game">
            🗑️
          </button>
        </div>
      </div>
    `;

    // Attach card event listeners
    card.querySelector(".btn-history").addEventListener("click", () => openPriceHistoryChart(game));
    card.querySelector(".btn-edit-target").addEventListener("click", () => openEditTargetModal(game));
    card.querySelector(".btn-remove").addEventListener("click", async () => {
      if (confirm(`Remove "${game.name}" from your tracking list?`)) {
        await db.removeGame(game.appid);
        showToast(`Removed ${game.name}`, "info");
        await loadAndRenderGames();
      }
    });

    return card;
  }

  // --- API Search Implementation ---

  async function performSearch(query) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
      searchSpinner.style.display = "none";

      if (!res.ok) {
        throw new Error("API search failed");
      }

      const results = await res.json();
      searchResultsList.innerHTML = "";

      if (results.length === 0) {
        searchResultsList.innerHTML = `<div style="text-align:center; color: var(--text-dim); padding: 20px;">No games found matching "${escapeHtml(query)}"</div>`;
        return;
      }

      results.forEach(item => {
        const row = document.createElement("div");
        row.className = "search-item";
        
        const isTracked = trackedGames.some(g => g.appid === item.appid);
        const itemPrice = item.price !== null ? formatCurrency(item.price, item.currency) : "N/A";
        const origPrice = item.original_price && item.discount > 0 ? `<span style="text-decoration:line-through;color:var(--text-dim);font-size:0.8rem;margin-left:6px;">${formatCurrency(item.original_price, item.currency)}</span>` : "";

        row.innerHTML = `
          <img src="${item.image}" alt="${escapeHtml(item.name)}" onerror="this.src='https://via.placeholder.com/100x46?text=Steam'"/>
          <div class="search-item-info">
            <div class="search-item-title">${escapeHtml(item.name)}</div>
            <div class="search-item-price">
              ${itemPrice} ${origPrice}
              ${item.discount > 0 ? `<span class="badge-discount" style="position:static;display:inline-block;margin-left:6px;font-size:0.75rem;padding:2px 6px;">-${item.discount}%</span>` : ""}
            </div>
          </div>
          <button class="btn ${isTracked ? "btn-secondary" : "btn-steam"} btn-add-track" ${isTracked ? "disabled" : ""}>
            ${isTracked ? "Tracked" : "+ Track"}
          </button>
        `;

        if (!isTracked) {
          row.querySelector(".btn-add-track").addEventListener("click", async () => {
            const targetPrompt = prompt(`Set your target alert price for "${item.name}":`, item.price || 0);
            if (targetPrompt === null) return; // User cancelled

            const targetVal = parseFloat(targetPrompt);
            if (isNaN(targetVal) || targetVal < 0) {
              showToast("Invalid target price entered", "error");
              return;
            }

            await db.addGame(item, targetVal);
            showToast(`Added ${item.name} to tracking!`, "success");
            closeModal(searchModal);
            await loadAndRenderGames();
          });
        }

        searchResultsList.appendChild(row);
      });

    } catch (err) {
      searchSpinner.style.display = "none";
      console.error("Search error:", err);
      searchResultsList.innerHTML = `<div style="text-align:center; color: var(--danger); padding: 20px;">Failed to fetch search results. Check connection.</div>`;
    }
  }

  // --- Modal Helpers & Chart ---

  function openModal(modal) {
    modal.classList.add("open");
  }

  function closeModal(modal) {
    modal.classList.remove("open");
  }

  function openEditTargetModal(game) {
    currentGameForTargetEdit = game;
    editTargetGameTitle.textContent = game.name;
    editTargetInput.value = game.target_price;
    openModal(editTargetModal);
    setTimeout(() => editTargetInput.focus(), 100);
  }

  async function openPriceHistoryChart(game) {
    historyGameTitle.textContent = `${game.name} - Price History`;
    openModal(historyModal);

    const historyData = await db.getPriceHistory(game.appid);
    
    const labels = historyData.map(h => new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    const prices = historyData.map(h => h.price);

    const ctx = historyCanvas.getContext("2d");

    if (historyChartInstance) {
      historyChartInstance.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(102, 192, 244, 0.4)');
    gradient.addColorStop(1, 'rgba(102, 192, 244, 0.0)');

    historyChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Price (' + game.currency + ')',
            data: prices,
            borderColor: '#66c0f4',
            backgroundColor: gradient,
            borderWidth: 3,
            pointBackgroundColor: '#22c55e',
            pointRadius: 5,
            fill: true,
            tension: 0.2
          },
          {
            label: 'Target Price',
            data: Array(labels.length).fill(game.target_price),
            borderColor: '#ef4444',
            borderDash: [6, 6],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#f3f4f6' }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y, game.currency)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#9ca3af' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#9ca3af',
              callback: (value) => formatCurrency(value, game.currency)
            }
          }
        }
      }
    });
  }

  // --- Utility Functions ---

  function formatCurrency(amount, currency = "INR") {
    if (amount === null || amount === undefined) return "N/A";
    const symbol = currency === "INR" ? "₹" : (currency === "USD" ? "$" : `${currency} `);
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
});
