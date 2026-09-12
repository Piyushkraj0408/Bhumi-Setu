export const tokenStore = {
  getAccess: (): string | null => localStorage.getItem("access_token"),
  getRefresh: (): string | null => localStorage.getItem("refresh_token"),
  set: (access: string, refresh: string) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};
