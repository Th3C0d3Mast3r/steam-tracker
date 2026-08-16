/**
 * SteamTrackerDB - Client-side IndexedDB Storage Layer
 */
class SteamTrackerDB {
  constructor() {
    this.dbName = "SteamTrackerDB";
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for tracked games (keyed by appid)
        if (!db.objectStoreNames.contains("tracked_games")) {
          const gameStore = db.createObjectStore("tracked_games", { keyPath: "appid" });
          gameStore.createIndex("name", "name", { unique: false });
          gameStore.createIndex("date_added", "date_added", { unique: false });
        }

        // Store for historical price records
        if (!db.objectStoreNames.contains("price_history")) {
          const historyStore = db.createObjectStore("price_history", { keyPath: "id", autoIncrement: true });
          historyStore.createIndex("appid", "appid", { unique: false });
          historyStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async getAllGames() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tracked_games", "readonly");
      const store = tx.objectStore("tracked_games");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getGame(appid) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tracked_games", "readonly");
      const store = tx.objectStore("tracked_games");
      const request = store.get(Number(appid));

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async addGame(gameData, targetPrice) {
    await this.init();
    const appid = Number(gameData.appid);
    const now = new Date().toISOString();

    const trackedGame = {
      appid: appid,
      name: gameData.name,
      url: gameData.url,
      image: gameData.image,
      target_price: parseFloat(targetPrice) || 0,
      current_price: gameData.price !== null ? parseFloat(gameData.price) : null,
      original_price: gameData.original_price !== null ? parseFloat(gameData.original_price) : null,
      discount: gameData.discount || 0,
      currency: gameData.currency || "INR",
      release_date: gameData.release_date || null,
      review_summary: gameData.review_summary || null,
      date_added: now
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["tracked_games", "price_history"], "readwrite");
      const gameStore = tx.objectStore("tracked_games");
      const historyStore = tx.objectStore("price_history");

      gameStore.put(trackedGame);

      // Log initial price entry if price is known
      if (trackedGame.current_price !== null) {
        historyStore.add({
          appid: appid,
          price: trackedGame.current_price,
          original_price: trackedGame.original_price,
          discount: trackedGame.discount,
          timestamp: now
        });
      }

      tx.oncomplete = () => resolve(trackedGame);
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateGame(trackedGame) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tracked_games", "readwrite");
      const store = tx.objectStore("tracked_games");
      const request = store.put(trackedGame);

      request.onsuccess = () => resolve(trackedGame);
      request.onerror = () => reject(request.error);
    });
  }

  async removeGame(appid) {
    await this.init();
    const targetAppid = Number(appid);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["tracked_games", "price_history"], "readwrite");
      const gameStore = tx.objectStore("tracked_games");
      const historyStore = tx.objectStore("price_history");

      gameStore.delete(targetAppid);

      // Also clean up history records for this game
      const index = historyStore.index("appid");
      const request = index.openCursor(IDBKeyRange.only(targetAppid));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async logPriceHistory(appid, price, original_price = null, discount = 0) {
    await this.init();
    const appidNum = Number(appid);
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("price_history", "readwrite");
      const store = tx.objectStore("price_history");
      const request = store.add({
        appid: appidNum,
        price: parseFloat(price),
        original_price: original_price !== null ? parseFloat(original_price) : null,
        discount: Number(discount),
        timestamp: now
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPriceHistory(appid) {
    await this.init();
    const appidNum = Number(appid);

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("price_history", "readonly");
      const store = tx.objectStore("price_history");
      const index = store.index("appid");
      const request = index.getAll(IDBKeyRange.only(appidNum));

      request.onsuccess = () => {
        const results = request.result || [];
        results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async exportData() {
    const games = await this.getAllGames();
    await this.init();
    
    const history = await new Promise((resolve, reject) => {
      const tx = this.db.transaction("price_history", "readonly");
      const store = tx.objectStore("price_history");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    return {
      version: 1,
      exported_at: new Date().toISOString(),
      tracked_games: games,
      price_history: history
    };
  }

  async importData(data) {
    if (!data || !Array.isArray(data.tracked_games)) {
      throw new Error("Invalid import data format.");
    }

    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["tracked_games", "price_history"], "readwrite");
      const gameStore = tx.objectStore("tracked_games");
      const historyStore = tx.objectStore("price_history");

      data.tracked_games.forEach((game) => {
        gameStore.put(game);
      });

      if (Array.isArray(data.price_history)) {
        data.price_history.forEach((record) => {
          delete record.id; // Allow auto-increment
          historyStore.add(record);
        });
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async seedDemoData() {
    const existing = await this.getAllGames();
    if (existing.length > 0) return;

    const demoGames = [
      {
        appid: 1174180,
        name: "Red Dead Redemption 2",
        url: "https://store.steampowered.com/app/1174180/Red_Dead_Redemption_2/",
        image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg",
        target_price: 1500,
        current_price: 1319,
        original_price: 3999,
        discount: 67,
        currency: "INR",
        release_date: "5 Dec, 2019",
        review_summary: "Overwhelmingly Positive"
      },
      {
        appid: 292030,
        name: "The Witcher 3: Wild Hunt",
        url: "https://store.steampowered.com/app/292030/The_Witcher_3_Wild_Hunt/",
        image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg",
        target_price: 500,
        current_price: 449,
        original_price: 1799,
        discount: 75,
        currency: "INR",
        release_date: "18 May, 2015",
        review_summary: "Overwhelmingly Positive"
      },
      {
        appid: 1091500,
        name: "Cyberpunk 2077",
        url: "https://store.steampowered.com/app/1091500/Cyberpunk_2077/",
        image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg",
        target_price: 1800,
        current_price: 1499,
        original_price: 2999,
        discount: 50,
        currency: "INR",
        release_date: "9 Dec, 2020",
        review_summary: "Very Positive"
      }
    ];

    for (const g of demoGames) {
      await this.addGame(g, g.target_price);
      // add a couple historical data points for demo chart richness
      const past1 = new Date(Date.now() - 30 * 86400000).toISOString();
      const past2 = new Date(Date.now() - 15 * 86400000).toISOString();
      await this.logPriceHistory(g.appid, g.original_price, g.original_price, 0);
      await this.logPriceHistory(g.appid, g.current_price, g.original_price, g.discount);
    }
  }
}

const db = new SteamTrackerDB();
