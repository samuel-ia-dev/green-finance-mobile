import AsyncStorage from "@react-native-async-storage/async-storage";
import { cacheService } from "@/services/cacheService";

describe("cacheService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes and reads JSON cache", async () => {
    await cacheService.setItem("transactions", [{ id: 1 }]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('[{"id":1}]');

    const result = await cacheService.getItem("transactions");

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1 }]);
  });

  it("returns fallback for invalid cache", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("{bad-json");

    const result = await cacheService.getItem("settings", { theme: "dark" });

    expect(result).toEqual({ theme: "dark" });
  });

  it("returns fallback when cache key is empty and removes values", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const result = await cacheService.getItem("empty", []);
    await cacheService.removeItem("empty");

    expect(result).toEqual([]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("empty");
  });
});
