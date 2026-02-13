import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400, headers: corsHeaders }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Only image files allowed" },
        { status: 400, headers: corsHeaders }
      );
    }

    // ร้างโฟลเดอร์อัตโนมัติ กันลืมสร้าง public/profile-images
    const dirPath = path.join(process.cwd(), "public", "profile-images");
    await fs.mkdir(dirPath, { recursive: true });

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const filename = `${uuidv4()}.${ext}`;
    const savePath = path.join(dirPath, filename);

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(savePath, Buffer.from(arrayBuffer));

    const client = await getClientPromise();
    const db = client.db("wad-01");

    await db.collection("user").updateOne(
      { email: user.email },
      { $set: { profileImage: `/profile-images/${filename}` } }
    );

    return NextResponse.json(
      { imageUrl: `/profile-images/${filename}` },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.log("UPLOAD IMAGE ERROR:", err);
    return NextResponse.json(
      { message: "Upload failed", error: err?.toString?.() || String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
