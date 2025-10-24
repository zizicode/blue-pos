// useApi.ts
import { api } from "./api";

export function useApi() {
  const call = async <T = any>(controller: string, method: string, data?: any) => {
    const res = await api<T>(controller, method, data);
    return res;
  };

  return { call };
}
