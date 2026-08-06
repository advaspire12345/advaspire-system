import { supabase } from "@/lib/supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Stream a local file straight from disk into Supabase Storage via expo-file-system's
// uploadAsync — the file is sent from disk in chunks, never loaded into JS memory, so
// large videos upload reliably (like other apps). Needs the native module (a fresh
// build); on a build without it the call throws and the caller falls back to the
// in-memory byte upload. Errors that DID reach the server carry `fatal: true` so the
// caller surfaces them instead of silently falling back.
export async function streamUploadToStorage(bucket: string, path: string, fileUri: string, contentType: string): Promise<string> {
  // Lazy require so a build lacking the native module never crashes at import.
  let FS: { uploadAsync?: (url: string, uri: string, opts: unknown) => Promise<{ status: number; body?: string }>; FileSystemUploadType?: { BINARY_CONTENT: number } };
  try { FS = require("expo-file-system/legacy"); } catch { throw new Error("streaming-unavailable"); }
  if (typeof FS?.uploadAsync !== "function" || !FS.FileSystemUploadType) throw new Error("streaming-unavailable");

  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw Object.assign(new Error("You're signed out. Please log in again."), { fatal: true });

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedPath}`;

  let res: { status: number; body?: string };
  try {
    res = await FS.uploadAsync(url, fileUri, {
      httpMethod: "POST",
      uploadType: FS.FileSystemUploadType.BINARY_CONTENT,
      headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY, "x-upsert": "false", "content-type": contentType },
    });
  } catch {
    // Native call failed (module missing in this build) → let the caller fall back.
    throw new Error("streaming-unavailable");
  }

  if (res.status === 200 || res.status === 201) return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  if (res.status === 413) throw Object.assign(new Error("Video is over the server's upload size limit — raise it in Supabase → Storage → Settings, or record a shorter clip."), { fatal: true });
  throw Object.assign(new Error(`Upload failed (${res.status}). ${res.body?.slice(0, 120) ?? ""}`), { fatal: true });
}
