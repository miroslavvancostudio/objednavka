# PROJECT_BRIEF.md

# Miroslav Vančo Studio
## Projekt e-shopu na predaj kníh

Verzia dokumentu: 1.0

---

# 1. Cieľ projektu

Vytvoriť jednoduchý, spoľahlivý a ľahko rozšíriteľný internetový obchod pre vydavateľstvo Miroslav Vančo Studio.

Systém musí umožňovať predaj:

- tlačených kníh
- elektronických kníh
- audiokníh

Projekt musí byť navrhnutý tak, aby bolo možné bez programovania pridávať ďalšie knihy a ďalšie jazykové verzie.

Majiteľ projektu nie je programátor. Administrácia musí byť preto čo najjednoduchšia.

---

# 2. Filozofia projektu

Projekt má byť:

- jednoduchý
- rýchly
- prehľadný
- bez zbytočných knižníc
- ľahko pochopiteľný

Prednosť má čitateľný kód pred komplikovanými riešeniami.

Každá funkcia musí byť komentovaná po slovensky.

---

# 3. Technológie

Frontend

- HTML
- CSS
- JavaScript

Hosting

- GitHub Pages

Databáza objednávok

- Firebase Firestore

Databáza produktov

- Google Sheets

Platby

- Stripe

Doručenie

- Packeta

---

# 4. Štruktúra projektu

index.html

objednávkový formulár

admin.html

administrácia

css/

styles.css

js/

app.js

admin.js

firebase.js

packeta.js

products.js

config.js

PROJECT_BRIEF.md

README.md

---

# 5. Produkty

Produkt nie je jazyková verzia.

Produkt je napríklad:

Paperback

Ebook

Audiobook

Jazyk je iba vlastnosť produktu.

Príklad:

Produkt:

Paperback

Varianty:

Slovensky

Anglicky

Česky

Taliansky

Esperanto

...

Zákazník môže objednať naraz viac jazykových verzií.

Príklad:

2× slovenská

1× anglická

---

# 6. Produkty budúcnosti

Projekt nesmie byť navrhnutý iba pre jednu knihu.

Musí umožňovať pridávať ďalšie knihy.

Príklady:

PUTIN

Vidieť je nebezpečné

ďalšie pripravované knihy

Každá kniha môže mať:

paperback

ebook

audiobook

ľubovoľný počet jazykov

---

# 7. Databáza produktov

Google Sheets

Majiteľ bude upravovať produkty v Google tabuľke.

Nebude editovať HTML.

Tabuľka bude obsahovať napríklad:

ID

Názov knihy

Typ

Jazyk

Cena

Sklad

ISBN

Obrázok

Popis

Aktívny

---

# 8. Objednávka

Objednávka obsahuje:

meno

priezvisko

email

telefón

krajinu

adresu

spôsob dopravy

výdajné miesto Packety

objednané produkty

jazyk

počet kusov

cenu

poznámku

čas vytvorenia

stav objednávky

---

# 9. Doprava

Podporované spôsoby:

Packeta

Z-BOX

neskôr Slovenská pošta

neskôr osobný odber

Digitálne produkty dopravu nepotrebujú.

---

# 10. Platby

Prvá verzia

Objednávka bez online platby.

Budúce verzie

Stripe

Apple Pay

Google Pay

---

# 11. Firebase

Firestore bude obsahovať kolekciu:

orders

Každá objednávka bude mať vlastný dokument.

---

# 12. Administrácia

Administrátor vidí:

všetky objednávky

zákazníka

produkty

jazyky

ceny

stav

Packeta miesto

dátum

Administrátor môže:

meniť stav

filtrovať

vyhľadávať

exportovať

---

# 13. Množstevné zľavy

Systém musí podporovať:

zľavy podľa počtu kusov

bezplatnú dopravu

kupóny

akcie

---

# 14. Jazykové mutácie

Projekt bude podporovať:

slovenčinu

angličtinu

češtinu

taliančinu

esperanto

ďalšie jazyky

Texty nesmú byť pevne zapísané v HTML.

---

# 15. Dôležité pravidlá

Nikdy automaticky nenastavovať 1 kus.

Ak zákazník nič neobjednal,

objednávka sa nesmie odoslať.

Musí sa zobraziť upozornenie.

---

# 16. Kód

Každá funkcia musí mať komentár.

Premenné musia mať zrozumiteľné názvy.

Duplicitný kód minimalizovať.

---

# 17. Cieľ architektúry

Projekt musí byť pripravený na:

10 kníh

50 jazykových verzií

nové typy produktov

bez potreby prepisovať existujúci kód.

---

# 18. Priorita

Najdôležitejšie je:

spoľahlivosť

jednoduchosť

rozšíriteľnosť

čitateľnosť kódu
