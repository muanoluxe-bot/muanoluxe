export const colors = {
  Ivory: "#e7e0d2",
  Onyx: "#242522",
  Sand: "#b9a58c",
  Olive: "#777760",
  Chocolate: "#62483a",
};
const variants = (names) =>
  names.map((color) => ({
    color,
    hex: colors[color],
    sizes: { XS: 4, S: 8, M: 12, L: 8, XL: 4 },
  }));
export const initialProducts = [
  {
    id: "signature-blazer",
    name: "The Signature Blazer",
    category: "Tailoring",
    audience: "Women",
    price: 189000,
    description:
      "A considered silhouette. Relaxed shoulders, a clean single-breasted front, and a beautifully fluid drape. The piece that brings everything together.",
    material: "Wool-blend suiting. Fully lined. Dry clean only.",
    image: "/images/products.png#blazer",
    imagePosition: "center",
    tag: "BESTSELLER",
    active: true,
    variants: variants(["Ivory", "Onyx", "Sand"]),
  },
  {
    id: "essential-shirt",
    name: "The Essential Shirt",
    category: "Essentials",
    audience: "Men",
    price: 89000,
    description:
      "An effortless foundation, cut with room to move. A crisp collar and thoughtful proportions make this an everyday ritual.",
    material: "Cotton poplin. Gentle cold wash. Line dry.",
    image: "/images/products.png#shirt",
    tag: "NEW ARRIVAL",
    active: true,
    variants: variants(["Ivory", "Onyx", "Olive"]),
  },
  {
    id: "sculpted-trouser",
    name: "The Sculpted Trouser",
    category: "Tailoring",
    audience: "Women",
    price: 129000,
    description:
      "A high waist and a long, wide leg create an elongated silhouette. Quiet confidence, from the first meeting to the last light.",
    material: "Wool-blend twill. Dry clean only.",
    image: "/images/products.png#trousers",
    tag: "",
    active: true,
    variants: variants(["Sand", "Onyx", "Chocolate"]),
  },
  {
    id: "ribbed-knit",
    name: "The Ribbed Knit",
    category: "Knitwear",
    audience: "Women",
    price: 79000,
    description:
      "Soft texture. Subtle structure. A close-fitting ribbed knit designed to layer beautifully or stand on its own.",
    material: "Cotton blend knit. Cool hand wash. Dry flat.",
    image: "/images/products.png#knit",
    tag: "THE EVERYDAY EDIT",
    active: true,
    variants: variants(["Onyx", "Ivory", "Olive"]),
  },
];
export const defaultSettings = {
  storyTitle: "Style that whispers.\nPresence that stays.",
  storyText:
    "We believe the most powerful statement is often the simplest. A beautiful cut. A thoughtful detail. A piece you reach for, again and again.",
  storyTextSecondary:
    "MuanoLuxe is a considered approach to getting dressed — contemporary essentials with a quiet point of view.",
  storyImage: "/images/campaign.png",
  newsletterTitle: "A little closer to the exceptional.",
  newsletterDescription:
    "New collections, quiet inspiration, and first access. A considered note from us.",
  announcement: "A considered wardrobe. An enduring point of view.",
  heroTitle: "Quiet confidence.\nLasting impression.",
  heroDescription:
    "Considered essentials. Effortless silhouettes.\nFor the way you move through the world.",
  heroImage: "/images/campaign.png",
  shippingFee: 9500,
  freeShippingThreshold: 200000,
  supportEmail: "muanoluxe@gmail.com",
  instagramUrl: "",
  returnsPolicy:
    "Contact our team before returning an item. Return eligibility and timeframes will be confirmed before your order is accepted.",
  shippingPolicy:
    "Delivery availability, timing, and charges are confirmed before payment. The delivery estimate shown at checkout is subject to your address.",
  privacyPolicy:
    "We use your account and delivery details to manage orders. Newsletter subscriptions are optional. Contact the store to request access to or deletion of your information.",
  terms:
    "Orders are subject to stock and delivery availability. Payments are processed securely by Paystack. Unpaid stock reservations expire after 30 minutes. Product imagery is illustrative until replaced with verified product photography.",
  published: false,
};
