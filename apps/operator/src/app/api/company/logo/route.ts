import { uploadImageToImgbb } from "@isp/core/services/imgbb.service";
import { apiError, rejectDemoWrite, requirePermission } from "@isp/core/utils/api.utils";
import { NextResponse } from "next/server";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (ImageBB free tier limit)

export async function POST(request: Request) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("COMPANY_WRITE");
  if (error) return error;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    let base64 = "";
    let name = "company-logo";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return apiError("No image file provided", 400);
      }
      if (!file.type.startsWith("image/")) {
        return apiError("File must be an image (PNG, JPG, WebP, etc.)", 400);
      }
      if (file.size > MAX_BYTES) {
        return apiError("Image must be under 4 MB", 400);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      base64 = buffer.toString("base64");
      name = file.name.replace(/\.[^.]+$/, "") || name;
    } else {
      const body = await request.json();
      const image = String(body.image ?? "");
      if (!image) return apiError("No image data provided", 400);
      base64 = image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      name = String(body.name ?? name);
      if (base64.length > MAX_BYTES * 1.4) {
        return apiError("Image must be under 4 MB", 400);
      }
    }

    const uploaded = await uploadImageToImgbb(base64, name);

    return NextResponse.json({
      ok: true,
      url: uploaded.display_url || uploaded.url,
      direct_url: uploaded.url,
      delete_url: uploaded.delete_url,
    });
  } catch (err) {
    return apiError(
      "Logo upload failed",
      500,
      err instanceof Error ? err.message : "Unknown error"
    );
  }
}
