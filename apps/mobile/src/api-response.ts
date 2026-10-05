export type ApiError = {
  error?: {
    code?: string;
    message?: string;
    field?: string;
  };
};

export function decodeApiBody<T>(raw: string): T | ApiError | undefined {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as T | ApiError;
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }
}

export function getApiErrorMessage(status: number, body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as ApiError).error?.message === "string"
  ) {
    return (body as ApiError).error!.message!;
  }
  return `Falha na API (${status}).`;
}
