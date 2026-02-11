export const Settings = {
  async get(key, fallback = null) {
    const res = await chrome.storage.sync.get(key);
    return res[key] ?? fallback;
  },

  async set(key, value) {
    await chrome.storage.sync.set({ [key]: value });
  }
};
