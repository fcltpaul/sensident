/**
 * Lien d'évitement pour les utilisateurs clavier/lecteur d'écran.
 * Placé en tout début du body. Reste invisible jusqu'à réception du focus
 * (Tab), puis apparait en haut de l'ecran.
 *
 * L'ancre cible est `#main-content` qui doit être posée sur le <main> racine.
 */
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Aller au contenu principal
    </a>
  );
}