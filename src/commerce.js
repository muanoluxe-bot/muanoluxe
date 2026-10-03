export const money = (value) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: value % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
export const lineKey = (item) => `${item.productId}:${item.color}:${item.size}`;
export function stockFor(product, color, size) {
  return product?.active
    ? product.variants.find((v) => v.color === color)?.sizes[size] || 0
    : 0;
}
export function totals(items, products, settings) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (products.find((p) => p.id === item.productId)?.price || 0) *
        item.quantity,
    0,
  );
  const shipping =
    subtotal === 0 || subtotal >= settings.freeShippingThreshold
      ? 0
      : settings.shippingFee;
  return { subtotal, shipping, total: subtotal + shipping };
}
export function addToBag(bag, product, color, size) {
  const item = { productId: product.id, color, size, quantity: 1 };
  const existing = bag.find((i) => lineKey(i) === lineKey(item));
  if ((existing?.quantity || 0) >= stockFor(product, color, size))
    throw new Error(
      "This size is currently out of stock. Please choose another.",
    );
  return existing
    ? bag.map((i) =>
        lineKey(i) === lineKey(item) ? { ...i, quantity: i.quantity + 1 } : i,
      )
    : [...bag, item];
}
