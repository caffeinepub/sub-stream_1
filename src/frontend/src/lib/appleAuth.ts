/**
 * Sign in with Apple — uses Apple's JS SDK (loaded on demand).
 * Requires VITE_APPLE_CLIENT_ID (Service ID) to be set in the environment.
 *
 * Flow:
 *  1. Load Apple's auth JS on demand.
 *  2. Init with the Service ID and redirect URI.
 *  3. Open Apple's sign-in page in a popup.
 *  4. Parse the ID token for name + email.
 */

export interface AppleProfile {
  email: string;
  name: string;
  sub: string; // stable Apple user ID
}

let appleScriptLoaded = false;

function loadAppleScript(): Promise<void> {
  if (appleScriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("apple-auth");
    if (existing) {
      appleScriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "apple-auth";
    script.src =
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.onload = () => {
      appleScriptLoaded = true;
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Failed to load Apple Sign In script"));
    document.head.appendChild(script);
  });
}

/** Decode the payload of a JWT without verification (client-side only). */
function decodeJwtPayload(token: string): Record<string, string> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function signInWithApple(): Promise<AppleProfile> {
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error(
      "Apple Sign In is not configured. Please add VITE_APPLE_CLIENT_ID to your environment variables.",
    );
  }

  await loadAppleScript();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AppleID = (window as any).AppleID;
  if (!AppleID?.auth) {
    throw new Error("Apple Sign In SDK failed to initialize.");
  }

  const redirectUri =
    (import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined) ??
    window.location.origin;

  AppleID.auth.init({
    clientId,
    scope: "name email",
    redirectURI: redirectUri,
    usePopup: true,
  });

  const response = (await AppleID.auth.signIn()) as {
    authorization?: { id_token?: string; code?: string };
    user?: { name?: { firstName?: string; lastName?: string }; email?: string };
  };

  const idToken = response?.authorization?.id_token;
  if (!idToken) throw new Error("Apple did not return an ID token");

  const payload = decodeJwtPayload(idToken);

  // Apple only provides name on the FIRST login — use user object if available
  const firstName = response?.user?.name?.firstName ?? "";
  const lastName = response?.user?.name?.lastName ?? "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    payload.email?.split("@")[0] ||
    "Apple User";

  return {
    email: (response?.user?.email ?? payload.email ?? "").toLowerCase(),
    name: fullName,
    sub: payload.sub ?? "",
  };
}
