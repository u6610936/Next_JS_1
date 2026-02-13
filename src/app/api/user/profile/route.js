import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");
    const profile = await db.collection("user").findOne({ email: user.email });
    return NextResponse.json(profile, { headers: corsHeaders });
  } catch (err) {
    console.log("GET PROFILE ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error", error: err?.toString?.() || String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const body = await req.json();
    const firstname = (body.firstname ?? "").trim();
    const lastname = (body.lastname ?? "").trim();

    if (!firstname || !lastname) {
      return NextResponse.json(
        { message: "Missing firstname or lastname" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db("wad-01");

    await db.collection("user").updateOne(
      { email: user.email },
      { $set: { firstname, lastname } }
    );

    const updated = await db.collection("user").findOne({ email: user.email });
    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:", err);
    return NextResponse.json(
      { message: "Update failed", error: err?.toString?.() || String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
