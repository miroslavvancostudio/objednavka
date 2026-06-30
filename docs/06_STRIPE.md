# 06_STRIPE.md

# Stripe platba kartou

Tento dokument popisuje pripravenu backend integraciu Stripe Checkout cez Firebase Cloud Functions.

Frontend na GitHub Pages nesmie obsahovat tajny Stripe kluc.

---

# Co je pripravene

Bol vytvoreny priecinok:

`functions/`

Obsahuje dve Firebase Functions:

- `createCheckoutSession`
- `stripeWebhook`

---

# createCheckoutSession

Uloha funkcie:

1. prijme `orderNumber`
2. nacita objednavku z Firestore `orders/{orderNumber}`
3. overi, ze objednavka existuje
4. overi, ze objednavka ma platnu sumu
5. vytvori Stripe Checkout Session
6. vlozi `orderNumber` do:
   - `client_reference_id`
   - `metadata.orderNumber`
   - `payment_intent_data.metadata.orderNumber`
7. vrati `checkoutUrl`

Frontend potom zakaznika presmeruje na `checkoutUrl`.

---

# stripeWebhook

Uloha funkcie:

1. prijme Stripe webhook
2. overi podpis webhooku cez `STRIPE_WEBHOOK_SECRET`
3. pri udalosti `checkout.session.completed` najde objednavku podla `orderNumber`
4. nastavi v objednavke:
   - `paymentStatus: "paid"`
   - `paymentMethod: "card"`
   - `paid: true`
   - `paidAt`
   - `stripeSessionId`
   - `stripePaymentIntentId`

---

# Placeholdery

V kode su zatial iba placeholdery:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_SUCCESS_URL`
- `FRONTEND_CANCEL_URL`

Ostre hodnoty sa nesmu zapisat do frontend kodu.

---

# Co treba nastavit vo Firebase

1. Pripravit Firebase Functions v projekte `mvstudio-orders`.

2. V priecinku `functions/` nainstalovat zavislosti:

   ```bash
   npm install
   ```

3. Nastavit tajne alebo environment hodnoty:

   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `FRONTEND_SUCCESS_URL`
   - `FRONTEND_CANCEL_URL`

4. Nasadit funkcie:

   ```bash
   firebase deploy --only functions
   ```

5. Skontrolovat URL funkcii:

   - `createCheckoutSession`
   - `stripeWebhook`

6. Firestore pravidla musia dovolit:

   - frontend vytvori objednavku v `orders`
   - Cloud Function cita objednavku z `orders`
   - Cloud Function upravi platobny stav objednavky

Frontend nesmie mat pravo sam oznacit objednavku ako zaplatenu.

---

# Co treba nastavit v Stripe

1. Vytvorit alebo otvorit Stripe ucet.

2. V Stripe Dashboard ziskat testovaci secret key:

   - `STRIPE_SECRET_KEY`

3. Po nasadeni Firebase Function vytvorit webhook endpoint.

4. Webhook endpoint musi smerovat na URL funkcie:

   - `stripeWebhook`

5. Povolit udalost:

   - `checkout.session.completed`

6. Zo Stripe webhook endpointu ziskat signing secret:

   - `STRIPE_WEBHOOK_SECRET`

7. Najprv testovat v Stripe test mode.

8. Azt potom prejst na live mode.

---

# Co sa bude menit neskor vo frontende

Zatial sa frontend nemeni.

Neskor bude treba upravit:

- `index.html`
- `js/app.js`
- `js/config.js`
- `js/admin.js`

Planovane zmeny:

- povolit volbu platby kartou
- po vytvoreni objednavky zavolat `createCheckoutSession`
- presmerovat zakaznika na Stripe Checkout
- zachovat QR platbu
- v administracii zobrazit, ci bola objednavka platena QR alebo kartou

---

# Bezpecnostne pravidla

- Stripe secret key nesmie byt vo frontende.
- Stav `paid` nesmie nastavovat prehliadac.
- Objednavku ako zaplatenu smie oznacit iba Stripe webhook.
- Suma pre Stripe sa musi brat z Firestore objednavky, nie iba z hodnoty poslanej z prehliadaca.
- `orderNumber` musi byt ulozeny v Stripe metadata.
