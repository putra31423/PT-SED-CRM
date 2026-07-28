import { ApiError } from "@workspace/api-client-react";

function responseMessage(error: ApiError): string | null {
  if (!error.data || typeof error.data !== "object") return null;
  const value = (error.data as Record<string, unknown>).error;
  return typeof value === "string" && value.trim() ? value : null;
}

export function formatApiError(
  error: unknown,
  fallback = "Terjadi kesalahan.",
): string {
  if (error instanceof ApiError) {
    const message = responseMessage(error);
    if (message) return message;

    if (error.status === 401)
      return "Sesi login berakhir. Silakan login kembali.";
    if (error.status === 403) return "Akun ini tidak memiliki akses ke CRM.";
    if (error.status === 404)
      return "Endpoint API tidak ditemukan. Pastikan deployment terbaru sudah aktif.";
    if (error.status === 409)
      return "Data yang sama sudah ada atau masih digunakan.";
    if (error.status >= 500)
      return "Layanan API sedang bermasalah. Coba lagi sebentar.";
  }

  if (error instanceof TypeError) {
    return "Tidak dapat terhubung ke API. Periksa koneksi dan deployment.";
  }

  return fallback;
}

export function shouldRetryApiError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}
