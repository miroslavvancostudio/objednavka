# 05_ROADMAP.md

# Roadmapa vyvoja e-shopu

---

# Etapa 1 - Upratanie struktury projektu

Ciel:

- zaviest planovanu strukturu priecinkov
- oddelit konfiguraciu od logiky
- pripravit projekt na dalsie rozsirovanie

Kroky:

- vytvorit priecinok css/
- presunut styles.css do css/styles.css
- vytvorit priecinok js/
- presunut app.js do js/app.js
- presunut admin.js do js/admin.js
- vytvorit js/config.js
- vytvorit js/firebase.js
- vytvorit js/packeta.js
- vytvorit js/products.js
- aktualizovat odkazy v HTML

---

# Etapa 2 - Produktovy model

Ciel:

- oddelit knihu, produkt a jazykovu verziu
- odstranit pevne zapisane produkty z HTML
- pripravit docasny lokalny zoznam produktov v js/products.js

---

# Etapa 3 - Google Sheets ako databaza produktov

Ciel:

- majitel upravuje produkty v Google tabulke
- HTML sa nemeni pri pridani novej knihy alebo jazyka
- system ma fallback pri vypadku tabulky

---

# Etapa 4 - Objednavkovy formular

Ciel:

- formular bude generovany z produktov
- objednavka bude podporovat tlacene knihy, ebooky a audioknihy
- fyzicke a digitalne produkty budu mat rozdielne pravidla dopravy

---

# Etapa 5 - Doprava

Ciel:

- presunut logiku Packety do js/packeta.js
- zobrazit dopravu iba pri fyzickych produktoch
- pripravit buduce sposoby dorucenia

---

# Etapa 6 - Firebase objednavky

Ciel:

- presunut Firebase inicializaciu do js/firebase.js
- vytvorit spolocne funkcie na zapis a nacitanie objednavok
- ponechat kolekciu orders

---

# Etapa 7 - Administracia

Ciel:

- zlepsit filtrovanie
- zlepsit vyhladavanie
- pripravit export do CSV
- zobrazit produkty a jazyky prehladne

---

# Etapa 8 - Platby

Ciel:

- ponechat bankovy prevod ako zaklad
- pripravit architekturu na Stripe
- nedavat tajne kluce do frontend kodu

---

# Etapa 9 - Jazykove mutacie

Ciel:

- texty nebudu pevne zapisane v HTML
- zacat slovencinou
- neskor pridat anglictinu, cestinu, taliancinu a esperanto

---

# Etapa 10 - Testovanie a dokumentacia

Ciel:

- vytvorit README.md
- popisat nastavenie Firebase, Packety a Google Sheets
- vytvorit jednoduchy testovaci checklist

---

# Zasady dalsieho vyvoja

- nemenit viac veci naraz
- po kazdej etape overit existujucu funkcnost
- prednost ma citatelny kod
- produkty sa nesmu pevne zapisovat do HTML
- objednavka s nulovym poctom kusov sa nikdy nesmie odoslat
- digitalne produkty nesmu vyzadovat dopravu
- tajne kluce nesmu byt vo verejnom frontend kode
