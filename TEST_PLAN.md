# TEST_PLAN.md

# Jednoduchy navod na rucne otestovanie e-shopu

Tento navod je urceny pre laika. Cielom je overit, ci sa da vytvorit objednavka, ci sa ulozi do Firebase, ci vzniknu emaily a ci ju vidi administracia.

---

# 1. Ako spustit index.html lokalne

Najjednoduchsi sposob:

1. Otvor priecinok projektu:

   `/Users/miroslavvanco/Desktop/mvs`

2. Dvojklikom otvor subor:

   `index.html`

3. Ak sa stranka neotvori spravne alebo nefunguju externe skripty, spusti projekt cez lokalny server.

Odporucany sposob cez lokalny server:

1. Otvor Terminal.

2. Zadaj:

   ```bash
   cd "/Users/miroslavvanco/Desktop/mvs"
   python3 -m http.server 8766
   ```

3. V prehliadaci otvor:

   `http://127.0.0.1:8766/index.html`

4. Mala by sa zobrazit objednavkova stranka knihy PUTIN.

---

# 2. Ako vytvorit testovaciu objednavku

1. Otvor:

   `http://127.0.0.1:8766/index.html`

2. Skontroluj, ze tlacidlo `Odoslat objednavku` je na zaciatku vypnute.

3. Zadaj pocet knih:

   - Slovenska kniha: `1`
   - Anglicka kniha: `1`

4. Skontroluj, ze tlacidlo `Odoslat objednavku` sa zaplo.

---

# 3. Co vyplnit do objednavky

Pouzi testovacie udaje:

- Mena platby: `EUR`
- Krajina dorucenia: `Slovensko`
- Sposob dorucenia: `Doručenie na adresu`
- Meno a priezvisko: `Test Zakaznik`
- Telefon: `0900123456`
- E-mail: pouzi svoj testovaci e-mail
- Ulica a cislo: `Testovacia 1`
- PSC: `81101`
- Mesto: `Bratislava`
- Poznamka: `Testovacia objednavka`
- Sposob platby: `Bankovy prevod / QR platba`

Potom klikni:

`Odoslat objednavku`

---

# 4. Ako overit, ze QR platba sa zobrazila

Po odoslani objednavky by sa mala zobrazit zelena sprava:

`Objednavka bola prijata.`

Pod nou by mala byt cast:

`Platba bankovym prevodom`

Skontroluj, ze vidis:

- cislo objednavky / variabilny symbol
- IBAN
- prijemcu
- sumu
- spravu pre prijemcu
- QR kod

Ak QR kod nevidis, skontroluj:

- ci objednavka bola naozaj odoslana
- ci je vybrana mena EUR alebo CZK
- ci funguje internetove pripojenie

---

# 5. Ako overit objednavku vo Firebase kolekcii orders

1. Otvor Firebase Console:

   `https://console.firebase.google.com/`

2. Vyber projekt:

   `mvstudio-orders`

3. V lavom menu otvor:

   `Firestore Database`

4. Otvor kolekciu:

   `orders`

5. Najdi novy dokument s cislom objednavky.

   Cislo objednavky je rovnake ako variabilny symbol zobrazeny po odoslani objednavky.

6. Otvor dokument a skontroluj, ze obsahuje napriklad:

   - `customerName`
   - `email`
   - `phone`
   - `items`
   - `quantity`
   - `total`
   - `currency`
   - `shippingMethod`
   - `paymentStatus`
   - `createdAt`

Ak objednavku nevidis:

- skontroluj, ci bola objednavka uspesne odoslana
- skontroluj Firebase pravidla
- skontroluj internetove pripojenie

---

# 6. Ako overit emaily v kolekcii mail

1. Vo Firebase Console zostan vo Firestore Database.

2. Otvor kolekciu:

   `mail`

3. Po testovacej objednavke by mali vzniknut aspon 2 nove dokumenty:

   - email pre predajcu
   - email pre zakaznika

4. Otvor najnovsie dokumenty a skontroluj:

   Pri emaili predajcovi:

   - pole `to` obsahuje adresu predajcu
   - predmet obsahuje cislo objednavky
   - sprava obsahuje udaje objednavky

   Pri emaili zakaznikovi:

   - pole `to` obsahuje e-mail zadany v objednavke
   - predmet obsahuje potvrdenie objednavky
   - sprava obsahuje platobne udaje

Dolezite:

Vznik dokumentov v kolekcii `mail` este nezarucuje, ze email bol skutocne doruceny.

Skutocne odoslanie emailov zavisi od Firebase email rozsirenia a jeho nastavenia.

---

# 7. Ako otvorit admin.html

Ak pouzivas lokalny server, otvor:

`http://127.0.0.1:8766/admin.html`

Ak otvaras subory priamo z priecinka, dvojklikom otvor:

`admin.html`

Odporucany je lokalny server.

---

# 8. Ako overit, ze admin zobrazuje objednavku

1. Otvor:

   `http://127.0.0.1:8766/admin.html`

2. Pockaj niekolko sekund, kym sa objednavky nacitaju.

3. Skontroluj tabulku objednavok.

4. Najdi objednavku podla:

   - cisla objednavky
   - mena `Test Zakaznik`
   - e-mailu

5. Skontroluj, ze objednavka zobrazuje:

   - cislo objednavky
   - zakaznika
   - objednane knihy
   - sumu
   - stav platby
   - stav objednavky
   - dorucenie

6. Vyskusaj vyhladavanie:

   Do vyhladavacieho pola napis:

   `Test Zakaznik`

7. Vyskusaj zmenu stavu:

   - klikni `Zaplatené`
   - objednavka by mala zmenit stav platby

   Potom vo Firebase v kolekcii `orders` skontroluj, ci sa v dokumente zmenilo:

   - `paymentStatus`
   - `paid`
   - `paidAt`

---

# 9. Zakladny vysledok testu

E-shop je rucne otestovany, ak plati:

- objednavka sa da odoslat
- po odoslani sa zobrazi cislo objednavky
- zobrazi sa QR kod alebo platobne udaje
- objednavka je vo Firebase kolekcii `orders`
- v kolekcii `mail` vznikli emailove dokumenty
- `admin.html` objednavku zobrazuje
- administracia vie zmenit stav objednavky

---

# 10. Co netestovat na ostro

Pri testovani nepouzivaj skutocnu objednavku od zakaznika.

Neposielaj realnu platbu.

Ak pouzijes realny e-mail, moze prist skutocne potvrdenie objednavky.
