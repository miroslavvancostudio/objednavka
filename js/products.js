// Testovacie produkty pre prvu verziu produktoveho modelu.
export const products = [
  {
    bookId: "putin",
    bookTitle: "PUTIN",
    author: "Miroslav Vanco",
    active: true,
    products: [
      {
        productId: "putin-paperback",
        type: "paperback",
        name: "Paperback",
        isPhysical: true,
        active: true,
        variants: [
          {
            variantId: "putin-paperback-sk",
            languageCode: "sk",
            languageName: "Slovensky",
            title: "PUTIN - Zboznovany. Nenavideny.",
            price: 19.90,
            currency: "EUR",
            isbn: "978-80-000-0001-1",
            stock: 120,
            image: "images/putin-paperback-sk.jpg",
            active: true
          },
          {
            variantId: "putin-paperback-en",
            languageCode: "en",
            languageName: "Anglicky",
            title: "PUTIN - Adored. Hated.",
            price: 21.90,
            currency: "EUR",
            isbn: "978-80-000-0002-8",
            stock: 80,
            image: "images/putin-paperback-en.jpg",
            active: true
          },
          {
            variantId: "putin-paperback-cz",
            languageCode: "cz",
            languageName: "Cesky",
            title: "PUTIN - Zboznovany. Nenavideny.",
            price: 499,
            currency: "CZK",
            isbn: "978-80-000-0003-5",
            stock: 0,
            image: "images/putin-paperback-cz.jpg",
            active: false
          }
        ]
      }
    ]
  }
];

// Vrati iba aktivne knihy, produkty a jazykove varianty.
export function getActiveProducts() {
  return products
    .filter(book => book.active)
    .map(book => ({
      ...book,
      products: book.products
        .filter(product => product.active)
        .map(product => ({
          ...product,
          variants: product.variants.filter(variant => variant.active)
        }))
    }));
}

// Najde jazykovu variantu podla jej jednoznacneho ID.
export function findVariantById(variantId) {
  for (const book of products) {
    for (const product of book.products) {
      const variant = product.variants.find(item => item.variantId === variantId);
      if (variant) {
        return { book, product, variant };
      }
    }
  }

  return null;
}

// Vytvori ciste polozky objednavky z poctov zadanych pri variantoch.
export function createOrderItems(quantitiesByVariantId) {
  return Object.entries(quantitiesByVariantId)
    .map(([variantId, quantity]) => {
      const normalizedQuantity = Math.max(0, Number.parseInt(quantity, 10) || 0);
      const found = findVariantById(variantId);

      if (!found || normalizedQuantity < 1) {
        return null;
      }

      return {
        bookId: found.book.bookId,
        bookTitle: found.book.bookTitle,
        productId: found.product.productId,
        productType: found.product.type,
        productName: found.product.name,
        isPhysical: found.product.isPhysical,
        variantId: found.variant.variantId,
        languageCode: found.variant.languageCode,
        languageName: found.variant.languageName,
        title: found.variant.title,
        isbn: found.variant.isbn,
        image: found.variant.image,
        quantity: normalizedQuantity,
        unitPrice: found.variant.price,
        currency: found.variant.currency,
        lineTotal: normalizedQuantity * found.variant.price
      };
    })
    .filter(Boolean);
}

// Spocita pocet kusov v objednavke.
export function getOrderQuantity(orderItems) {
  return orderItems.reduce((sum, item) => sum + item.quantity, 0);
}

// Overi, ci objednavka obsahuje aspon jeden kus.
export function canSubmitOrder(orderItems) {
  return getOrderQuantity(orderItems) > 0;
}

// Zaokruhli penaznu hodnotu na dve desatinne miesta.
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Spocita celkovu sumu po menach, aby sa nemiesali EUR a CZK.
export function getOrderTotalsByCurrency(orderItems) {
  const totals = orderItems.reduce((sumByCurrency, item) => {
    sumByCurrency[item.currency] = (sumByCurrency[item.currency] || 0) + item.lineTotal;
    return sumByCurrency;
  }, {});

  return Object.fromEntries(
    Object.entries(totals).map(([currency, value]) => [currency, roundMoney(value)])
  );
}

// Povodny nazov ponechavame ako kompatibilny alias pre dalsie kroky projektu.
export const fallbackProducts = products;

// Vrati lokalne produkty, kym este nie je napojeny Google Sheets.
export function getFallbackProducts() {
  return fallbackProducts;
}
