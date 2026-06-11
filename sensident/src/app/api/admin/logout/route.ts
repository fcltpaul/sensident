import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/lib/admin-auth';

export async function POST() {
  await destroyAdminSession();
  return NextResponse.redirect(new URL('/admin-auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
