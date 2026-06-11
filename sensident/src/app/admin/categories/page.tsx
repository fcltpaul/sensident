import { db } from '@/db/client';
import { categories, articleCategories, articles } from '@/db/schema';
import { eq, sql, count } from 'drizzle-orm';
import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';

export default async function AdminCategoriesPage() {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');

  const all = await db.select().from(categories);
  const counts = await db
    .select({
      categoryId: articleCategories.categoryId,
      count: count(),
    })
    .from(articleCategories)
    .groupBy(articleCategories.categoryId);

  const countById = Object.fromEntries(counts.map((c) => [c.categoryId, c.count]));

  const roots = all.filter((c) => !c.parentId).sort((a, b) => a.position - b.position);
  const childrenByParent = new Map<string, typeof all>();
  for (const c of all) {
    if (c.parentId) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push(c);
      childrenByParent.set(c.parentId, arr);
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Hierarchie des themes pour classer les articles du catalogue.
        </p>
      </div>

      <div className="space-y-4">
        {roots.map((root) => {
          const children = childrenByParent.get(root.id) ?? [];
          return (
            <div key={root.id} className="rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-2 rounded"
                    style={{ backgroundColor: root.color ?? '#3B82F6' }}
                  />
                  <div>
                    <h2 className="font-semibold">{root.name}</h2>
                    {root.description && <p className="text-xs text-muted-foreground">{root.description}</p>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {children.length} sous-categorie{children.length > 1 ? 's' : ''}
                </span>
              </div>
              {children.length > 0 && (
                <table className="w-full text-sm">
                  <tbody>
                    {children.map((child) => (
                      <tr key={child.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-1 rounded"
                              style={{ backgroundColor: child.color ?? root.color ?? '#3B82F6' }}
                            />
                            <div>
                              <p className="font-medium">{child.name}</p>
                              {child.description && (
                                <p className="text-xs text-muted-foreground">{child.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {countById[child.id] ?? 0} article{(countById[child.id] ?? 0) > 1 ? 's' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
