import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { provisionarPerfil } from '@/lib/auth-provisioning';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createServerSupabase();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      const meta = data.user.user_metadata as {
        nome?: string;
        telefone?: string;
        modo?: 'criar' | 'entrar';
        codigo_familia?: string;
      };

      await provisionarPerfil(supabase, data.user.id, {
        nome: meta.nome || data.user.email || 'Usuário',
        telefone: meta.telefone,
        modo: meta.modo || 'criar',
        codigoFamilia: meta.codigo_familia,
      });
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
