# Les e-mails d'authentification — Crosswell Pronostics

Les messages que Supabase envoie aux clients : confirmation d'inscription, lien de connexion,
réinitialisation du mot de passe. Par défaut, ce sont des gabarits en anglais, sans marque, qui
disent « Follow this link to confirm your user ». Ceux de ce dossier reprennent la charte de
l'app et parlent français.

**Ils ne se déploient pas.** Supabase ne les lit pas depuis le dépôt : ils se collent dans le
tableau de bord. Ce dossier est la source de vérité, le tableau de bord n'en est que la copie —
si vous modifiez un texte là-bas, reportez-le ici, sinon la prochaine relecture repartira d'une
version périmée.

## Où les coller

**Authentication → Emails → Templates**, un onglet par message. Pour chacun : remplacer le corps
par le contenu du fichier, et l'objet par celui du tableau.

| Onglet Supabase | Fichier | Objet à saisir |
| --- | --- | --- |
| Confirm signup | `confirmation-inscription.html` | `Confirmez votre adresse — Crosswell Pronostics` |
| Magic Link | `lien-de-connexion.html` | `Votre lien de connexion — Crosswell Pronostics` |
| Reset Password | `reinitialisation-mot-de-passe.html` | `Choisir un nouveau mot de passe — Crosswell Pronostics` |

Les trois autres onglets (`Invite user`, `Change Email Address`, `Reauthentication`) ne sont pas
utilisés par l'application : l'inscription est libre, et aucun écran ne change d'adresse. À faire
le jour où l'un d'eux servira — sans quoi le client recevra le gabarit anglais par défaut.

## Ce que les gabarits attendent

`{{ .ConfirmationURL }}` — la seule variable utilisée, dans le bouton et dans le lien de repli.
Supabase la remplace par l'adresse de confirmation, qui porte le jeton. **Ne jamais l'écrire
ailleurs que dans un `href`** : un lien recopié en clair dans un texte partagé donne l'accès au
compte à qui le lit.

Autres variables disponibles si besoin un jour : `{{ .Token }}` (le code à six chiffres),
`{{ .Email }}`, `{{ .SiteURL }}`.

## Le réglage qui casse tout, et qu'on oublie

**Authentication → URL Configuration.** Le lien du message ramène le client vers l'application :
l'app demande `…/inscription?etape=formule` après une inscription, `…/` après un lien de
connexion, `…/compte` après une réinitialisation (`src/auth/AuthContext.tsx`). Supabase REFUSE
une adresse de retour qui n'est pas déclarée, et retombe alors sur le *Site URL* — le client
atterrit ailleurs, souvent sur `localhost`, et croit le service cassé.

À déclarer dans **Redirect URLs** :

```
https://crosswell-pronostics.vercel.app/**
http://localhost:5190/**
```

et en **Site URL** : `https://crosswell-pronostics.vercel.app`.

(Le jour où le domaine définitif est tranché, ces trois valeurs changent — comme `VITE_URL_SITE`
et l'`APP_URL` des fonctions Stripe.)

## Écrits pour des logiciels de messagerie

Ce n'est pas du HTML de page web, et les libertés qu'on prend ailleurs ne passent pas ici :

- **tableaux imbriqués** et **styles en ligne** : Gmail retire les balises `<style>`, donc pas de
  classes, pas de variables de couleur, pas de `flex` ni de `grid` ;
- **aucune image** : Gmail et Outlook les bloquent par défaut, et un logo invisible vaut moins
  qu'un mot lisible — la marque est donc du texte ;
- **fond sombre en dur** (`#0A0C0B`, `#0F1311`), comme l'app, sans dépendre du thème du client ;
- **600 px** de large, la seule largeur qui passe partout, avec `max-width:100%` pour le
  téléphone ;
- un **pré-en-tête** masqué : c'est la ligne que la liste des messages affiche à côté de l'objet.

Les couleurs viennent de `src/index.css` : accent `#2EE58F`, encre sur accent `#07120C`, texte
`#EEF2EF`, secondaire `#B7C2BC`, bordure `#1F2622`. À garder identiques.

## Le ton

Même règle que partout : **aucun vocabulaire de jeu d'argent**, aucune promesse de gain, aucune
heure de publication annoncée. Le pied de chaque message reprend l'avertissement de
`src/config/app.ts` (analyses statistiques, ni conseil ni incitation, 18 ans et plus) et l'adresse
de contact.

## Vérifier, après avoir collé

1. Ouvrir chaque fichier dans un navigateur pour la mise en page (c'est indicatif : seul un vrai
   envoi dit la vérité).
2. Créer un compte d'essai avec une adresse à soi, et lire le message reçu : logo, bouton,
   français, et surtout le lien qui ramène bien dans l'application.
3. Vérifier le retour : après confirmation, l'app doit s'ouvrir sur le choix de la formule
   (`/inscription?etape=formule`) — pas sur `localhost`, pas sur une page d'erreur.
4. Recommencer pour « mot de passe oublié » depuis l'écran de connexion.
