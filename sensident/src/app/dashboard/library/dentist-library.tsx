'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Star,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Clock,
  Send,
  Filter,
  X,
  Check,
  ChevronDown,
  Loader2,
  BarChart3,
  Mail,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
}

interface LibraryArticle {
  slug: string;
  title: string;
  excerpt: string;
  categoryCode: string;
  readingTimeMin: number;
  isVisible: boolean;
  isPinned: boolean;
  pinOrder: number;
  upCount: number;
  downCount: number;
  readingCount: number;
  sentCount: number;
  lastSentAt: string | null;
}

interface Patient {
  email: string;
  emailHash: string;
  confirmedAt: string;
}

interface Props {
  cabinetId: string;
  initialArticles: LibraryArticle[];
  initialCategories: Category[];
  initialPatients: Patient[];
}

export function DentistLibrary({
  cabinetId,
  initialArticles,
  initialCategories,
  initialPatients,
}: Props) {
  const router = useRouter();
  const [articles, setArticles] = useState<LibraryArticle[]>(initialArticles);
  const [categories] = useState<Category[]>(initialCategories);
  const [patients] = useState<Patient[]>(initialPatients);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [filterPinned, setFilterPinned] = useState<'all' | 'pinned' | 'unpinned'>('all');
  const [filterSent, setFilterSent] = useState<'all' | 'sent' | 'unsent'>('all');
  const [sendModal, setSendModal] = useState<{ slug: string; title: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  // Filter articles
  const filtered = articles.filter((a) => {
    if (filterCategory !== 'all' && a.categoryCode !== filterCategory) return false;
    if (filterStatus === 'visible' && !a.isVisible) return false;
    if (filterStatus === 'hidden' && a.isVisible) return false;
    if (filterPinned === 'pinned' && !a.isPinned) return false;
    if (filterPinned === 'unpinned' && a.isPinned) return false;
    if (filterSent === 'sent' && a.sentCount === 0) return false;
    if (filterSent === 'unsent' && a.sentCount > 0) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.excerpt.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Stats
  const stats = {
    visible: articles.filter((a) => a.isVisible).length,
    hidden: articles.filter((a) => !a.isVisible).length,
    totalReactions: articles.reduce((s, a) => s + a.upCount + a.downCount, 0),
    totalReads: articles.reduce((s, a) => s + a.readingCount, 0),
  };

  const toggleVisibility = async (slug: string, current: boolean) => {
    // Sauvegarde l'etat actuel pour rollback en cas d'echec API.
    const previous = articles;
    setArticles((prev) =>
      prev.map((a) => (a.slug === slug ? { ...a, isVisible: !current } : a))
    );

    try {
      const res = await fetch('/api/library/toggle-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleSlug: slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setArticles(previous);
        setSendMsg(`Erreur : ${data.error ?? `HTTP ${res.status}`}`);
      } else {
        router.refresh();
      }
    } catch {
      setArticles(previous);
      setSendMsg('Erreur reseau.');
    }
  };

  const togglePin = async (slug: string, current: boolean) => {
    // Sauvegarde l'etat actuel pour rollback en cas d'echec API.
    // (Le bug rapporte par Paul "l'etoile revient" etait un desync UI/BDD :
    // optimistic update cote UI OK mais l'API renvoyait 500 silencieux, donc
    // au refresh l'UI retrouvait l'etat BDD qui n'avait pas change.)
    const previous = articles;
    setArticles((prev) =>
      prev.map((a) => (a.slug === slug ? { ...a, isPinned: !current } : a))
    );

    try {
      const res = await fetch('/api/library/toggle-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleSlug: slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setArticles(previous);
        setSendMsg(`Erreur : ${data.error ?? `HTTP ${res.status}`}`);
      } else {
        // Force le SSR a relire la BDD pour eviter tout desync ulterieur.
        router.refresh();
      }
    } catch {
      setArticles(previous);
      setSendMsg('Erreur reseau.');
    }
  };

  const handleQuickSend = async () => {
    if (!selectedPatient || !sendModal) return;
    setSending(true);
    setSendMsg(null);
    try {
      const res = await fetch('/api/library/quick-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleSlug: sendModal.slug,
          patientEmailHash: selectedPatient,
        }),
      });
      if (res.ok) {
        setSendMsg('Article envoye au patient.');
      } else {
        const data = await res.json();
        setSendMsg(data.error || 'Erreur lors de l\'envoi.');
      }
    } catch {
      setSendMsg('Erreur reseau.');
    } finally {
      setSending(false);
    }
  };

  const getCategory = (code: string) =>
    categories.find((c) => c.code === code || c.id === code);

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bibliotheque d&apos;articles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerer les articles visibles pour vos patients
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen size={16} />
            <span>Articles visibles</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.visible}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <EyeOff size={16} />
            <span>Articles masques</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.hidden}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ThumbsUp size={16} />
            <span>Reactions</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.totalReactions}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 size={16} />
            <span>Lectures</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.totalReads}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
        >
          <option value="all">Tous statuts</option>
          <option value="visible">Visible</option>
          <option value="hidden">Masque</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
        >
          <option value="all">Toutes categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.code || cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>

        <select
          value={filterPinned}
          onChange={(e) => setFilterPinned(e.target.value as any)}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
        >
          <option value="all">Tous epingles</option>
          <option value="pinned">Epingles</option>
          <option value="unpinned">Non epingles</option>
        </select>

        <select
          value={filterSent}
          onChange={(e) => setFilterSent(e.target.value as any)}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
        >
          <option value="all">Tous envois</option>
          <option value="sent">Deja envoyes</option>
          <option value="unsent">Jamais envoyes</option>
        </select>
      </div>

      {/* Articles table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-10">
                  <Eye size={14} />
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Article
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Categorie
                </th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  <ThumbsUp size={14} className="inline" />
                </th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  <ThumbsDown size={14} className="inline" />
                </th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  <BarChart3 size={14} className="inline" />
                </th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Envoye
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-10">
                  <Star size={14} />
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => {
                const cat = getCategory(article.categoryCode);
                return (
                  <tr
                    key={article.slug}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {/* Visibility toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleVisibility(article.slug, article.isVisible)}
                        className={`p-1 rounded transition-colors ${
                          article.isVisible
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-300 hover:bg-gray-100'
                        }`}
                        title={article.isVisible ? 'Visible' : 'Masque'}
                      >
                        {article.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/articles/${article.slug}`)}
                          className="font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {article.title}
                        </button>
                        {article.isPinned && (
                          <Star size={12} className="text-yellow-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock size={10} />
                          {article.readingTimeMin} min
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {cat && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cat.color + '20', color: cat.color }}
                        >
                          {cat.icon} {cat.name}
                        </span>
                      )}
                    </td>

                    {/* Reactions */}
                    <td className="px-3 py-3 text-center hidden lg:table-cell">
                      <span className="text-green-600 text-xs font-medium">{article.upCount}</span>
                    </td>
                    <td className="px-3 py-3 text-center hidden lg:table-cell">
                      <span className="text-red-500 text-xs font-medium">{article.downCount}</span>
                    </td>

                    {/* Reading count */}
                    <td className="px-3 py-3 text-center hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{article.readingCount}</span>
                    </td>

                    {/* Sent count */}
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{article.sentCount}</span>
                    </td>

                    {/* Pin toggle */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => togglePin(article.slug, article.isPinned)}
                        className={`p-1 rounded transition-colors ${
                          article.isPinned
                            ? 'text-yellow-500 hover:bg-yellow-50'
                            : 'text-gray-300 hover:bg-gray-100'
                        }`}
                        title={article.isPinned ? 'Epingler' : 'Desepingler'}
                      >
                        <Star size={16} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/dashboard/newsletter?article=${encodeURIComponent(article.slug)}`)}
                          disabled={!article.isVisible}
                          className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Composer une newsletter avec cet article"
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => setSendModal({ slug: article.slug, title: article.title })}
                          disabled={!article.isVisible}
                          className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Envoyer a un patient"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 px-6">
            {articles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium">10 articles sont disponibles dans le catalogue Sensident.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choisissez-en un pour composer votre première newsletter en 2 minutes.
                </p>
                <button
                  onClick={() => router.push('/dashboard/newsletter')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
                >
                  <Mail className="h-4 w-4" />
                  Composer une newsletter
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                <Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium">Aucun article ne correspond aux filtres.</p>
                <button
                  onClick={() => {
                    setSearch('');
                    setFilterCategory('all');
                    setFilterStatus('all');
                    setFilterPinned('all');
                    setFilterSent('all');
                  }}
                  className="mt-3 text-xs text-primary underline"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick send modal */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Envoyer l&apos;article</h3>
              <button
                onClick={() => { setSendModal(null); setSelectedPatient(''); setSendMsg(null); }}
                className="p-1 rounded hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-1">Article</p>
            <p className="text-sm font-medium mb-4">{sendModal.title}</p>

            <p className="text-sm text-muted-foreground mb-1">Patient</p>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background mb-4"
            >
              <option value="">Selectionnez un patient</option>
              {patients.map((p) => (
                <option key={p.emailHash} value={p.emailHash}>
                  {p.email}
                </option>
              ))}
            </select>

            {sendMsg && (
              <div className={`text-sm p-3 rounded-lg mb-4 ${
                sendMsg.includes('envoye') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {sendMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setSendModal(null); setSelectedPatient(''); setSendMsg(null); }}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={handleQuickSend}
                disabled={!selectedPatient || sending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

