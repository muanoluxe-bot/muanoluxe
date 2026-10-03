export function assert(condition, message) {
  if (!condition) throw new Error(message);
}
export function text(value, max, name, required = true) {
  assert(
    typeof value === "string" &&
      value.length <= max &&
      (!required || value.trim()),
    `Invalid ${name}.`,
  );
  return value.trim();
}
export function integer(value, min, max, name) {
  assert(
    Number.isSafeInteger(value) && value >= min && value <= max,
    `Invalid ${name}.`,
  );
  return value;
}
export function validImage(url) {
  return (
    typeof url === "string" &&
    url.length <= 2048 &&
    (/^\/images\/[a-zA-Z0-9._-]+(?:#[a-z]+)?$/.test(url) ||
      /^https:\/\//.test(url))
  );
}
export function cleanProduct(p) {
  assert(p && typeof p === "object", "Invalid product.");
  const id = text(p.id, 100, "product ID");
  assert(
    /^[a-z0-9-]+$/.test(id),
    "Use lowercase letters, numbers and hyphens for the ID.",
  );
  assert(validImage(p.image), "Product image must be HTTPS or a local image.");
  assert(typeof p.active === "boolean", "Invalid availability.");
  assert(
    Array.isArray(p.variants) &&
      p.variants.length > 0 &&
      p.variants.length <= 20,
    "Provide between 1 and 20 colours.",
  );
  const seen = new Set();
  const variants = p.variants.map((v) => {
    const color = text(v.color, 30, "colour");
    assert(!seen.has(color.toLowerCase()), "Colour names must be unique.");
    seen.add(color.toLowerCase());
    assert(/^#[0-9a-f]{6}$/i.test(v.hex), "Invalid colour swatch.");
    assert(
      v.sizes &&
        Object.keys(v.sizes).length > 0 &&
        Object.keys(v.sizes).length <= 12,
      "Invalid sizes.",
    );
    const sizes = {};
    for (const [s, n] of Object.entries(v.sizes)) {
      assert(/^[A-Za-z0-9-]{1,8}$/.test(s), "Invalid size name.");
      sizes[s] = integer(n, 0, 10000, "stock");
    }
    if (v.image) assert(validImage(v.image), "Invalid colour image.");
    return { color, hex: v.hex, sizes, ...(v.image ? { image: v.image } : {}) };
  });
  return {
    id,
    name: text(p.name, 100, "name"),
    category: text(p.category, 40, "category"),
    audience: text(p.audience, 20, "collection"),
    price: integer(p.price, 100, 100000000, "price"),
    description: text(p.description, 2000, "description"),
    material: text(p.material || "", 1000, "material", false),
    image: p.image,
    tag: text(p.tag || "", 30, "badge", false),
    active: p.active,
    variants,
  };
}
export function cleanAddress(a) {
  assert(a && typeof a === "object", "Delivery details are required.");
  const result = {};
  for (const [k, max] of Object.entries({
    name: 100,
    email: 150,
    phone: 30,
    street: 200,
    city: 100,
    postalCode: 15,
    province: 100,
  }))
    result[k] = text(a[k], max, k);
  assert(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email),
    "Invalid email address.",
  );
  assert(/^[+\d\s()-]{7,30}$/.test(result.phone), "Invalid phone number.");
  result.notes = text(a.notes || "", 500, "notes", false);
  result.country = "ZA";
  return result;
}
export function normalizeItems(items) {
  assert(
    Array.isArray(items) && items.length > 0 && items.length <= 30,
    "Your bag must contain between 1 and 30 items.",
  );
  const merged = new Map();
  for (const i of items) {
    const productId = text(i.productId, 100, "product ID");
    assert(/^[a-z0-9-]+$/.test(productId), "Invalid product ID.");
    const color = text(i.color, 30, "colour"),
      size = text(i.size, 8, "size"),
      quantity = integer(i.quantity, 1, 20, "quantity");
    const key = JSON.stringify([productId, color, size]);
    const old = merged.get(key);
    merged.set(key, {
      productId,
      color,
      size,
      quantity: integer(quantity + (old?.quantity || 0), 1, 20, "quantity"),
    });
  }
  return [...merged.values()];
}
export function reserve(items, products, settings) {
  const updated = new Map(
    [...products].map(([id, p]) => [id, structuredClone(p)]),
  );
  let subtotal = 0;
  const lines = items.map((i) => {
    const p = updated.get(i.productId);
    assert(p && p.active, "A piece in your bag is no longer available.");
    const variant = p.variants.find((v) => v.color === i.color);
    assert(
      variant &&
        Number.isInteger(variant.sizes[i.size]) &&
        variant.sizes[i.size] >= i.quantity,
      `Not enough stock for ${p.name}, ${i.color}, ${i.size}.`,
    );
    variant.sizes[i.size] -= i.quantity;
    subtotal += p.price * i.quantity;
    return {
      ...i,
      name: p.name,
      price: p.price,
      image: variant.image || p.image,
    };
  });
  const shipping =
    subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  return { updated, lines, subtotal, shipping, total: subtotal + shipping };
}
export function validateTransition(from, to) {
  return (
    {
      pending_payment: ["cancelled"],
      paid: ["processing"],
      processing: ["shipped"],
      shipped: ["delivered"],
    }[from]?.includes(to) === true
  );
}
