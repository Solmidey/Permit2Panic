type KV = Record<string, string>;
const mem: KV = {};

function getStore() {
  if (typeof window !== "undefined" && window?.localStorage) return window.localStorage;
  return null;
}

const AsyncStorage = {
  async getItem(key: string) {
    const s = getStore();
    return s ? s.getItem(key) : (key in mem ? mem[key] : null);
  },
  async setItem(key: string, value: string) {
    const s = getStore();
    if (s) s.setItem(key, value);
    else mem[key] = String(value);
  },
  async removeItem(key: string) {
    const s = getStore();
    if (s) s.removeItem(key);
    else delete mem[key];
  },
  async clear() {
    const s = getStore();
    if (s) s.clear();
    else Object.keys(mem).forEach((k) => delete mem[k]);
  },
  async getAllKeys() {
    const s = getStore();
    return s ? Object.keys(s) : Object.keys(mem);
  },
};

export default AsyncStorage;
export const getItem = AsyncStorage.getItem;
export const setItem = AsyncStorage.setItem;
export const removeItem = AsyncStorage.removeItem;
export const clear = AsyncStorage.clear;
export const getAllKeys = AsyncStorage.getAllKeys;
