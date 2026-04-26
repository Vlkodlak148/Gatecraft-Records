export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import getSQL from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const sql = getSQL();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  try {
    let records;
    if (category && search) {
      records = await sql`SELECT * FROM records WHERE category = ${category} AND player ILIKE ${'%' + search + '%'} ORDER BY created_at DESC`;
    } else if (category) {
      records = await sql`SELECT * FROM records WHERE category = ${category} ORDER BY created_at DESC`;
    } else if (search) {
      records = await sql`SELECT * FROM records WHERE player ILIKE ${'%' + search + '%'} OR category ILIKE ${'%' + search + '%'} ORDER BY created_at DESC`;
    } else {
      records = await sql`SELECT * FROM records ORDER BY created_at DESC`;
    }
    return NextResponse.json(records);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sql = getSQL();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const body = await req.json();
  const { player, category, value, record_type, proof_url, notes, achieved_at, recaptchaToken } = body;

  const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
  });
  const recaptchaData = await recaptchaRes.json();
  if (!recaptchaData.success || recaptchaData.score < 0.5) {
    return NextResponse.json({ error: 'reCAPTCHA failed' }, { status: 400 });
  }
  if (!player || !category || !value || !achieved_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  try {
    const result = await sql`
      INSERT INTO records (player, category, value, record_type, proof_url, notes, achieved_at, discord_id, discord_username, status)
      VALUES (${player}, ${category}, ${value}, ${record_type || 'time'}, ${proof_url || null}, ${notes || null}, ${achieved_at}, ${(session.user as any).discordId || null}, ${session.user.name || null}, 'pending')
      RETURNING *
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
