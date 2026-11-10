import { products } from "./products";

const PIN = (path: string) => `https://i.pinimg.com/originals/${path}`;

// ── Spotlighted pieces ─────────────────────────────────────────────────────
export const spotlighted = [
  products.find((p) => p.id === "7")!,  // Lace Flower Abaya — Romantic
  products.find((p) => p.id === "1")!,  // Espresso Crinkle Rayon — Minimal
  products.find((p) => p.id === "19")!, // Emberwood Flannel Maxi — Classic
  products.find((p) => p.id === "13")!, // Y2K Cyber Cardigan — Streetwear
];

// ── Categories ─────────────────────────────────────────────────────────────
export const categories = [
  {
    slug: "dresses",
    label: "Dresses",
    image: PIN("f6/e6/42/f6e642d74775c03f1b9dfac7bc50b5c1.jpg"),
    count: 48,
  },
  {
    slug: "skirts",
    label: "Skirts",
    image: PIN("87/f9/95/87f995d5388b0bc5cfba8307b7e56710.webp"),
    count: 63,
  },
  {
    slug: "tops",
    label: "Tops",
    image: PIN("d4/ca/ef/d4caefce6e58a48ad0f8fd5c36edd275.jpg"),
    count: 91,
  },
  {
    slug: "activewear",
    label: "Activewear",
    image: PIN("55/df/40/55df4051452da2128c7bc42f1ea53561.jpg"),
    count: 27,
  },
  {
    slug: "swimwear",
    label: "Swimwear",
    image: PIN("32/23/a5/3223a561f56de893b21b9c833aefca28.jpg"),
    count: 19,
  },
  {
    slug: "occasionwear",
    label: "Occasionwear",
    image: PIN("47/2d/8a/472d8affc7c65cd0649978089c0c8a1e.jpg"),
    count: 34,
  },
];

// ── Spotlighted brands ─────────────────────────────────────────────────────
export const brands = [
  {
    slug: "damson-madder",
    name: "Damson Madder",
    tagline: "Elevated basics made in Türkiye.",
    image: PIN("86/78/91/86789100253a24fdfa946221f11b61d5.png"),
    pieceCount: 12,
  },
  {
    slug: "shop-fatima-diallo",
    name: "Shop Fatima Diallo",
    tagline: "Modest dressing for the modern woman.",
    image: PIN("f6/e6/42/f6e642d74775c03f1b9dfac7bc50b5c1.jpg"),
    pieceCount: 8,
  },
  {
    slug: "w-concept",
    name: "W Concept",
    tagline: "Seoul-fully created designer fashion.",
    image: PIN("82/82/b4/8282b4489ee37590e8a048e663938b2b.jpg"),
    pieceCount: 21,
  },
  {
    slug: "free-people",
    name: "Free People",
    tagline: "Bohemian spirit, long-line silhouettes.",
    image: PIN("87/f9/95/87f995d5388b0bc5cfba8307b7e56710.webp"),
    pieceCount: 16,
  },
  {
    slug: "lazy-oaf",
    name: "Lazy Oaf",
    tagline: "Playful, feminine, completely singular.",
    image: PIN("2a/9f/f7/2a9ff7f797e78957a56f89b16983c43c.jpg"),
    pieceCount: 6,
  },
  {
    slug: "jennah-boutique",
    name: "Jennah Boutique",
    tagline: "Structured modest pieces from France.",
    image: PIN("38/39/11/383911a73b6804424da8260e305e3905.jpg"),
    pieceCount: 9,
  },
];

// ── Trending ───────────────────────────────────────────────────────────────
export const trending = [
  products.find((p) => p.id === "14")!, // String Long Parachute Skirt
  products.find((p) => p.id === "20")!, // Luan Check Wool Skirt
  products.find((p) => p.id === "8")!,  // Botanical Print Mesh Maxi
  products.find((p) => p.id === "4")!,  // Samara Long Sleeve Tee
  products.find((p) => p.id === "28")!, // Jenny Café Tie Top
  products.find((p) => p.id === "16")!, // RELABEL Striped Pleated Henley
];

// ── Modest alternatives ────────────────────────────────────────────────────
export const alternatives = [
  {
    brand: "Zara",
    description: "Love Zara's clean lines and minimal cuts? Find the same energy with more coverage.",
    image: PIN("2c/cb/53/2ccb5344fe566f8cfbf2d1a02f805454.jpg"),
    slug: "zara",
  },
  {
    brand: "& Other Stories",
    description: "The editorial Scandinavian aesthetic, in silhouettes that go further.",
    image: PIN("97/d3/c9/97d3c9be8078f8eb5cdca36343cea0fc.jpg"),
    slug: "and-other-stories",
  },
  {
    brand: "Reformation",
    description: "Feminine, sustainable, and flattering — with the coverage you choose.",
    image: PIN("3a/55/29/3a55298496faa685c59b1bdde0aec1b8.jpg"),
    slug: "reformation",
  },
];
