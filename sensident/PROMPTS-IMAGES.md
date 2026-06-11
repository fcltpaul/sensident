# Prompts d'images pour Sensident

> Pour generer avec **banana** (Google) ou equivalent.
> Format recommande : 1024x1024 ou 2048x2048 pour les visuels, 16:9 pour les bannieres.

---

## 1. Logo Sensident (principal)

**Dimensions** : 1024x1024 (carre, fond transparent)
**Variantes a generer** : 1 logo + 1 favicon simplifie

**Prompt** :
```
Minimalist modern logo for "Sensident" dental prevention platform.
Clean sans-serif typography, "Sens" + "Ident" combined.
A subtle tooth or smile motif integrated into the letter "i" or as a small accent.
Color palette: deep navy blue (#0F172A) primary, sky blue (#38BDF8) accent.
White background, vector style, no gradients, scalable to any size.
Should feel trustworthy, professional, medical, French.
```

**Variante monochrome** (pour fonds colores) :
```
Same Sensident logo, but entirely in white (#FFFFFF) for use on dark backgrounds.
No transparency, clean edges.
```

---

## 2. Favicon

**Dimensions** : 512x512 (carre, fond transparent)
**Usage** : favicon, app icon mobile

**Prompt** :
```
Single letter "S" mark for Sensident dental app icon.
Bold geometric S in deep navy blue on soft mint background (#CCFBF1).
Modern flat design, no text, suitable for small sizes.
Should remain recognizable at 16x16 pixels.
```

---

## 3. Visuel hero (page d'accueil)

**Dimensions** : 1920x1080 (16:9)
**Usage** : bandeau hero de la landing page

**Prompt** :
```
Modern flat illustration for a dental prevention platform.
Center: a friendly dentist silhouette (gender-neutral) holding a tablet,
showing an article about oral health to a smiling patient.
Style: geometric, soft pastel colors (sky blue, mint green, soft coral).
Background: abstract dental-themed elements (tooth shape, toothbrush, dental floss)
floating gently, very light.
Feel: warm, educational, not clinical.
No text in the image. Aspect ratio 16:9.
```

---

## 4. Mockup landing R1 (inscription patient)

**Dimensions** : 1024x1280 (portrait, format mobile)
**Usage** : capture d'ecran dans la documentation, mockup marketing

**Prompt** :
```
Mobile phone mockup displaying a clean, professional dental newsletter signup page.
Header: "Cabinet du Dr Dupont vous accompagne dans votre prevention bucco-dentaire".
Below: email input field, opt-in checkboxes, large "Je m'inscris" button in navy.
Background: subtle blue gradient, light and airy.
Style: realistic iPhone mockup, slightly tilted, on a dental office blurred background.
Aspect ratio 4:5.
```

---

## 5. Visuel article 5-slides (exemple)

**Dimensions** : 1024x1024 (carre, pour email mobile)
**Usage** : exemple de rendu de slide newsletter

**Prompt** :
```
Square illustration for slide 1 of a dental hygiene newsletter.
Top: simple geometric tooth shape.
Below: a hand holding a toothbrush at 45-degree angle touching a pink gum line.
Minimalist, soft pastel colors, white background.
Text space at top and bottom for headline and takeaway.
Modern flat design, no people, no text, very clean.
```

---

## 6. Mockup dashboard praticien (D2)

**Dimensions** : 1600x1000 (16:10, format desktop)
**Usage** : screenshot marketing, demo slide

**Prompt** :
```
Desktop dashboard mockup for Sensident dental platform practitioner view.
Sidebar on the left with 7 navigation items (Vue d'ensemble, Newsletter, etc.).
Main area: 4 KPI cards on top (patients actifs, ouvertures, lectures, temps),
then a line chart showing 12-month evolution, then a list of recent newsletters.
Style: clean modern SaaS dashboard, navy blue and white, with mint green accents.
Slightly tilted, on a soft blurred background. No real text, just placeholder lines.
```

---

## 7. Visuel "5-slides mobile" (newsletter mobile preview)

**Dimensions** : 800x1600 (portrait, format story mobile)
**Usage** : apercu newsletter sur mobile

**Prompt** :
```
Mobile phone screen showing a 5-slide dental newsletter.
Each slide takes full screen, swipeable.
Slide 1 title: "Pourquoi la technique BASS ?"
Below: a clean toothbrush at 45 degrees with a gum illustration.
Bottom: yellow takeaway box with a tip.
Style: modern minimal, navy blue + soft yellow + white, sans-serif typography.
Aspect ratio 9:16, looks like an iPhone screenshot mockup.
```

---

## 8. Avatar dentiste (par defaut dans la newsletter)

**Dimensions** : 512x512 (carre)
**Usage** : placeholder avatar dans la signature newsletter

**Prompt** :
```
Abstract geometric portrait silhouette of a dental professional.
No facial features, just a stylized silhouette in soft mint green.
Circular crop, gradient background from mint to white.
Modern flat design, anonymous but professional, inclusive (gender-neutral).
```

---

## 9. Favicon Open Graph (pour partage reseaux sociaux)

**Dimensions** : 1200x630 (format Open Graph)
**Usage** : partage de lien Sensident sur LinkedIn, Twitter, etc.

**Prompt** :
```
Wide promotional banner for Sensident dental prevention platform.
Left side: large "S" logo mark in navy blue.
Right side: clean typography "Sensident - La prevention dentaire, en confiance."
Background: subtle gradient from sky blue to white, with abstract dental motifs.
No photo, modern flat design, professional, French medical context.
Aspect ratio 16:9.
```

---

## 10. Illustration "Pas d'IA" (positionnement)

**Dimensions** : 800x600 (paysage)
**Usage** : page "Pourquoi Sensident", marketing, ventes

**Prompt** :
```
Illustration contrasting AI vs No-AI in healthcare.
Left side: a generic cloud icon with "AI" letters, gray and cold, with question marks.
Right side: a green shield with a checkmark, labeled "No-AI by design".
Connected by a simple arrow showing the choice.
Style: flat design, soft colors, clean lines, no people.
Background: light, almost white.
Aspect ratio 4:3.
```

---

## Notes d'utilisation

- **Couleurs de marque** : 
  - Navy : #0F172A
  - Sky : #38BDF8
  - Mint : #CCFBF1
  - Soft yellow : #FDE68A
  - Soft coral : #FDA4AF
  - White : #FFFFFF

- **Typo** : system-ui, -apple-system, sans-serif (defaut), pas de typo Google Fonts a importer cote legal

- **Style general** : moderne, medical, francais, sobre, pas infantilisante

- **Anti-comperage** : aucune image de "promotion" type reduction, aucun smile trop commercial, aucun logo cabinet generee

Generes les images et stocke-les dans `public/images/`. Dis-moi quand c'est fait, je les integre dans le code.
