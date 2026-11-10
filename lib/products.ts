export type Aesthetic = "Minimal" | "Romantic" | "Streetwear" | "Classic" | "Casual";

export interface Product {
  id: string;
  title: string;
  store: string;
  price: string;
  image: string;
  aesthetic: Aesthetic;
  storeUrl: string;
  pinUrl: string;
  description: string;
  sizes: string[];
}

const PIN = (path: string) => `https://i.pinimg.com/originals/${path}`;

export const products: Product[] = [
  // ── Minimal ──────────────────────────────────────────────────────────────
  {
    id: "1",
    title: "Espresso Crinkle Rayon Top",
    store: "Klay The Label",
    price: "$58",
    image: PIN("d4/ca/ef/d4caefce6e58a48ad0f8fd5c36edd275.jpg"),
    aesthetic: "Minimal",
    storeUrl: "https://klaythelabel.com/products/espresso",
    pinUrl: "https://www.pinterest.com/pin/716635359503132103/",
    description:
      "Think red-brown autumn leaves, gathered into a single shade. Lightweight crinkle rayon with a relaxed, breathable drape — effortless coverage from morning to evening.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "2",
    title: "Fleece Mock Neck Pullover",
    store: "The Korean Fashion",
    price: "$42",
    image: PIN("55/df/40/55df4051452da2128c7bc42f1ea53561.jpg"),
    aesthetic: "Minimal",
    storeUrl: "https://thekoreanfashion.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131636/",
    description:
      "Oversized silhouette with a clean mock neckline and raglan sleeves. Smooth jersey texture in a uniform matte finish — a quiet, elevated everyday layer.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "3",
    title: "Boat-Neck Fine Knit Jumper",
    store: "H&M",
    price: "$35",
    image: PIN("2c/cb/53/2ccb5344fe566f8cfbf2d1a02f805454.jpg"),
    aesthetic: "Minimal",
    storeUrl: "https://eg.hm.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131639/",
    description:
      "Fine knit with a wide boat neckline, long sleeves, and narrow ribbing at the cuffs and hem. Simple, considered, and endlessly wearable.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    id: "4",
    title: "Samara Long Sleeve Tee — Charcoal",
    store: "Damson Madder",
    price: "$65",
    image: PIN("86/78/91/86789100253a24fdfa946221f11b61d5.png"),
    aesthetic: "Minimal",
    storeUrl: "https://damsonmadder.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131644/",
    description:
      "Oversized, boxy fit with signature grosgrain embroidered branding and contrast overlocking detail. An elevated daily basic with a quiet confidence.",
    sizes: ["6", "8", "10", "12", "14", "16"],
  },
  {
    id: "5",
    title: "Two-Way Half T-Shirt",
    store: "W Concept",
    price: "$48",
    image: PIN("3c/b2/92/3cb292e35d89aaa3a98cf1699307585e.jpg"),
    aesthetic: "Minimal",
    storeUrl: "https://wconcept.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131600/",
    description:
      "A versatile half-tee that can be styled two ways. Clean lines, premium fabric, and understated Seoul-ful design. Pairs back to everything.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "6",
    title: "Button Through Hood — Blue",
    store: "Damson Madder",
    price: "$75",
    image: PIN("81/9a/b4/819ab4d9b012b86ba8d9f4cd6bd122de.webp"),
    aesthetic: "Minimal",
    storeUrl: "https://damsonmadder.com/products/button-through-hood-blue",
    pinUrl: "https://www.pinterest.com/pin/716635359503131564/",
    description:
      "A hooded layer with button-through detail and a relaxed, enveloping silhouette. Functional and considered — the kind of piece you reach for without thinking.",
    sizes: ["6", "8", "10", "12", "14"],
  },

  // ── Romantic ─────────────────────────────────────────────────────────────
  {
    id: "7",
    title: "Lace Flower Abaya Set — Pink",
    store: "Shop Fatima Diallo",
    price: "$120",
    image: PIN("f6/e6/42/f6e642d74775c03f1b9dfac7bc50b5c1.jpg"),
    aesthetic: "Romantic",
    storeUrl: "https://www.instagram.com/p/DY0BTL0jctl/",
    pinUrl: "https://www.pinterest.com/pin/716635359503132136/",
    description:
      "The lace flower abaya in soft pink — delicate floral lace detail over a full-length silhouette. Available in multiple colours. Effortlessly modest and unmistakably romantic.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "8",
    title: "Botanical Print Mesh Maxi Skirt",
    store: "Princess Ace",
    price: "$39",
    image: PIN("77/92/25/7792259f445297d04ae29f8955978415.jpg"),
    aesthetic: "Romantic",
    storeUrl: "https://princessace.com",
    pinUrl: "https://www.pinterest.com/pin/AY7hqFa9IR_uXKM1HpAv7a08Ui4T9TGfFHT8FAIjehT6nyLgNXM_LtgyKd8CrcMHxE25yugOr4lMmFu69gkEx_4/",
    description:
      "A-line mesh maxi skirt in a botanical print. Polyester-spandex blend with a slight stretch waistband. Floor-grazing length with airy, garden-party movement.",
    sizes: ["S", "M", "L"],
  },
  {
    id: "9",
    title: "Floral Green Maxi Skirt",
    store: "Boutique",
    price: "$72",
    image: PIN("68/5f/f8/685ff855d642249a645449f2a181d923.jpg"),
    aesthetic: "Romantic",
    storeUrl: "#",
    pinUrl: "https://www.pinterest.com/pin/716635359503131920/",
    description:
      "A beautiful long skirt in deep green with a floral print. Full-length coverage, soft fabric, and a silhouette that moves. The kind of piece you want but haven't found yet.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "10",
    title: "Pointelle Long Sleeve Pullover — Navy",
    store: "The Fox Shop",
    price: "$55",
    image: PIN("32/ea/4c/32ea4cbc8d51df713688b390bf45652c.jpg"),
    aesthetic: "Romantic",
    storeUrl: "https://thefoxshop.co",
    pinUrl: "https://www.pinterest.com/pin/716635359503131633/",
    description:
      "100% cotton pointelle knit with a round neck and lace trim detail at the hem. Delicate stitch texture, long sleeves, and a lightweight feel — a romantic everyday staple.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "11",
    title: "Jewel Tones Editorial Look",
    store: "Boden",
    price: "$95",
    image: PIN("47/2d/8a/472d8affc7c65cd0649978089c0c8a1e.jpg"),
    aesthetic: "Romantic",
    storeUrl: "https://boden.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131585/",
    description:
      "Bold, romantic jewel tones brought together in a head-over-heels moment. Rich colour, considered silhouette, and the kind of look that makes a room pause.",
    sizes: ["6", "8", "10", "12", "14", "16", "18"],
  },
  {
    id: "12",
    title: "Frills Hooded Long Sleeve Top",
    store: "Lazy Oaf",
    price: "$68",
    image: PIN("2a/9f/f7/2a9ff7f797e78957a56f89b16983c43c.jpg"),
    aesthetic: "Romantic",
    storeUrl: "https://lazyoaf.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131637/",
    description:
      "Soft, semi-sheer green jersey hoodie with ruffle trim at the cuff and hem in pink. Playful, feminine, and completely singular. Here for the frill of it.",
    sizes: ["6", "8", "10", "12", "14"],
  },

  // ── Streetwear ───────────────────────────────────────────────────────────
  {
    id: "13",
    title: "Y2K Cyber Zip-Up Turtleneck Cardigan",
    store: "Litlookz Studio",
    price: "$85",
    image: PIN("31/a6/f7/31a6f745770e415d7690ffedccc632ba.png"),
    aesthetic: "Streetwear",
    storeUrl: "https://litlookzstudio.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131509/",
    description:
      "Y2K cyber-inspired zip-up turtleneck cardigan. Bold construction, techy details, and a silhouette that owns the room. Modesty and edge — no compromise.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "14",
    title: "String Long Parachute Skirt",
    store: "W Concept",
    price: "$88",
    image: PIN("b5/54/15/b55415f91319c863240fff7be4fd7b61.jpg"),
    aesthetic: "Streetwear",
    storeUrl: "https://wconcept.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131592/",
    description:
      "Long parachute skirt with string detail and a full, floor-length silhouette. Lightweight, utilitarian fabric with an effortless street-to-occasion range.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "15",
    title: "BDG Flounce Boatneck Oversized Tee — Olive",
    store: "Urban Outfitters",
    price: "$44",
    image: PIN("c9/bc/95/c9bc95145fef549446ed5b2108513320.jpg"),
    aesthetic: "Streetwear",
    storeUrl: "https://urbanoutfitters.com",
    pinUrl: "https://www.pinterest.com/pin/AVPjx-M1ZcXohU2j0wzTwBliPCxPQTkmYqP_ydVUaC2uoVKse71LeZ8yPjdpa3mBSp642kWoa0eqjq_Kq1Q3owg/",
    description:
      "Loose, trapeze-fit tee in a lightweight cotton-poly blend. Wide boatneck wearable on- or off-shoulder, drop-shoulder sleeves, and a draped high-low hem. Easy, oversized coverage.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "16",
    title: "RELABEL Striped Pleated Henley",
    store: "Project ISR",
    price: "$130",
    image: PIN("f1/0d/20/f10d20c50cf13ad07a5fe516ce8b0aa9.jpg"),
    aesthetic: "Streetwear",
    storeUrl: "https://projectisr.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131652/",
    description:
      "Deconstructed striped long-sleeve tee with a Henley neckline, pleated panelling, and curved seam detailing. 75% polyester, 15% cupro. Oversized, experimental, premium.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "17",
    title: "Punk Asymmetrical Patchwork Plaid Skirt",
    store: "Cosmoslay",
    price: "$52",
    image: PIN("ca/c7/28/cac72856092b7c75840899ff83e53058.jpg"),
    aesthetic: "Streetwear",
    storeUrl: "https://cosmoslay.com",
    pinUrl: "https://www.pinterest.com/pin/AWPvB_S_pN80rrX1Ea5GNNf_cwPF5CiHQIuB2E3AcOiYVfFNyuKT776ZRTeNlxfuh-dQB4T4PH0tp6RhNjLwCRM/",
    description:
      "A-line punk skirt in an asymmetric patchwork plaid. PVC-finish fabric, grey tones, and a silhouette that makes a statement. Waist 68–93 cm, length 72 cm.",
    sizes: ["XS / S", "M / L", "XL"],
  },
  {
    id: "18",
    title: "2000s Beach Aesthetic Set",
    store: "Boutique",
    price: "$60",
    image: PIN("32/23/a5/3223a561f56de893b21b9c833aefca28.jpg"),
    aesthetic: "Streetwear",
    storeUrl: "#",
    pinUrl: "https://www.pinterest.com/pin/716635359503131945/",
    description:
      "2000s beach aesthetic — softly edited tones, effortless coordination, and a nostalgic ease. Modest without trying. The kind of set you live in.",
    sizes: ["XS", "S", "M", "L"],
  },

  // ── Classic ──────────────────────────────────────────────────────────────
  {
    id: "19",
    title: "Emberwood Flannel Maxi Skirt",
    store: "Free People",
    price: "$118",
    image: PIN("87/f9/95/87f995d5388b0bc5cfba8307b7e56710.webp"),
    aesthetic: "Classic",
    storeUrl: "https://freepeople.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131883/",
    description:
      "Mid-rise flannel maxi skirt in a warm plaid. Full-length, slightly relaxed fit — the kind of autumn piece that earns its keep season after season.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "20",
    title: "Luan Check Wool-Rayon Skirt",
    store: "W Concept",
    price: "$145",
    image: PIN("82/82/b4/8282b4489ee37590e8a048e663938b2b.jpg"),
    aesthetic: "Classic",
    storeUrl: "https://wconcept.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131618/",
    description:
      "60% wool, 40% rayon check skirt from MONOCHROME. Vintage-style front buttons, back elastic, and a soft multi-coloured yarn blend. Dry clean only. One size (XS–M).",
    sizes: ["One Size"],
  },
  {
    id: "21",
    title: "Dark Red Vintage Detachable Jacket",
    store: "Belchic",
    price: "$98",
    image: PIN("e9/24/73/e92473e2f2c788dd765b7c1b36f888cb.jpg"),
    aesthetic: "Classic",
    storeUrl: "https://belchic.shop",
    pinUrl: "https://www.pinterest.com/pin/716635359503132111/",
    description:
      "Vintage-inspired dark red loose jacket with a detachable design. Rich colour, relaxed structure, and the kind of outerwear that completes rather than competes.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "22",
    title: "Leona Jacket — Lemon",
    store: "Shopee",
    price: "$78",
    image: PIN("9b/29/f4/9b29f4603d631a5194313fed60c9a0fe.jpg"),
    aesthetic: "Classic",
    storeUrl: "https://shopee.co.id",
    pinUrl: "https://www.pinterest.com/pin/716635359503131570/",
    description:
      "The Leona jacket in a bright, clean lemon. Structured silhouette, a colour that lifts any outfit, and the kind of statement that works with everything underneath.",
    sizes: ["S", "M", "L"],
  },
  {
    id: "23",
    title: "Staud Pre-Fall 2025 Look",
    store: "Staud",
    price: "$210",
    image: PIN("3a/55/29/3a55298496faa685c59b1bdde0aec1b8.jpg"),
    aesthetic: "Classic",
    storeUrl: "https://staud.clothing",
    pinUrl: "https://www.pinterest.com/pin/716635359503131581/",
    description:
      "From Staud's Pre-Fall 2025 collection. Refined, editorial, and deeply considered — the kind of piece that earns a permanent place in the wardrobe.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "24",
    title: "Khaki Asymmetrical Coord Set",
    store: "Shop Fatima Diallo",
    price: "$88",
    image: PIN("48/6b/2e/486b2e6d0ac7a6e3f8c27caef5b62d0b.jpg"),
    aesthetic: "Classic",
    storeUrl: "https://www.instagram.com/p/Dc_0xuLEcBe/",
    pinUrl: "https://www.pinterest.com/pin/716635359503132114/",
    description:
      "Khaki asymmetrical pants set for autumn. The co-ord you have been waiting for — earthy tones, relaxed cut, and a silhouette that works from morning to evening.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },

  // ── Casual ───────────────────────────────────────────────────────────────
  {
    id: "25",
    title: "Coffee Two-Piece Skirt Set",
    store: "AliExpress",
    price: "$38",
    image: PIN("0f/da/0f/0fda0f7f40195680815991f853a24553.jpg"),
    aesthetic: "Casual",
    storeUrl: "https://aliexpress.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503132141/",
    description:
      "Coffee-toned T-shirt and half-body skirt two-piece. Pile collar, long sleeve, and a warm earthy palette — an easy, effortless everyday set.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "26",
    title: "Kkco Striped Long Sleeve Box Tee",
    store: "Garmentory",
    price: "$75",
    image: PIN("7d/3e/44/7d3e44e3141f8f44e6d83d45206791e0.jpg"),
    aesthetic: "Casual",
    storeUrl: "https://garmentory.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131642/",
    description:
      "KkCo boxy long-sleeve in black and white with a magenta contrast collar. Side slits, stepped hem, and a quietly experimental LA-made quality.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "27",
    title: "We The Free Easy Striped Tee",
    store: "Free People",
    price: "$78",
    image: PIN("bc/4a/6b/bc4a6bb31361cfb7ecc717699f1276b0.jpg"),
    aesthetic: "Casual",
    storeUrl: "https://freepeople.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131631/",
    description:
      "Soft, easy-wearing striped tee from We The Free. Relaxed fit, all-day comfort, and a lived-in stripe that never dates. The kind of top that goes with everything.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "28",
    title: "Jenny Café — Oversized Tie-Front Top",
    store: "Serge Basics",
    price: "$48",
    image: PIN("97/d3/c9/97d3c9be8078f8eb5cdca36343cea0fc.jpg"),
    aesthetic: "Casual",
    storeUrl: "https://sergebasics.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131645/",
    description:
      "Oversized long-sleeve top in café brown with front tie detail. 100% cotton. Loose and relaxed with just enough structure — effortless modest dressing.",
    sizes: ["S", "M", "L"],
  },
  {
    id: "29",
    title: "Shirt to Tie — Anis",
    store: "Jennah Boutique",
    price: "$65",
    image: PIN("38/39/11/383911a73b6804424da8260e305e3905.jpg"),
    aesthetic: "Casual",
    storeUrl: "https://jennah-boutique.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131535/",
    description:
      "Asymmetrical 100% cotton shirt with interior and exterior ties. Buttons, structured Jennah pad on the sleeve, and a silhouette that shapes itself to you. Available in two lengths.",
    sizes: ["Size 1 (36–42)", "Size 2 (44–48)"],
  },
  {
    id: "30",
    title: "Dot Print Long Sleeve Top",
    store: "SHEIN",
    price: "$18",
    image: PIN("ab/a4/51/aba45149422c6e77ab69837118c9974f.jpg"),
    aesthetic: "Casual",
    storeUrl: "https://shein.com",
    pinUrl: "https://www.pinterest.com/pin/716635359503131588/",
    description:
      "Round neck long-sleeve top with contrast-colour polka dots. Light, easy, and endlessly mixable — a simple everyday piece at an accessible price.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
];

export const aesthetics: Aesthetic[] = ["Minimal", "Romantic", "Streetwear", "Classic", "Casual"];
