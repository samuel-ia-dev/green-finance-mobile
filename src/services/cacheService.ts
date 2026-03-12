import AsyncStorage from "@react-native-async-storage/async-storage";

export const cacheService = {
  async setItem<T>(key: string, value: T) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async getItem<T>(key: string, fallback: T | null = null) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  }
};
