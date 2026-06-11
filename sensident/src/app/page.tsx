import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import { Shield, Lock, Heart, Smartphone, FileText, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* HERO */}
      <section className="mx-auto max-w-4xl px-6 pt-12 md:pt-20">
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <Logo size="xl" showText={false} className="mb-4" />
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Sensident</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              La prevention bucco-dentaire, en confiance.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Service offert par votre dentiste. Heberge en France, sans IA.
            </p>
          </div>

          {/* Hero image */}
          <div className="rounded-xl overflow-hidden border border-border bg-muted/30">
            <Image
              src="/images/hero-banner.png"
              alt="Sensident - prevention bucco-dentaire"
              width={1920}
              height={1080}
              className="w-full h-auto"
              priority
            />
          </div>

          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Creer un compte praticien
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* VALEURS */}
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Pourquoi Sensident</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ValueCard
            icon={<Lock className="h-6 w-6" />}
            title="100% France"
            description="Donnees hebergees en France, sur infrastructure certifiee HDS (Hébergeur de Donnees de Santé)."
          />
          <ValueCard
            icon={<Shield className="h-6 w-6" />}
            title="Sans IA"
            description="Aucun appel a OpenAI, Anthropic, ou autre. Algorithmes deterministes et auditables."
          />
          <ValueCard
            icon={<Heart className="h-6 w-6" />}
            title="Service offert"
            description="C'est votre dentiste qui vous envoie la prevention, pas une marque commerciale."
          />
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Comment ça marche</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Step
            n={1}
            icon={<Users className="h-5 w-5" />}
            title="Votre dentiste vous invite"
            description="Au fauteuil via QR code, ou par email avec un lien personnel."
          />
          <Step
            n={2}
            icon={<FileText className="h-5 w-5" />}
            title="Vous recevez des articles"
            description="1 a 2 newsletters par mois, avec un article de prevention valide par un comite scientifique."
          />
          <Step
            n={3}
            icon={<Smartphone className="h-5 w-5" />}
            title="Vous lisez, vous appliquez"
            description="Format 5 slides mobile, ou article long pour ceux qui veulent creuser."
          />
        </div>
      </section>

      {/* ESPACE DENTISTE */}
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <div className="rounded-xl border border-border bg-muted/30 p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Espace dentiste</h2>
          <p className="text-sm text-muted-foreground">
            Pilotez vos newsletters de prevention, suivez l'engagement de vos patients,
            personnalisez le rendu. Le tout en conformite HDS, RGPD et ONCD.
          </p>
          <ul className="ml-4 list-disc text-sm text-muted-foreground space-y-1">
            <li>5 modeles visuels pre-etablis (moderne, chaleureux, classique, epure, premium)</li>
            <li>Dashboard analytics (entree par article, heatmap horaire, segmentation)</li>
            <li>Liens d'invitation (QR code + URL partageable)</li>
            <li>Conformite RGPD, droit a l'effacement, export des donnees patient</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Creer un compte praticien
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* PATIENT */}
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <div className="rounded-lg border border-border bg-background p-6 space-y-2">
          <h3 className="text-sm font-semibold">Vous etes patient·e ?</h3>
          <p className="text-sm text-muted-foreground">
            Vous avez recu un lien d'invitation de votre dentiste ? Suivez-le pour acceder
            a votre espace personnel. Si vous n'avez pas de lien, contactez votre praticien.
          </p>
        </div>
      </section>

      <footer className="mx-auto max-w-4xl px-6 py-12 text-xs text-muted-foreground text-center md:text-left space-y-2">
        <p>
          Sensident MVP — No-AI by design · Hebergement HDS · Donnees 100% en France
        </p>
        <p>
          <Link href="/cgu" className="underline mr-3">CGU</Link>
          <Link href="/politique-confidentialite" className="underline">Politique de confidentialite</Link>
        </p>
        <p className="text-[10px]">© 2026 Sensident. Tous droits reserves.</p>
      </footer>
    </main>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-5 space-y-2">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({ n, icon, title, description }: { n: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {n}
        </span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <h3 className="font-semibold ml-11">{title}</h3>
      <p className="text-sm text-muted-foreground ml-11">{description}</p>
    </div>
  );
}
