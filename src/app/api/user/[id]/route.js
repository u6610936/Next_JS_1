import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// PATCH /api/user/:id  -> partial update
export async function PATCH(req, context) {
  // Next.js (ใหม่) params เป็น Promise ต้อง await ก่อน
  const { id } = await context.params;

  // validate ObjectId
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid user id" },
      { status: 400, headers: corsHeaders }
    );
  }

  // parse json safely
  let data = {};
  try {
    data = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }

  const partial = {};
  if (data.username != null) partial.username = data.username;
  if (data.email != null) partial.email = data.email;
  if (data.firstname != null) partial.firstname = data.firstname;
  if (data.lastname != null) partial.lastname = data.lastname;
  if (data.status != null) partial.status = data.status;

  // only hash when password is provided and not empty
  if (data.password != null && data.password !== "") {
    partial.password = await bcrypt.hash(data.password, 10);
  }

  // prevent empty update
  if (Object.keys(partial).length === 0) {
    return NextResponse.json(
      { message: "No fields to update" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const updated = await db
      .collection("user")
      .updateOne({ _id: new ObjectId(id) }, { $set: partial });

    // ถ้าไม่เจอ id ใน DB
    if (updated.matchedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(updated, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json(
      { message: e?.toString?.() || "Server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE /api/user/:id -> soft delete
export async function DELETE(req, context) {
  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid user id" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db
      .collection("user")
      .updateOne({ _id: new ObjectId(id) }, { $set: { status: "DELETED" } });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json(
      { message: e?.toString?.() || "Server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}