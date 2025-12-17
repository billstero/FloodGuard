// firestore.js - VERSI BYPASS (Agar server tidak crash)
const db = {
  collection: (name) => ({
    add: async (data) => console.log(`[MOCK DB] Simpan ke ${name}:`, data),
    get: async () => ({ empty: true, docs: [] }),
    doc: (id) => ({
      set: async (data) => console.log(`[MOCK DB] Update doc ${id}:`, data),
      get: async () => ({ exists: false, data: () => null })
    })
  })
};

module.exports = { db };