# ROADMAP.md

# Miroslav Vanco Studio
## Roadmapa vyvoja e-shopu na predaj knih

Verzia dokumentu: 1.0

---

# 1. Vychodiskovy stav

Projekt ma zakladny objednavkovy formular, administraciu objednavok, napojenie na Firebase Firestore a Packetu.

Aktualne je projekt jednoduchy a pouzitelny pre prvu knihu, ale este nie je pripraveny na viac knih, viac typov produktov, Google Sheets databazu produktov a jazykove mutacie textov.

---

# 2. Etapa 1 - Upratanie struktury projektu

Ciel:

- zaviest planovanu strukturu priecinkov
- oddelit konfiguraciu od logiky
- pripravit projekt na dalsie rozsirovanie

Navrhovane kroky:

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

Vystup:

- rovnaka funkcnost ako dnes
- prehladnejsia struktura projektu
- jednoduchsia buduca udrzba

---

# 3. Etapa 2 - Produktovy model

Ciel:

- oddelit knihu, produkt a jazykovu verziu
- odstranit pevne zapisane produkty z HTML

Navrhovane kroky:

- navrhnut datovu strukturu knihy
- navrhnut datovu strukturu produktu
- navrhnut datovu strukturu variantu
- pripravit docasny lokalny zoznam produktov v js/products.js
- generovat produktovy formular z dat

Vystup:

- zakaznik moze vyberat produkty generovane z dat
- projekt nie je naviazany iba na knihu PUTIN

---

# 4. Etapa 3 - Google Sheets ako databaza produktov

Ciel:

- majitel upravuje produkty v Google tabulke
- HTML sa nemeni pri pridani novej knihy alebo jazyka

Navrhovane kroky:

- navrhnut stlpce Google tabulky
- pripravit verejne publikovany alebo API citatelny zdroj produktov
- nacitavat produkty v js/products.js
- filtrovat len aktivne produkty
- osetrit chybu nacitania produktov
- pripravit fallback produkty pre pripad vypadku tabulky

Vystup:

- produkty sa spravuju mimo kodu
- zakaznik vidi len aktivne dostupne produkty

---

# 5. Etapa 4 - Objednavkovy formular

Ciel:

- formular bude generovany z produktov
- objednavka bude podporovat tlacene knihy, ebooky a audioknihy

Navrhovane kroky:

- zobrazovat knihy podla dat z produktovej databazy
- podporit viac typov produktov
- podporit viac jazykov
- nikdy automaticky nenastavovat 1 kus
- blokovat odoslanie pri nulovej objednavke
- vypocitat cenu z vybranych produktov
- rozlisit fyzicke a digitalne produkty

Vystup:

- objednavka je datovo riadena
- fyzicke produkty riesia dopravu
- digitalne produkty dopravu nepotrebuju

---

# 6. Etapa 5 - Doprava

Ciel:

- spravne rozhodnut, kedy sa pyta doprava
- zachovat Packetu a Z-BOX

Navrhovane kroky:

- presunut logiku Packety do js/packeta.js
- zobrazit dopravu iba pri fyzickych produktoch
- podporit kombinovane objednavky fyzicky produkt + digitalny produkt
- pripravit datovy model pre buducu Slovensku postu
- pripravit datovy model pre osobny odber

Vystup:

- doprava je samostatny modul
- digitalne produkty nevyzaduju adresu ani Packetu

---

# 7. Etapa 6 - Firebase objednavky

Ciel:

- mat stabilny a citatelny zapis objednavok do Firestore

Navrhovane kroky:

- presunut Firebase inicializaciu do js/firebase.js
- vytvorit funkciu na vytvorenie cisla objednavky
- vytvorit funkciu na ulozenie objednavky
- ulozit objednavku s kompletnym zoznamom poloziek
- ponechat kolekciu orders
- pripravit pole pre buduce online platby

Vystup:

- jeden jasny modul pre pracu s Firebase
- stabilne data pre administraciu a export

---

# 8. Etapa 7 - Administracia

Ciel:

- spravit administraciu jednoduchou pre neprogramatora

Navrhovane kroky:

- zobrazit objednavky prehladne po riadkoch
- filtrovat podla stavu, krajiny, typu produktu a datumu
- vyhladavat podla mena, emailu, telefonu a cisla objednavky
- menit stav objednavky
- pripravit export do CSV
- pripravit stav Packeta exportu

Vystup:

- administracia je pouzitelna na beznu pracu
- objednavky sa daju filtrovat a exportovat

---

# 9. Etapa 8 - Platby

Ciel:

- prva verzia zostava bez online platby
- projekt bude pripraveny na Stripe

Navrhovane kroky:

- ponechat bankovy prevod ako zaklad
- pripravit platobny stav objednavky
- navrhnut Stripe Checkout flow
- neskor pridat Apple Pay a Google Pay cez Stripe
- neriesit platobne tajne kluce vo frontend kode

Vystup:

- objednavky funguju aj bez Stripe
- architektura nebude blokovat buduce online platby

---

# 10. Etapa 9 - Jazykove mutacie

Ciel:

- texty nebudu pevne zapisane v HTML

Navrhovane kroky:

- vytvorit subor s prekladmi
- pouzit textove kluce namiesto pevnych textov
- zacat slovencinou
- pridat anglictinu a cestinu
- neskor pridat taliancinu a esperanto

Vystup:

- UI sa da prelozit bez prepisovania logiky

---

# 11. Etapa 10 - Testovanie a dokumentacia

Ciel:

- minimalizovat riziko chyb v objednavkach

Navrhovane kroky:

- vytvorit README.md
- popisat nastavenie Firebase
- popisat nastavenie Packety
- popisat produktovu Google tabulku
- vytvorit testovaci scenar objednavky
- otestovat nulovu objednavku
- otestovat viac produktov naraz
- otestovat fyzicke a digitalne produkty

Vystup:

- projekt je zrozumitelny aj po case
- zmeny sa daju kontrolovat jednoduchym checklistom

---

# 12. Odporucane poradie prace

1. Upratat strukturu projektu.
2. Oddelit konfiguraciu.
3. Vytvorit produktovy model.
4. Generovat formular z produktov.
5. Pripojit Google Sheets.
6. Oddelit dopravu.
7. Upravit Firebase zapis objednavok.
8. Rozsirit administraciu.
9. Pripravit Stripe.
10. Doplnit jazykove mutacie.
11. Doplnit dokumentaciu a testovaci checklist.

---

# 13. Zasady pre dalsi vyvoj

- nemenit viac veci naraz
- po kazdej etape overit existujucu funkcnost
- prednost ma citatelny kod
- kazda funkcia ma mat kratky slovensky komentar
- produkty sa nesmu pevne zapisovat do HTML
- objednavka s nulovym poctom kusov sa nikdy nesmie odoslat
- digitalne produkty nesmu vyzadovat dopravu
- tajne kluce nesmu byt vo verejnom frontend kode
