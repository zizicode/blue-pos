import Toast from "@renderer/lib/toast";

export async function api<T = any>(
  controller: string,
  method: string,
  data?: any
): Promise<T | null> {
  try {
    const response: T = await window.api.call(controller, method, data);

    if ((response as any)?.error) {
      Toast.error((response as any).error || "Error desconocido");
      return null;
    }

    if(!(response as any).success) Toast.error((response as any).message || "Error desconocido");

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al conectar con el servidor";
    Toast.error(message);
    console.error("API Error:", err);
    return null;
  }
}
