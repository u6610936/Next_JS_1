import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// GET /api/user  -> list users (hide password) + hide DELETED users
export async function GET() {
  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db
      .collection("user")
      .find(
        { status: { $ne: "DELETED" } },
        { projection: { password: 0 } }
      )
      .toArray();

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json(
      { message: e?.toString?.() ?? "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/user -> create user
export async function POST(req) {
  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }

  const { username, email, password, firstname, lastname } = data ?? {};

  if (!username || !email || !password) {
    return NextResponse.json(
      { message: "Missing mandatory data (username/email/password)" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("user").insertOne({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      firstname: firstname ?? "",
      lastname: lastname ?? "",
      status: "ACTIVE",
    });

    return NextResponse.json(
      { id: result.insertedId.toString() },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    const msg = (e?.toString?.() ?? "").toLowerCase();
    let display = e?.toString?.() ?? "Unknown error";

    // รองรับทั้ง duplicate จาก unique index (11000) และข้อความ error ทั่วไป
    if (msg.includes("e11000") || msg.includes("duplicate")) {
      if (msg.includes("username")) display = "Duplicate Username!!";
      else if (msg.includes("email")) display = "Duplicate Email!!";
      else display = "Duplicate key!!";
    }

    return NextResponse.json({ message: display }, { status: 400, headers: corsHeaders });
  }
}