/**
 * Google OAuth 2.0 — popup-based sign-in using Google Identity Services (GSI).
 * Requires VITE_GOOGLE_CLIENT_ID to be set in the environment.
 *
 * Flow:
 *  1. Load the GSI script on demand.
 *  2. Open a popup via google.accounts.oauth2.initTokenClient.
 *  3. Exchange the access token for the user's profile (name, email, picture).
 *  4. Return the profile to the caller.
 */

export interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
  sub: string; // stable Google user ID
}

let scriptLoaded = false;

function loadGsiScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("gsi-client");
    if (existing) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services script"));
    document.head.appendChild(script);
  });
}

export async function signInWithGoogle(): Promise<GoogleProfile> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error(
      "Google OAuth is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.",
    );
  }

  await loadGsiScript();

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services failed to initialize."));
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: async (tokenResponse: {
        access_token?: string;
        error?: string;
      }) => {
        if (tokenResponse.error || !tokenResponse.access_token) {
          reject(
            new Error(tokenResponse.error ?? "Google sign-in was cancelled"),
          );
          return;
        }
        try {
          const res = await fetch(
            `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`,
          );
          if (!res.ok) throw new Error("Failed to fetch Google user info");
          const data = (await res.json()) as GoogleProfile;
          resolve(data);
        } catch (err) {
          reject(err);
        }
      },
    });

    client.requestAccessToken({ prompt: "select_account" });
  });
}
