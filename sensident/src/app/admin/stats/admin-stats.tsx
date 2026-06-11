'use client';

import { useState } from 'react';
import {
  BarChart3,
  Users,
  FileText,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

interface GlobalStats {
  cabinets: number;
  patients: number;
  reactions: number;
  reads: number;
  activationRate: number;
  reactionRate: number;
}

interface TopArticle {
  slug: string;
  title: string;
  up: number;
  down: number;
  score: number;
  reads: number;
  visibility: number;
}

interface CabinetRow {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | string;
  patients: number;
  articlesVisible: number;
  reads: number;
  reactions: number;
  score: number;
  activationRate: number;
}

interface Props {
  globalStats: GlobalStats;
  topArticles: TopArticle[];
  cabinets: CabinetRow[];
}

export function AdminStats({ globalStats, topArticles, cabinets }: Props) {
  const [expandedCabinet, setExpandedCabinet] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'score' | 'patients' | 'activationRate'>('score');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const sortedCabinets = [...cabinets].sort((a, b) => {
    const val = sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey];
    return val;
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Statistiques globales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agregation anonymisee de tous les cabinets
        </p>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 size={16} />
            <span>Cabinets actifs</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{globalStats.cabinets}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={16} />
            <span>Patients opt-in</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{globalStats.patients}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye size={16} />
            <span>Lectures totales</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{globalStats.reads}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ThumbsUp size={16} />
            <span>Reactions</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{globalStats.reactions}</p>
        </div>
      </div>

      {/* Ratios */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingUp size={16} />
            <span>Taux d&apos;activation</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{globalStats.activationRate}%</span>
            <span className="text-xs text-muted-foreground">
              ({globalStats.reads} lectures / {globalStats.patients} patients)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Patients ayant lu au moins un article
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <ThumbsUp size={16} />
            <span>Taux d&apos;engagement</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{globalStats.reactionRate}%</span>
            <span className="text-xs text-muted-foreground">
              ({globalStats.reactions} reactions / {globalStats.reads} lectures)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lecteurs ayant interagi (👍/👎)
          </p>
        </div>
      </div>

      {/* Top articles */}
      <div className="rounded-lg border border-border bg-background">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold">Top 10 articles (score global)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Score = 👍 - 👎, agrège tous cabinets
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Article</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">👍</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">👎</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Score</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Lectures</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Cabinets</th>
              </tr>
            </thead>
            <tbody>
              {topArticles.map((article, i) => (
                <tr key={article.slug} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/articles/${article.slug}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center text-green-600 font-medium">{article.up}</td>
                  <td className="px-3 py-3 text-center text-red-500 font-medium">{article.down}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-bold ${article.score >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {article.score > 0 ? '+' : ''}{article.score}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-muted-foreground hidden md:table-cell">{article.reads}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground hidden md:table-cell">{article.visibility}</td>
                </tr>
              ))}
              {topArticles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Aucune donnee disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cabinets drill-down */}
      <div className="rounded-lg border border-border bg-background">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Cabinets</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cabinets.length} cabinets · tries par score d&apos;engagement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSort('score')}
              className={`text-xs px-2 py-1 rounded border ${sortKey === 'score' ? 'bg-muted border-muted-foreground' : 'border-border'}`}
            >
              Score
            </button>
            <button
              onClick={() => toggleSort('patients')}
              className={`text-xs px-2 py-1 rounded border ${sortKey === 'patients' ? 'bg-muted border-muted-foreground' : 'border-border'}`}
            >
              Patients
            </button>
            <button
              onClick={() => toggleSort('activationRate')}
              className={`text-xs px-2 py-1 rounded border ${sortKey === 'activationRate' ? 'bg-muted border-muted-foreground' : 'border-border'}`}
            >
              Activation
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cabinet</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Patients</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Articles</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Lectures</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Reactions</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Activation</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Score</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {sortedCabinets.map((cab) => (
                <>
                  <tr
                    key={cab.id}
                    className="border-b border-border hover:bg-muted/20 cursor-pointer"
                    onClick={() => setExpandedCabinet(expandedCabinet === cab.id ? null : cab.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{cab.name}</div>
                      <div className="text-xs text-muted-foreground">{cab.slug}</div>
                    </td>
                    <td className="px-3 py-3 text-center">{cab.patients}</td>
                    <td className="px-3 py-3 text-center">{cab.articlesVisible}</td>
                    <td className="px-3 py-3 text-center">{cab.reads}</td>
                    <td className="px-3 py-3 text-center">{cab.reactions}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-medium ${cab.activationRate >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
                        {cab.activationRate}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold">{cab.score}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {expandedCabinet === cab.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </td>
                  </tr>
                  {/* Expanded row placeholder for future drill-down */}
                  {expandedCabinet === cab.id && (
                    <tr key={`${cab.id}-detail`} className="bg-muted/20">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Top articles de ce cabinet</p>
                            <p className="text-xs text-muted-foreground italic">
                              (disponible dans une version future avec heartbeat)
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Ratio activation</p>
                            <p className="text-base font-bold">{cab.activationRate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Engagement</p>
                            <p className="text-base font-bold">
                              {cab.reads > 0 ? Math.round((cab.reactions / cab.reads) * 100) : 0}%
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {cabinets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun cabinet inscrit
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
