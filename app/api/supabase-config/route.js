import { NextResponse } from 'next/server';

// 런타임에 서버 환경 변수에서 읽어서 클라이언트에 전달.
// Netlify에서 SUPABASE_DATABASE_URL / SUPABASE_ANON_KEY 만 써도 동작함.
export async function GET() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: 'Supabase config missing', hint: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or SUPABASE_DATABASE_URL / SUPABASE_ANON_KEY) in env.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { url, anonKey },
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
