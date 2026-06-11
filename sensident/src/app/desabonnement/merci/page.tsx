export default function DesabonnementMerciPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-lg border border-border bg-background p-8 text-center">
        <h1 className="text-2xl font-bold">✓ Désabonnement confirmé</h1>
        <p className="text-sm text-muted-foreground">
          Vous ne recevrez plus de newsletters de ce cabinet. Si vous changez d'avis,
          contactez votre dentiste pour qu'il vous renvoie un lien d'inscription.
        </p>
        <a href="/" className="mt-4 inline-block text-sm text-accent hover:underline">
          Retour à l'accueil
        </a>
      </div>
    </main>
  );
}
