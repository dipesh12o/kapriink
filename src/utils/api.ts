/**
 * Safe API client utilities for KaprInk Tattoo Studio.
 * Prevents "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" errors
 * by validating HTTP status and Content-Type headers before parsing responses.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Safely fetches an API endpoint and parses the response.
 * Handles HTML error responses (such as 404, 502, 504 from Render/Vercel) gracefully.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  endpointLabel?: string
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const signal = init?.signal || controller.signal;

  try {
    const res = await fetch(input, { ...init, signal });
    clearTimeout(timeoutId);
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      let errorMessage = `Server error (HTTP ${res.status})`;

      if (isJson) {
        try {
          const body = await res.json();
          errorMessage = body.message || body.error || errorMessage;
        } catch {
          // Keep default message if json parse fails
        }
      } else {
        // Response is non-JSON (e.g. HTML from Express default 404, Cloudflare, Render, or Vercel)
        if (res.status === 404) {
          errorMessage = `Endpoint ${endpointLabel ? `"${endpointLabel}" ` : ""}was not found on the backend (HTTP 404). Please verify that the latest backend deployment is live on Render.`;
        } else if (res.status === 502 || res.status === 503 || res.status === 504) {
          errorMessage = `Backend service is temporarily sleeping or restarting (HTTP ${res.status}). Please wait a few seconds and refresh.`;
        } else if (res.status === 401) {
          errorMessage = "Your session has expired or is unauthorized. Please log in again.";
        } else if (res.status === 403) {
          errorMessage = "You do not have permission to perform this action.";
        } else {
          errorMessage = `Server returned an unexpected response (HTTP ${res.status}).`;
        }
      }

      return { ok: false, status: res.status, error: errorMessage };
    }

    if (!isJson) {
      return {
        ok: false,
        status: res.status,
        error: `Expected JSON data from backend, but received ${contentType || "HTML"} (HTTP ${res.status}).`
      };
    }

    const data: T = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return {
        ok: false,
        status: 408,
        error: "Request timed out. The server took too long to respond. Please try again."
      };
    }
    const isNetworkError = err.message === "Failed to fetch" || err.name === "TypeError";
    const userFriendlyMessage = isNetworkError
      ? "Unable to connect to the backend server. Please verify your internet connection or check if the backend service is running."
      : err.message || "An unexpected error occurred.";

    return {
      ok: false,
      status: 0,
      error: userFriendlyMessage
    };
  }
}
