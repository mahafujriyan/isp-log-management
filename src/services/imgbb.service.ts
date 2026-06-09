import { env } from "@/config/env.config";

type ImgbbResponse = {
  data?: {
    url: string;
    display_url: string;
    delete_url?: string;
  };
  success?: boolean;
  status?: number;
  error?: { message?: string };
};

export async function uploadImageToImgbb(
  imageBase64: string,
  name?: string
): Promise<{ url: string; display_url: string; delete_url?: string }> {
  const apiKey = env.imgbb.apiKey;
  if (!apiKey) {
    throw new Error("IMGBB_API_KEY is not configured. Add it to .env.local");
  }

  const payload = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

  const body = new URLSearchParams();
  body.append("key", apiKey);
  body.append("image", payload);
  if (name) body.append("name", name.slice(0, 64));

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json()) as ImgbbResponse;

  if (!res.ok || !json.data?.url) {
    throw new Error(json.error?.message ?? "ImageBB upload failed");
  }

  return {
    url: json.data.url,
    display_url: json.data.display_url,
    delete_url: json.data.delete_url,
  };
}
