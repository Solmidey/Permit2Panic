module.exports = {
  getItem: async (key) =>
    typeof window === "undefined" ? null : window.localStorage.getItem(key),
  setItem: async (key, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};
