import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  UserRound,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Heart,
  Check,
  ChevronDown,
  Menu,
  Truck,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  LogOut,
} from "lucide-react";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db, live, call } from "./firebase";
import { initialProducts, defaultSettings } from "./catalog";
import { addToBag, stockFor, totals, lineKey, money } from "./commerce";
const Admin = React.lazy(() => import("./Admin"));
import ProductImage from "./ProductImage";

function saved(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(fallback) && !Array.isArray(value)) return fallback;
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function useSaved(key, fallback) {
  const [v, set] = useState(() => saved(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, v]);
  return [v, set];
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = ref.current;
    root.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = [
          ...root.querySelectorAll(
            'button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]',
          ),
        ];
        const first = els[0],
          last = els.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === root)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === root)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    root.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
      root.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button aria-label="Close dialog" className="icon" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export default function App() {
  const [products, setProducts] = useState(live ? [] : initialProducts),
    [settings, setSettings] = useState(defaultSettings),
    [user, setUser] = useState(null);
  const [bag, setBag] = useSaved("muanoluxe-bag-v1", []),
    [wishlist, setWishlist] = useSaved("muanoluxe-wishlist-v1", []);
  const [filter, setFilter] = useState("All"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("featured"),
    [searchOpen, setSearchOpen] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState(null),
    [selected, setSelected] = useState(null),
    [toast, setToast] = useState(""),
    [chatOpen, setChatOpen] = useState(false),
    [loading, setLoading] = useState(live);
  const [checkoutId, setCheckoutId] = useState(() => crypto.randomUUID());
  const notify = (text) => setToast(text);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("payment_return");
    if (!id) return;
    setModal("account");
    if (!user) return;
    let active = true;
    call("verifyOrder", { id })
      .then((r) => {
        if (!active) return;
        if (["paid", "processing", "shipped", "delivered"].includes(r.status)) {
          setBag([]);
          setCheckoutId(crypto.randomUUID());
          notify("Payment confirmed. Thank you for choosing MuanoLuxe.");
        } else
          notify(
            "Your payment is being confirmed. Follow the status in your account.",
          );
        history.replaceState({}, "", location.pathname);
      })
      .catch(() => {
        if (active)
          notify(
            "Payment verification is pending. Your order status will update in your account.",
          );
      });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    if (!live) return;
    const unsub = onSnapshot(
      query(collection(db, "products"), where("active", "==", true)),
      (snap) => {
        setProducts(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        setLoading(false);
      },
      () => {
        setLoading(false);
        notify("We couldn’t load the collection. Please refresh in a moment.");
      },
    );
    const s = onSnapshot(
      doc(db, "settings", "store"),
      (d) => {
        if (d.exists()) setSettings({ ...defaultSettings, ...d.data() });
      },
      () => {},
    );
    return () => {
      unsub();
      s();
    };
  }, []);
  const goShop = (f = "All") => {
    setFilter(f);
    setMobileMenu(false);
    document
      .getElementById("collection")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  const toggleWish = (id) =>
    setWishlist((w) =>
      w.includes(id) ? w.filter((x) => x !== id) : [...w, id],
    );
  const add = (p, color, size) => {
    try {
      setBag(addToBag(bag, p, color, size));
      notify(`${p.name} added to your bag`);
    } catch (e) {
      notify(e.message);
    }
  };
  let visible = products.filter(
    (p) =>
      (filter === "All" ||
        p.category === filter ||
        p.audience === filter ||
        (["Men", "Women"].includes(filter) && p.audience === "Unisex") ||
        (filter === "Saved" && wishlist.includes(p.id)) ||
        (filter === "New arrivals" && p.tag === "NEW ARRIVAL")) &&
      `${p.name} ${p.category} ${p.variants.map((v) => v.color).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (sort !== "featured")
    visible = [...visible].sort((a, b) =>
      sort === "low" ? a.price - b.price : b.price - a.price,
    );
  if (location.pathname.startsWith("/admin"))
    return (
      <React.Suspense
        fallback={
          <main className="admin-login">
            <h1>Opening your studio…</h1>
          </main>
        }
      >
        <Admin
          products={products}
          settings={settings}
          user={user}
          notify={notify}
          toast={toast}
          setPreviewProducts={setProducts}
          setPreviewSettings={setSettings}
        />
      </React.Suspense>
    );
  return (
    <>
      <a href="#collection" className="skip-link">
        Skip to collection
      </a>
      <div className="announcement">
        <span>{settings.announcement}</span>
        <span className="announce-right">
          SOUTH AFRICA <span>·</span> ZAR
        </span>
      </div>
      <header className="header">
        <a href="/" className="wordmark" aria-label="MuanoLuxe home">
          MUANO<span>LUXE</span>
          <small>THE ART OF EVERYDAY</small>
        </a>
        <nav aria-label="Main navigation">
          <button onClick={() => goShop("New arrivals")}>New arrivals</button>
          <button onClick={() => goShop("Women")}>Women</button>
          <button onClick={() => goShop("Men")}>Men</button>
          <button onClick={() => goShop("All")}>The collection</button>
          <a href="#our-story">Our story</a>
        </nav>
        <div className="header-actions">
          <button
            className="icon"
            aria-label="Search collection"
            onClick={() => {
              setSearchOpen(!searchOpen);
              goShop();
            }}
          >
            <Search size={19} />
          </button>
          <button
            className="icon account-icon"
            aria-label="Your account"
            onClick={() => setModal("account")}
          >
            <UserRound size={19} />
          </button>
          <button
            className="icon bag-button"
            aria-label={`Shopping bag, ${bag.reduce((s, i) => s + i.quantity, 0)} items`}
            onClick={() => setModal("bag")}
          >
            <ShoppingBag size={19} />
            <span>Bag ({bag.reduce((s, i) => s + i.quantity, 0)})</span>
          </button>
          <button
            className="icon mobile-toggle"
            aria-label="Open menu"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu />
          </button>
        </div>
      </header>
      {mobileMenu && (
        <nav className="mobile-menu">
          {["New arrivals", "Women", "Men", "All", "Saved"].map((f) => (
            <button key={f} onClick={() => goShop(f)}>
              {f === "All" ? "The collection" : f}
            </button>
          ))}
          <button
            onClick={() => {
              setModal("account");
              setMobileMenu(false);
            }}
          >
            Your account
          </button>
        </nav>
      )}
      {(!live || !settings.published) && (
        <div className="preview-label">
          {live ? "COLLECTION PREVIEW" : "STUDIO PREVIEW"}{" "}
          <span>
            {live
              ? "Explore the new perspective · Checkout opens soon"
              : "Explore the collection · Orders and sign-in activate after setup"}
          </span>
        </div>
      )}
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="small-line" /> THE NEW PERSPECTIVE · COLLECTION
              01
            </div>
            <h1>
              {settings.heroTitle.split("\n").map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {i === 1 ? <em>{s}</em> : s}
                </React.Fragment>
              ))}
            </h1>
            <p>{settings.heroDescription}</p>
            <button className="button dark" onClick={() => goShop()}>
              Explore the collection <ArrowUpRight size={17} />
            </button>
            <div className="hero-bottom">
              <span>LESS, BUT BETTER.</span>
              <span>DESIGNED TO BE LIVED IN.</span>
            </div>
          </div>
          <div className="hero-photo">
            <img
              src={settings.heroImage}
              alt="MuanoLuxe editorial: contemporary ivory and black tailoring in warm architectural light"
              fetchPriority="high"
            />
            <div className="image-caption">
              <span>THE EVERYDAY, ELEVATED.</span>
              <span>01 / 26</span>
            </div>
            <span className="vertical-caption">
              MUANOLUXE — A STUDY IN SIMPLICITY
            </span>
          </div>
        </section>
        <div className="promise-strip">
          <span>
            <Truck size={17} /> Complimentary delivery over{" "}
            {money(settings.freeShippingThreshold)}
          </span>
          <span>
            <ShieldCheck size={17} /> Secure checkout with Paystack
          </span>
          <button onClick={() => setModal("returnsPolicy")}>
            <RotateCcw size={17} /> Considered service, every step
          </button>
        </div>
        <section id="collection" className="collection section-pad">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE WARDROBE, RECONSIDERED</p>
              <h2>Exceptional in the everyday.</h2>
            </div>
            <button
              className="text-link"
              onClick={() => {
                setSearch("");
                goShop("All");
              }}
            >
              Discover all pieces <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="collection-tools">
            <div className="tabs" role="group" aria-label="Filter collection">
              {["All", "Tailoring", "Essentials", "Knitwear", "Outerwear"].map(
                (f) => (
                  <button
                    className={filter === f ? "active" : ""}
                    key={f}
                    onClick={() => setFilter(f)}
                  >
                    {f === "All" ? "All pieces" : f}
                  </button>
                ),
              )}
              {["Women", "Men", "Saved", "New arrivals"].includes(filter) && (
                <button className="active" onClick={() => setFilter("All")}>
                  {filter} <X size={12} />
                </button>
              )}
            </div>
            <label className="sort">
              <SlidersHorizontal size={14} />
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </div>
          {searchOpen && (
            <div className="search-field">
              <Search size={18} />
              <input
                autoFocus
                placeholder="Search pieces, colours, or collections…"
                aria-label="Search products"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className="icon"
                aria-label="Close search"
                onClick={() => {
                  setSearchOpen(false);
                  setSearch("");
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="product-grid">
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                saved={wishlist.includes(p.id)}
                onWish={() => toggleWish(p.id)}
                onOpen={() => setSelected(p)}
              />
            ))}
          </div>
          {loading && <p className="empty">Discovering the collection…</p>}
          {!loading && !visible.length && (
            <div className="empty">
              <h3>No pieces found.</h3>
              <p>Try another colour, name, or collection.</p>
              <button
                className="button"
                onClick={() => {
                  setSearch("");
                  setFilter("All");
                }}
              >
                View all pieces
              </button>
            </div>
          )}
          {filter === "All" && !search && (
            <div className="collection-foot">
              <span>Thoughtfully chosen. Endlessly worn.</span>
              <button
                onClick={() => {
                  setFilter("Women");
                  goShop("Women");
                }}
                className="text-link"
              >
                Explore womenswear <ArrowRight size={16} />
              </button>
              <button onClick={() => goShop("Men")} className="text-link">
                Explore menswear <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
        <section className="story" id="our-story">
          <div className="story-image">
            <img
              loading="lazy"
              src={settings.storyImage}
              alt="The MuanoLuxe collection in soft natural light"
            />
            <span>LESS NOISE. MORE YOU.</span>
          </div>
          <div className="story-copy">
            <p className="eyebrow">THE MUANOLUXE PHILOSOPHY</p>
            <h2>
              {settings.storyTitle.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {i === 1 ? <em>{line}</em> : line}
                </React.Fragment>
              ))}
            </h2>
            <p>{settings.storyText}</p>
            <p>{settings.storyTextSecondary}</p>
            <button className="text-link" onClick={() => setModal("story")}>
              Get to know MuanoLuxe <ArrowUpRight size={17} />
            </button>
          </div>
        </section>
        <section className="newsletter">
          <span className="eyebrow">AN INVITATION TO THE INNER CIRCLE</span>
          <h2>{settings.newsletterTitle}</h2>
          <p>{settings.newsletterDescription}</p>
          <Newsletter notify={notify} />
        </section>
      </main>
      <footer>
        <div className="footer-main">
          <div>
            <a className="wordmark" href="/">
              MUANO<span>LUXE</span>
            </a>
            <p>Quiet confidence. Lasting impression.</p>
            <span className="eyebrow">
              ROOTED IN SOUTH AFRICA. MADE FOR YOUR EVERYDAY.
            </span>
          </div>
          <div>
            <h4>EXPLORE</h4>
            {["Women", "Men", "New arrivals", "Saved"].map((f) => (
              <button key={f} onClick={() => goShop(f)}>
                {f === "Saved" ? "Your wishlist" : f}
              </button>
            ))}
          </div>
          <div>
            <h4>CLIENT SERVICES</h4>
            <button onClick={() => setModal("shippingPolicy")}>
              Shipping & delivery
            </button>
            <button onClick={() => setModal("returnsPolicy")}>
              Returns & exchanges
            </button>
            <button onClick={() => setModal("size")}>Size guide</button>
            <button onClick={() => setChatOpen(true)}>
              Contact & assistance
            </button>
            {settings.supportEmail && (
              <a href={`mailto:${settings.supportEmail}`}>Email our team</a>
            )}
          </div>
          <div>
            <h4>STAY CONNECTED</h4>
            <button onClick={() => setModal("account")}>My account</button>
            {settings.instagramUrl && (
              <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
                Instagram <ArrowUpRight size={12} />
              </a>
            )}
            <a href="/admin">
              MuanoLuxe Studio <ArrowUpRight size={12} />
            </a>
            <div className="footer-location">South Africa · ZAR</div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} MuanoLuxe. All rights reserved.
          </span>
          <div>
            <button onClick={() => setModal("privacyPolicy")}>Privacy</button>
            <button onClick={() => setModal("terms")}>Terms of service</button>
            <span>CONSIDERED, ALWAYS.</span>
          </div>
        </div>
      </footer>
      <button
        className="chat-launch"
        onClick={() => setChatOpen(!chatOpen)}
        aria-label="Open shopping assistant"
      >
        <Sparkles size={17} />
        <span>Your personal style assistant</span>
        <span className="online-dot" />
      </button>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {selected && (
        <ProductDetail
          p={products.find((p) => p.id === selected.id) || selected}
          onClose={() => setSelected(null)}
          add={add}
          saved={wishlist.includes(selected.id)}
          onWish={() => toggleWish(selected.id)}
        />
      )}
      {modal === "bag" && (
        <Modal title="Your shopping bag" onClose={() => setModal(null)}>
          <Bag
            bag={bag}
            setBag={setBag}
            products={products}
            settings={settings}
            onShop={() => {
              setModal(null);
              goShop();
            }}
            onCheckout={() => setModal("checkout")}
          />
        </Modal>
      )}
      {modal === "checkout" && (
        <Modal title="Secure checkout" onClose={() => setModal(null)}>
          {user ? (
            <Checkout
              bag={bag}
              products={products}
              settings={settings}
              requestId={checkoutId}
              notify={notify}
              onSuccess={() => {
                setBag([]);
                setCheckoutId(crypto.randomUUID());
                setModal("account");
              }}
            />
          ) : (
            <>
              <p className="body-copy">
                Sign in to securely check out and follow your order’s progress.
              </p>
              <Auth onSuccess={() => setModal("checkout")} notify={notify} />
            </>
          )}
        </Modal>
      )}
      {modal === "account" && (
        <Modal
          title={user ? "Your account" : "Welcome to MuanoLuxe"}
          onClose={() => setModal(null)}
        >
          {user ? (
            <Account user={user} notify={notify} />
          ) : (
            <Auth
              onSuccess={() => notify("Welcome to MuanoLuxe.")}
              notify={notify}
            />
          )}
        </Modal>
      )}
      {[
        "shippingPolicy",
        "returnsPolicy",
        "privacyPolicy",
        "terms",
        "story",
        "size",
      ].includes(modal) && (
        <Modal
          title={
            {
              shippingPolicy: "Shipping & delivery",
              returnsPolicy: "Returns & exchanges",
              privacyPolicy: "Your privacy",
              terms: "Terms of service",
              story: "A considered point of view",
              size: "Find your fit",
            }[modal]
          }
          onClose={() => setModal(null)}
        >
          {modal === "size" ? (
            <>
              <p className="body-copy">
                General body measurements in centimetres. Fit can vary by piece;
                ask our team for garment-specific measurements.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Chest / bust</th>
                    <th>Waist</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["XS", "80–86", "62–68"],
                    ["S", "86–92", "68–74"],
                    ["M", "92–98", "74–80"],
                    ["L", "98–106", "80–88"],
                    ["XL", "106–114", "88–96"],
                  ].map((r) => (
                    <tr key={r[0]}>
                      {r.map((c) => (
                        <td key={c}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="body-copy">
              {modal === "story"
                ? "MuanoLuxe is a South African clothing label built around a simple idea: getting dressed should feel effortless. We explore clean lines, tactile textures, and versatile silhouettes, creating a wardrobe that leaves space for the person wearing it."
                : settings[modal]}
            </p>
          )}
        </Modal>
      )}
      {chatOpen && (
        <Chat
          onClose={() => setChatOpen(false)}
          products={products}
          settings={settings}
        />
      )}
    </>
  );
}
function ProductCard({ p, saved, onWish, onOpen }) {
  const [color, setColor] = useState(p.variants[0].color);
  return (
    <article className="product-card">
      <div className="product-image">
        <button
          className="product-open"
          aria-label={`View ${p.name}`}
          onClick={onOpen}
        >
          <ProductImage
            src={p.variants.find((v) => v.color === color)?.image || p.image}
            alt={`${p.name}, editorial product photograph`}
          />
        </button>
        {p.tag && <span className="product-tag">{p.tag}</span>}
        <button
          aria-label={saved ? `Unsave ${p.name}` : `Save ${p.name}`}
          onClick={onWish}
          className={`wish icon ${saved ? "selected" : ""}`}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
        <button className="quick-add" onClick={onOpen}>
          Discover this piece <Plus size={15} />
        </button>
      </div>
      <div className="product-info">
        <div>
          <p>{p.category.toUpperCase()}</p>
          <button onClick={onOpen}>{p.name}</button>
        </div>
        <span>{money(p.price)}</span>
      </div>
      <div className="product-colors">
        <div>
          {p.variants.map((v) => (
            <button
              key={v.color}
              className={`swatch ${color === v.color ? "active" : ""}`}
              style={{ "--swatch": v.hex }}
              aria-label={`${p.name} in ${v.color}`}
              title={v.color}
              aria-pressed={color === v.color}
              onClick={() => setColor(v.color)}
            />
          ))}
        </div>
        <span>
          {color} · {p.variants.length} colours
        </span>
      </div>
    </article>
  );
}
function ProductDetail({ p, onClose, add, saved, onWish }) {
  const [color, setColor] = useState(p.variants[0].color),
    [size, setSize] = useState("");
  const v = p.variants.find((v) => v.color === color);
  return (
    <Modal title="The finer details" onClose={onClose} wide>
      <div className="product-detail">
        <ProductImage src={v?.image || p.image} alt={p.name} />
        <div>
          <p className="eyebrow">
            {p.category} / {p.audience}
          </p>
          <h2>{p.name}</h2>
          <p className="detail-price">{money(p.price)}</p>
          <p className="body-copy">{p.description}</p>
          <label className="field-label">COLOUR — {color}</label>
          <div className="detail-swatches">
            {p.variants.map((v) => (
              <button
                key={v.color}
                className={`colour-choice ${color === v.color ? "active" : ""}`}
                onClick={() => {
                  setColor(v.color);
                  setSize("");
                }}
              >
                <span style={{ background: v.hex }} />
                {v.color}
              </button>
            ))}
          </div>
          <label className="field-label">SELECT SIZE</label>
          <div className="sizes">
            {Object.entries(v?.sizes || {}).map(([s, n]) => (
              <button
                disabled={!n}
                className={s === size ? "active" : ""}
                onClick={() => setSize(s)}
                key={s}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="stock-note">
            {size
              ? `${stockFor(p, color, size)} available in ${color} / ${size}`
              : "Choose your colour and size to see availability."}
          </p>
          <button
            className="button dark full"
            disabled={!size || !stockFor(p, color, size)}
            onClick={() => add(p, color, size)}
          >
            Add to bag <ShoppingBag size={17} />
          </button>
          <button className="button full" onClick={onWish}>
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved to wishlist" : "Save for later"}
          </button>
          <details>
            <summary>
              Composition & care <Plus size={14} />
            </summary>
            <p>{p.material}</p>
          </details>
          <details>
            <summary>
              Fit notes <Plus size={14} />
            </summary>
            <p>
              Choose your usual size. Prefer a relaxed silhouette? Size up. Ask
              the style assistant for help comparing pieces.
            </p>
          </details>
          <p className="fine-print">
            Campaign imagery is illustrative. All available colours are shown
            above; exact product photos can be added by the store.
          </p>
        </div>
      </div>
    </Modal>
  );
}
function Bag({ bag, setBag, products, settings, onShop, onCheckout }) {
  const t = totals(bag, products, settings);
  const invalid = bag.some(
    (i) =>
      i.quantity >
      stockFor(
        products.find((p) => p.id === i.productId),
        i.color,
        i.size,
      ),
  );
  if (!bag.length)
    return (
      <div className="empty">
        <ShoppingBag size={34} />
        <h3>A little room for something exceptional.</h3>
        <p>Your bag is waiting for your favourite pieces.</p>
        <button className="button dark" onClick={onShop}>
          Explore the collection <ArrowRight size={16} />
        </button>
      </div>
    );
  return (
    <>
      <div className="bag-items">
        {bag.map((item) => {
          const p = products.find((p) => p.id === item.productId);
          return (
            <div className="bag-item" key={lineKey(item)}>
              {p && <ProductImage src={p.image} alt={p.name} />}
              <div>
                <h4>{p?.name || "Unavailable piece"}</h4>
                <p>
                  {item.color} / {item.size}
                </p>
                <strong>{money((p?.price || 0) * item.quantity)}</strong>
                <div className="quantity">
                  <button
                    aria-label={`Decrease ${p?.name} quantity`}
                    onClick={() =>
                      setBag(
                        bag.flatMap((i) =>
                          lineKey(i) === lineKey(item)
                            ? i.quantity > 1
                              ? [{ ...i, quantity: i.quantity - 1 }]
                              : []
                            : [i],
                        ),
                      )
                    }
                  >
                    <Minus size={13} />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    aria-label={`Increase ${p?.name} quantity`}
                    disabled={
                      item.quantity >= stockFor(p, item.color, item.size)
                    }
                    onClick={() =>
                      setBag(
                        bag.map((i) =>
                          lineKey(i) === lineKey(item)
                            ? { ...i, quantity: i.quantity + 1 }
                            : i,
                        ),
                      )
                    }
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <button
                className="icon"
                aria-label={`Remove ${p?.name}`}
                onClick={() =>
                  setBag(bag.filter((i) => lineKey(i) !== lineKey(item)))
                }
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="order-totals">
        <p>
          <span>Subtotal</span>
          <span>{money(t.subtotal)}</span>
        </p>
        <p>
          <span>Estimated delivery</span>
          <span>{t.shipping ? money(t.shipping) : "Complimentary"}</span>
        </p>
        <p className="total">
          <span>Total</span>
          <span>{money(t.total)}</span>
        </p>
      </div>
      {invalid && (
        <p className="form-error">
          Some pieces are no longer available in the requested quantity. Adjust
          your bag to continue.
        </p>
      )}
      <button
        className="button dark full"
        disabled={invalid || (live && !settings.published)}
        onClick={onCheckout}
      >
        {live && !settings.published
          ? "Checkout opening soon"
          : "Continue to checkout"}{" "}
        <ArrowRight size={17} />
      </button>
      <p className="fine-print">
        Stock and pricing are verified at checkout. Payment is processed
        securely by Paystack.
      </p>
    </>
  );
}
export function Auth({ onSuccess, notify, admin = false }) {
  const [busy, setBusy] = useState(false),
    [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [confirmation, setConfirmation] = useState(null),
    [error, setError] = useState("");
  const captcha = useRef(null),
    container = useRef(null);
  useEffect(() => () => captcha.current?.clear(), []);
  async function run(fn) {
    if (!live) {
      setError(
        "Sign-in is unavailable in the studio preview. Complete Firebase setup to enable it.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e.code === "auth/popup-closed-by-user"
          ? "Sign-in was cancelled. You can try again."
          : e.code === "auth/invalid-verification-code"
            ? "That code is incorrect. Please try again."
            : "Sign-in could not be completed. Check your details and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <p className="body-copy">
        {admin
          ? "Sign in with an account granted the administrator role."
          : "Your favourite pieces, your orders, your MuanoLuxe."}
      </p>
      <button
        disabled={
          busy || (admin && new URLSearchParams(location.search).has("desktop"))
        }
        className="button full"
        onClick={() =>
          run(async () => {
            await signInWithPopup(auth, new GoogleAuthProvider());
            onSuccess?.();
          })
        }
      >
        <span className="google-g">G</span> Continue with Google
      </button>
      <div className="divider">or use your phone</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (confirmation) {
              await confirmation.confirm(code);
              onSuccess?.();
            } else {
              captcha.current ||= new RecaptchaVerifier(
                auth,
                container.current,
                { size: "invisible" },
              );
              setConfirmation(
                await signInWithPhoneNumber(auth, phone, captcha.current),
              );
              notify?.("Verification code sent.");
            }
          });
        }}
      >
        <label>
          Phone number
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+27 82 123 4567"
            required
            pattern="\+[1-9][0-9]{7,14}"
            disabled={!!confirmation}
          />
        </label>
        {confirmation && (
          <label>
            Verification code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              pattern="[0-9]{6}"
              required
              placeholder="6-digit code"
            />
          </label>
        )}
        <div ref={container} />
        <button className="button dark full" disabled={busy}>
          {busy
            ? "Please wait…"
            : confirmation
              ? "Verify & sign in"
              : "Send verification code"}
        </button>
        {confirmation && (
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setConfirmation(null);
              setCode("");
            }}
          >
            Use a different number
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p className="fine-print">
        By continuing, you agree to our terms and privacy policy. Your number is
        sent to Google to prevent abuse. Standard SMS rates may apply.
      </p>
    </div>
  );
}
function Checkout({ bag, products, settings, requestId, notify, onSuccess }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const t = totals(bag, products, settings);
  return (
    <form
      className="checkout-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const form = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const r = await call("placeOrder", {
            items: bag,
            address: form,
            requestId,
          });
          if (!r.url?.startsWith("https://checkout.paystack.com/"))
            throw new Error(
              "Unable to open secure checkout. Please try again.",
            );
          sessionStorage.setItem("muanoluxe-pending-order", r.id);
          window.location.assign(r.url);
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="body-copy">
        Your pieces, one step closer. Enter your delivery details, then continue
        to Paystack to pay securely.
      </p>
      <label>
        Full name
        <input name="name" autoComplete="name" required maxLength={100} />
      </label>
      <div className="form-row">
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={150}
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            maxLength={30}
          />
        </label>
      </div>
      <label>
        Street address
        <input
          name="street"
          autoComplete="street-address"
          required
          maxLength={200}
        />
      </label>
      <div className="form-row">
        <label>
          City
          <input
            name="city"
            autoComplete="address-level2"
            required
            maxLength={100}
          />
        </label>
        <label>
          Postal code
          <input
            name="postalCode"
            autoComplete="postal-code"
            required
            maxLength={15}
          />
        </label>
      </div>
      <label>
        Province
        <input
          name="province"
          autoComplete="address-level1"
          required
          maxLength={100}
        />
      </label>
      <p className="fine-print">
        South African delivery addresses only. Our team confirms delivery before
        payment.
      </p>
      <label>
        Delivery notes (optional)
        <textarea name="notes" maxLength={500} />
      </label>
      <label className="checkbox">
        <input type="checkbox" required /> I agree to the terms and the
        processing of my details to fulfil this order.
      </label>
      <div className="order-totals">
        <p className="total">
          <span>Estimated total</span>
          <span>{money(t.total)}</span>
        </p>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button disabled={busy || !bag.length} className="button dark full">
        {busy ? "Preparing secure payment…" : "Pay with Paystack"}{" "}
        <ArrowRight size={16} />
      </button>
      <p className="fine-print">
        Your card details stay with Paystack. Stock is reserved for 30 minutes.
        Payment is confirmed securely before fulfilment.
      </p>
    </form>
  );
}
function Account({ user, notify }) {
  const [orders, setOrders] = useState([]),
    [error, setError] = useState("");
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "orders"), where("userId", "==", user.uid)),
        (s) =>
          setOrders(
            s.docs
              .map((d) => ({ ...d.data(), id: d.id }))
              .sort(
                (a, b) =>
                  (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
              ),
          ),
        () => setError("Orders could not be loaded. Please try again."),
      ),
    [user.uid],
  );
  return (
    <>
      <div className="account-summary">
        <UserRound />
        <div>
          <strong>{user.displayName || "MuanoLuxe member"}</strong>
          <p>{user.email || user.phoneNumber}</p>
        </div>
        <button
          className="icon"
          aria-label="Sign out"
          onClick={() => signOut(auth)}
        >
          <LogOut size={18} />
        </button>
      </div>
      <h3>Your orders</h3>
      {error && <p className="form-error">{error}</p>}
      {!orders.length ? (
        <p className="body-copy">
          Your story with us is just beginning. Your orders will appear here.
        </p>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="account-order">
            <div>
              <strong>{o.orderNumber}</strong>
              <span className="status-pill">{o.status}</span>
            </div>
            <p>{o.items?.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</p>
            <strong>{money(o.total)}</strong>
            {o.status === "pending_payment" && (
              <button
                className="button full"
                onClick={async () => {
                  try {
                    const r = await call("retryPayment", { id: o.id });
                    if (r.url?.startsWith("https://checkout.paystack.com/"))
                      window.location.assign(r.url);
                  } catch (e) {
                    notify(e.message);
                  }
                }}
              >
                Continue payment
              </button>
            )}
          </div>
        ))
      )}
      <button
        className="text-link"
        onClick={async () => {
          try {
            await call("unsubscribe", {});
            notify("You have been unsubscribed from the newsletter.");
          } catch (e) {
            notify(e.message);
          }
        }}
      >
        Unsubscribe from the newsletter
      </button>
    </>
  );
}
function Newsletter({ notify }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        try {
          await call("subscribe", {
            email: new FormData(form).get("email"),
            consent: true,
          });
          notify("You’re on the list. Welcome to the inner circle.");
          form.reset();
        } catch (e) {
          notify(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="newsletter-input">
        <input
          name="email"
          type="email"
          placeholder="Your email address"
          aria-label="Newsletter email address"
          required
          maxLength={150}
        />
        <button aria-label="Subscribe to newsletter" disabled={busy}>
          {busy ? "…" : <ArrowRight size={22} />}
        </button>
      </div>
      <label className="newsletter-consent">
        <input type="checkbox" required /> I’d like to receive MuanoLuxe emails.
        Unsubscribe anytime through your account or by contacting us.
      </label>
    </form>
  );
}
function Chat({ onClose, products, settings }) {
  const [messages, setMessages] = useState([
      {
        role: "assistant",
        text: "Welcome to MuanoLuxe. Looking for a particular piece, a little styling advice, or your next everyday favourite?",
      },
    ]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false);
  const bottom = useRef();
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);
  async function send(text) {
    if (!text.trim() || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      let answer;
      if (live) {
        answer = (
          await call("shoppingAssistant", {
            message: text,
            history: messages.slice(-8),
          })
        ).text;
      } else {
        const p = products.find(
          (p) =>
            text.toLowerCase().includes(p.category.toLowerCase()) ||
            text
              .toLowerCase()
              .includes(p.name.replace("The ", "").split(" ")[0].toLowerCase()),
        );
        answer = p
          ? `${p.name} is ${money(p.price)} and comes in ${p.variants.map((v) => v.color).join(", ")}. ${p.description} Open the piece to choose a colour and see size availability.`
          : text.toLowerCase().includes("deliver")
            ? `Our estimated delivery fee is ${money(settings.shippingFee)}, with complimentary delivery over ${money(settings.freeShippingThreshold)}. The team confirms availability before payment.`
            : "For an effortless wardrobe, start with the Signature Blazer and Sculpted Trouser, then add the Essential Shirt. In this preview I can share collection details; the Gemini styling assistant activates after secure server setup.";
      }
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Our style assistant is temporarily unavailable. Please try again shortly.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="chat-panel" aria-label="Shopping assistant">
      <header>
        <Sparkles size={19} />
        <div>
          <strong>The MuanoLuxe concierge</strong>
          <small>
            {live ? "AI styling assistant" : "Collection guide · preview"}
          </small>
        </div>
        <button className="icon" aria-label="Close assistant" onClick={onClose}>
          <X size={19} />
        </button>
      </header>
      <div className="chat-messages" aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className={m.role}>
            {m.text}
          </p>
        ))}
        {busy && <p>Considering your request…</p>}
        <div ref={bottom} />
      </div>
      <div className="chat-suggestions">
        {["Help me style tailoring", "Delivery details"].map((s) => (
          <button key={s} disabled={busy} onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          aria-label="Message the assistant"
          placeholder="A little help finding your style…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
        />
        <button
          className="icon"
          aria-label="Send message"
          disabled={busy || !input.trim()}
        >
          <Send size={18} />
        </button>
      </form>
      <small className="chat-disclaimer">
        AI advice may be imperfect. Confirm fit and details before ordering.
      </small>
    </section>
  );
}
