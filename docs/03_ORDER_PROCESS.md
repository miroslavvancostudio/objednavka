# 03_ORDER_PROCESS.md

# Objednavkovy proces

Objednavka obsahuje:

- meno
- priezvisko
- email
- telefon
- krajinu
- adresu
- sposob dopravy
- vydajne miesto Packety
- objednane produkty
- jazyk
- pocet kusov
- cenu
- poznamku
- cas vytvorenia
- stav objednavky

---

# Validacia objednavky

Nikdy automaticky nenastavovat 1 kus.

Ak zakaznik nic neobjednal, objednavka sa nesmie odoslat.

Musi sa zobrazit upozornenie.

---

# Doprava

Podporovane sposoby:

- Packeta
- Z-BOX
- neskor Slovenska posta
- neskor osobny odber

Digitalne produkty dopravu nepotrebuju.

---

# Platby

Prva verzia:

- objednavka bez online platby
- bankovy prevod alebo QR platba

Buduce verzie:

- Stripe
- Apple Pay
- Google Pay

---

# Mnozstevne zlavy

System musi podporovat:

- zlavy podla poctu kusov
- bezplatnu dopravu
- kupony
- akcie

---

# Firebase

Firestore bude obsahovat kolekciu:

- orders

Kazda objednavka bude mat vlastny dokument.
