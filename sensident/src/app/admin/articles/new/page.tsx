import { ArticleEditor } from '../editor';
import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';

export default async function NewArticlePage() {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');
  if (session.role === 'reader') redirect('/admin/articles');

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Nouvel article</h1>
        <p className="text-sm text-muted-foreground">RÃ©digez un nouvel article du catalogue. Il restera en brouillon tant que Dr Thibault ne l'a pas validÃ©.</p>
      </div>
      <ArticleEditor />
    </div>
  );
}
