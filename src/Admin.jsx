import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Bell,
  Settings,
  ArrowUpRight,
  Plus,
  Search,
  Pencil,
  LogOut,
  Check,
  X,
  ImagePlus,
  Download,
  Menu,
} from "lucide-react";
import { db, auth, storage, live, call } from "./firebase";
import { initialProducts, defaultSettings } from "./catalog";
import { money } from "./commerce";
import { Auth, Modal } from "./App";
import ProductImage from "./ProductImage";
const sections = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Products", icon: Package },
  { name: "Orders", icon: ShoppingBag },
  { name: "Subscribers", icon: Users },
  { name: "Notifications", icon: Bell },
  { name: "Store settings", icon: Settings },
];
const demoEvents = [
  {
    id: "preview-welcome",
    title: "Welcome to your studio",
    body: "Your orders and new subscribers will appear here in real time.",
    type: "system",
    read: false,
  },
];
export default function Admin({
  settings,
  user,
  notify,
  toast,
  setPreviewProducts,
  setPreviewSettings,
}) {
  const [allowed, setAllowed] = useState(!live),
    [checking, setChecking] = useState(live),
    [section, setSection] = useState("Overview"),
    [products, setProducts] = useState(live ? [] : initialProducts),
    [orders, setOrders] = useState([]),
    [subscribers, setSubscribers] = useState([]),
    [events, setEvents] = useState(live ? [] : demoEvents),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [nav, setNav] = useState(false),
    [error, setError] = useState("");
  const firstEvents = useRef(true),
    notifications = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (!live) return;
    if (!user) {
      setAllowed(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    user
      .getIdTokenResult(true)
      .then((t) => {
        if (!cancelled) {
          setAllowed(t.claims.admin === true);
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllowed(false);
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  useEffect(() => {
    if (!live || !allowed) return;
    firstEvents.current = true;
    const fail = () =>
      setError(
        "Studio data could not be loaded. Check your connection and administrator access.",
      );
    const subscriptions = [
      onSnapshot(
        collection(db, "products"),
        (s) => setProducts(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "orders"),
          orderBy("createdAt", "desc"),
          limit(200),
        ),
        (s) => setOrders(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "subscribers"),
          orderBy("createdAt", "desc"),
          limit(500),
        ),
        (s) => setSubscribers(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "notifications"),
          orderBy("createdAt", "desc"),
          limit(100),
        ),
        (s) => {
          setEvents(s.docs.map((d) => ({ ...d.data(), id: d.id })));
          if (!firstEvents.current)
            s.docChanges()
              .filter((c) => c.type === "added")
              .forEach((c) => {
                const e = c.doc.data();
                notify(e.title);
                if (
                  notifications.current &&
                  "Notification" in window &&
                  Notification.permission === "granted"
                )
                  new Notification(e.title, {
                    body: e.body,
                    icon: "/favicon.svg",
                  });
                window.chrome?.webview?.postMessage(
                  JSON.stringify({
                    type: "notification",
                    title: e.title,
                    body: e.body,
                  }),
                );
              });
          firstEvents.current = false;
        },
        fail,
      ),
    ];
    return () => subscriptions.forEach((f) => f());
  }, [allowed]);
  async function action(fn) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function enableNotifications() {
    if (!("Notification" in window)) {
      notify("Live notifications are available in the studio feed.");
      return;
    }
    const permission = await Notification.requestPermission();
    notifications.current = permission === "granted";
    notify(
      notifications.current
        ? "Desktop notifications enabled while the studio is open."
        : "Notifications remain available in your studio feed.",
    );
  }
  if (checking)
    return (
      <main className="admin-login">
        <h1>Opening your studio…</h1>
      </main>
    );
  if (live && !allowed)
    return (
      <main className="admin-login">
        <a className="wordmark" href="/">
          MUANO<span>LUXE</span>
        </a>
        <p className="eyebrow">THE MANAGEMENT STUDIO</p>
        <div className="admin-login-card">
          <h1>
            A space to shape
            <br />
            <em>what comes next.</em>
          </h1>
          {user ? (
            <>
              <p className="body-copy">
                This account does not have administrator access. Ask the project
                owner to grant your account the admin role.
              </p>
              <button className="button" onClick={() => signOut(auth)}>
                Use another account
              </button>
            </>
          ) : (
            <>
              <Auth admin notify={notify} />
              <details>
                <summary>Staff email sign-in</summary>
                <form
                  className="admin-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action(() =>
                      signInWithEmailAndPassword(
                        auth,
                        f.get("email"),
                        f.get("password"),
                      ),
                    );
                  }}
                >
                  <label>
                    Email
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="username"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      name="password"
                      required
                      autoComplete="current-password"
                    />
                  </label>
                  <button disabled={busy} className="button dark full">
                    Sign in to studio
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    onClick={(e) => {
                      const email = new FormData(e.currentTarget.form).get(
                        "email",
                      );
                      if (!email) {
                        notify("Enter your staff email address first.");
                        return;
                      }
                      action(async () => {
                        await sendPasswordResetEmail(auth, email);
                        notify(
                          "If this staff account exists, a password reset email has been sent.",
                        );
                      });
                    }}
                  >
                    Set or reset staff password
                  </button>
                </form>
              </details>
            </>
          )}
        </div>
        <a href="/" className="text-link">
          Return to the storefront <ArrowUpRight size={14} />
        </a>
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </main>
    );
  const lowStock = products.filter(
      (p) =>
        p.active &&
        p.variants.some((v) => Object.values(v.sizes).some((n) => n <= 3)),
    ),
    totalPaid = orders
      .filter((o) =>
        ["paid", "processing", "shipped", "delivered"].includes(o.status),
      )
      .reduce((s, o) => s + o.total, 0),
    unread = events.filter((e) => !e.read).length;
  const shown = products.filter((p) =>
    `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  function csvDownload() {
    const csv = [
      "Email,Subscribed at",
      ...subscribers.map(
        (s) =>
          `"${String(s.email)
            .replace(/^[=+@-]/, "'")
            .replaceAll(
              '"',
              '""',
            )}","${s.createdAt?.toDate?.().toISOString() || ""}"`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "muanoluxe-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${nav ? "open" : ""}`}>
        <a className="wordmark" href="/">
          MUANO<span>LUXE</span>
          <small>MANAGEMENT STUDIO</small>
        </a>
        <div className="studio-label">
          <span /> YOUR BRAND, CONSIDERED.
        </div>
        <nav>
          {sections.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={section === name ? "active" : ""}
              onClick={() => {
                setSection(name);
                setNav(false);
              }}
            >
              <Icon size={18} />
              {name}
              {name === "Notifications" && !!unread && <span>{unread}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer">
            Visit storefront <ArrowUpRight size={17} />
          </a>
          <button
            onClick={() =>
              live
                ? signOut(auth)
                : notify("You’re exploring the studio preview.")
            }
          >
            <LogOut size={17} /> {user ? "Sign out" : "Preview mode"}
          </button>
          <small>MUANOLUXE STUDIO · 01</small>
        </div>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <button
            className="icon admin-menu"
            aria-label="Toggle studio menu"
            onClick={() => setNav(!nav)}
          >
            <Menu />
          </button>
          <span>
            Studio <span className="muted">/ {section}</span>
          </span>
          <div>
            <span className={`connection-dot ${live ? "live" : ""}`} />
            <small>{live ? "Live store" : "Preview workspace"}</small>
            <button
              className="icon"
              aria-label="View notifications"
              onClick={() => setSection("Notifications")}
            >
              <Bell size={19} />
              {!!unread && <span className="notification-dot" />}
            </button>
            <span className="admin-avatar">M</span>
          </div>
        </header>
        <main className="admin-content">
          {!live && (
            <div className="admin-preview">
              <span>STUDIO PREVIEW</span> Changes stay in this session. Connect
              Firebase to manage your live store.
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="admin-title">
            <div>
              <p className="eyebrow">THE BIG PICTURE, BEAUTIFULLY SIMPLE.</p>
              <h1>
                {section === "Overview" ? "Welcome to your studio." : section}
              </h1>
              <p>
                {
                  {
                    Overview:
                      "A little perspective on everything you’re building.",
                    Products: "Thoughtful pieces. Every colour. Every size.",
                    Orders: "From first order to lasting impression.",
                    Subscribers: "The people who want to be a little closer.",
                    Notifications: "Stay close to the moments that matter.",
                    "Store settings":
                      "Make your storefront feel unmistakably yours.",
                  }[section]
                }
              </p>
            </div>
            {section === "Products" ? (
              <button
                className="button dark"
                onClick={() =>
                  setEditing({
                    id: "",
                    name: "",
                    category: "Essentials",
                    audience: "Women",
                    price: 0,
                    description: "",
                    material: "",
                    image: "/images/products.png#shirt",
                    tag: "NEW ARRIVAL",
                    active: false,
                    variants: [
                      {
                        color: "Ivory",
                        hex: "#e7e0d2",
                        sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0 },
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> Add a piece
              </button>
            ) : (
              <button className="button" onClick={enableNotifications}>
                <Bell size={15} /> Enable alerts
              </button>
            )}
          </div>
          {section === "Overview" && (
            <>
              <div className="stats-grid">
                {[
                  {
                    label: "TOTAL SALES",
                    value: money(totalPaid),
                    note: "Verified payments",
                    icon: ShoppingBag,
                  },
                  {
                    label: "ORDERS",
                    value: orders.length,
                    note: `${orders.filter((o) => o.status === "paid").length} ready to fulfil`,
                    icon: Package,
                  },
                  {
                    label: "ACTIVE PIECES",
                    value: products.filter((p) => p.active).length,
                    note: `${lowStock.length} pieces with low stock`,
                    icon: LayoutDashboard,
                  },
                  {
                    label: "INNER CIRCLE",
                    value: subscribers.length,
                    note: "Newsletter subscribers",
                    icon: Users,
                  },
                ].map(({ label, value, note, icon: Icon }) => (
                  <div className="stat" key={label}>
                    <div>
                      <span>{label}</span>
                      <Icon size={17} />
                    </div>
                    <strong>{value}</strong>
                    <small>{note}</small>
                  </div>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="admin-card">
                  <div className="card-title">
                    <h2>Recent orders</h2>
                    <button onClick={() => setSection("Orders")}>
                      View all <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <OrderList
                    orders={orders.slice(0, 5)}
                    busy={busy}
                    update={(id, status) =>
                      action(async () => {
                        await call("updateOrder", { id, status });
                        notify("Order updated.");
                      })
                    }
                  />
                </section>
                <section className="admin-card">
                  <div className="card-title">
                    <h2>In the studio</h2>
                    <Bell size={16} />
                  </div>
                  <EventList events={events.slice(0, 4)} />
                  <button
                    className="text-link"
                    onClick={() => setSection("Notifications")}
                  >
                    All notifications <ArrowRightSmall />
                  </button>
                </section>
              </div>
              <section className="admin-card">
                <div className="card-title">
                  <h2>The collection at a glance</h2>
                  <button onClick={() => setSection("Products")}>
                    Manage collection <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="admin-product-preview">
                  {products.slice(0, 4).map((p) => (
                    <button key={p.id} onClick={() => setEditing(p)}>
                      <ProductImage src={p.image} alt={p.name} />
                      <span>{p.name}</span>
                      <small>
                        {money(p.price)} · {p.variants.length} colours
                      </small>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
          {section === "Products" && (
            <section className="admin-card">
              <div className="admin-search">
                <Search size={17} />
                <input
                  placeholder="Search the collection…"
                  aria-label="Search inventory"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span>{shown.length} pieces</span>
              </div>
              <div className="table-scroll">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>PIECE</th>
                      <th>COLOURS & STOCK</th>
                      <th>PRICE</th>
                      <th>VISIBILITY</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product">
                            <ProductImage src={p.image} alt="" />
                            <div>
                              <strong>{p.name}</strong>
                              <small>
                                {p.category} · {p.audience}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="inventory-colours">
                            {p.variants.map((v) => (
                              <span key={v.color}>
                                <i style={{ background: v.hex }} />
                                {v.color}
                                <b>
                                  {Object.values(v.sizes).reduce(
                                    (s, n) => s + n,
                                    0,
                                  )}
                                </b>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{money(p.price)}</td>
                        <td>
                          <span
                            className={`status-pill ${!p.active ? "draft" : ""}`}
                          >
                            {p.active ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => setEditing(p)}
                          >
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {section === "Orders" && (
            <section className="admin-card">
              <p className="admin-note">
                Latest 200 orders. Payment status is verified by the server.
                Cancel unpaid orders to release stock; paid orders require a
                refund in Paystack before cancellation.
              </p>
              <OrderList
                orders={orders}
                busy={busy}
                update={(id, status) =>
                  action(async () => {
                    await call("updateOrder", { id, status });
                    notify("Order updated.");
                  })
                }
                expanded
              />
            </section>
          )}
          {section === "Subscribers" && (
            <section className="admin-card">
              <div className="card-title">
                <h2>The inner circle</h2>
                <button onClick={csvDownload}>
                  <Download size={15} /> Export CSV
                </button>
              </div>
              <p className="admin-note">
                Latest 500 subscribers. Only people who explicitly opted in
                appear here.
              </p>
              {subscribers.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Consent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.id}>
                        <td>{s.email}</td>
                        <td>
                          {s.createdAt
                            ?.toDate?.()
                            .toLocaleDateString("en-ZA") || "Just now"}
                        </td>
                        <td>
                          <span className="status-pill">Opted in</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">
                  <Users size={28} />
                  <h3>A circle worth building.</h3>
                  <p>New newsletter subscribers will appear here.</p>
                </div>
              )}
            </section>
          )}
          {section === "Notifications" && (
            <section className="admin-card">
              <div className="card-title">
                <h2>Your activity feed</h2>
                <button
                  onClick={() =>
                    action(async () => {
                      if (live) await call("markNotificationsRead", {});
                      else setEvents(events.map((e) => ({ ...e, read: true })));
                      notify("Notifications marked as read.");
                    })
                  }
                >
                  <Check size={15} /> Mark all as read
                </button>
              </div>
              <p className="admin-note">
                Order, payment, and subscription events are saved here. Desktop
                alerts work while the studio is open and permission is enabled.
              </p>
              <EventList events={events} />
            </section>
          )}
          {section === "Store settings" && (
            <SettingsForm
              settings={settings}
              busy={busy}
              onSave={(v) =>
                action(async () => {
                  if (live) await call("saveSettings", { settings: v });
                  else setPreviewSettings(v);
                  notify("Store settings saved.");
                })
              }
              onSeed={() =>
                action(async () => {
                  await call("seedCatalog", {
                    products: initialProducts,
                    settings: defaultSettings,
                  });
                  notify(
                    "Starter collection added as drafts. Review each piece before publishing.",
                  );
                })
              }
            />
          )}
        </main>
        <div className="admin-footer">
          MUANOLUXE STUDIO <span>Every detail, considered.</span>
        </div>
      </div>
      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSave={(p) =>
            action(async () => {
              if (live) await call("saveProduct", { product: p });
              else {
                const next = products.some((x) => x.id === p.id)
                  ? products.map((x) => (x.id === p.id ? p : x))
                  : [...products, p];
                setProducts(next);
                setPreviewProducts(next.filter((p) => p.active));
              }
              setEditing(null);
              notify("Piece saved.");
            })
          }
          busy={busy}
        />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
function ArrowRightSmall() {
  return <ArrowUpRight size={14} />;
}
function EventList({ events }) {
  return (
    <div className="event-list">
      {events.length ? (
        events.map((e) => (
          <div key={e.id} className={e.read ? "read" : ""}>
            <span className="event-icon">
              {e.type === "subscription" ? (
                <Users size={16} />
              ) : e.type === "order" ? (
                <ShoppingBag size={16} />
              ) : (
                <Bell size={16} />
              )}
            </span>
            <div>
              <strong>{e.title}</strong>
              <p>{e.body}</p>
              <small>
                {e.createdAt?.toDate?.().toLocaleString("en-ZA") ||
                  "Studio update"}
              </small>
            </div>
            {!e.read && <i />}
          </div>
        ))
      ) : (
        <div className="empty">
          <p>You’re all caught up.</p>
        </div>
      )}
    </div>
  );
}
function OrderList({ orders, update, busy, expanded = false }) {
  if (!orders.length)
    return (
      <div className="empty">
        <ShoppingBag size={30} />
        <h3>Your next chapter starts here.</h3>
        <p>New orders will appear here as customers check out.</p>
      </div>
    );
  return (
    <div className="order-list">
      {orders.map((o) => (
        <article key={o.id}>
          <div className="order-row">
            <div>
              <strong>{o.orderNumber}</strong>
              <p>
                {o.address?.name} ·{" "}
                {o.createdAt?.toDate?.().toLocaleDateString("en-ZA") ||
                  "Just now"}
              </p>
            </div>
            <strong>{money(o.total)}</strong>
            <span className="status-pill">{o.status.replaceAll("_", " ")}</span>
          </div>
          {expanded && (
            <>
              <p className="order-lines">
                {o.items.map((i, k) => (
                  <span key={k}>
                    {i.quantity} × {i.name} — {i.color} / {i.size}
                  </span>
                ))}
              </p>
              <p className="body-copy">
                {o.address?.email} · {o.address?.phone}
                <br />
                {[
                  o.address?.street,
                  o.address?.city,
                  o.address?.province,
                  o.address?.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
                {o.address?.notes && (
                  <>
                    <br />
                    Notes: {o.address.notes}
                  </>
                )}
              </p>
              <div className="order-actions">
                {o.status === "pending_payment" && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => update(o.id, "cancelled")}
                  >
                    Cancel & release stock
                  </button>
                )}
                {["paid", "processing", "shipped"].includes(o.status) && (
                  <button
                    className="button dark"
                    disabled={busy}
                    onClick={() =>
                      update(
                        o.id,
                        {
                          paid: "processing",
                          processing: "shipped",
                          shipped: "delivered",
                        }[o.status],
                      )
                    }
                  >
                    Mark as{" "}
                    {
                      {
                        paid: "processing",
                        processing: "shipped",
                        shipped: "delivered",
                      }[o.status]
                    }
                  </button>
                )}
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
function ProductEditor({ product, onClose, onSave, busy }) {
  const [p, setP] = useState(structuredClone(product)),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const field = (k, v) => setP((p) => ({ ...p, [k]: v }));
  const variant = (i, k, v) =>
    setP((p) => ({
      ...p,
      variants: p.variants.map((x, j) => (i === j ? { ...x, [k]: v } : x)),
    }));
  async function upload(file, index) {
    if (!file) return;
    if (!live) {
      setError("Connect Firebase Storage to upload product photos.");
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPEG, PNG, or WebP image under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const imageRef = ref(
        storage,
        `products/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`,
      );
      await uploadBytes(imageRef, file, { contentType: file.type });
      const url = await getDownloadURL(imageRef);
      if (index === undefined) field("image", url);
      else variant(index, "image", url);
    } catch {
      setError("The image could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <Modal
      title={product.id ? "Refine your piece" : "A new addition"}
      onClose={onClose}
      wide
    >
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          const id =
            p.id ||
            p.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") +
              "-" +
              crypto.randomUUID().slice(0, 6);
          if (
            !p.variants.length ||
            new Set(p.variants.map((v) => v.color.toLowerCase())).size !==
              p.variants.length
          ) {
            setError("Each piece needs at least one uniquely named colour.");
            return;
          }
          onSave({ ...p, id });
        }}
      >
        <div className="editor-layout">
          <div>
            <ProductImage
              className="editor-image"
              src={p.image}
              alt="Product preview"
            />
            <label className="upload-label">
              <ImagePlus size={17} />
              {uploading ? "Uploading…" : "Upload product photograph"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => upload(e.target.files[0])}
              />
            </label>
            <label>
              Image URL
              <input
                value={p.image}
                onChange={(e) => field("image", e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Product name
              <input
                value={p.name}
                onChange={(e) => field("name", e.target.value)}
                maxLength={100}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Category
                <select
                  value={p.category}
                  onChange={(e) => field("category", e.target.value)}
                >
                  {[
                    "Tailoring",
                    "Essentials",
                    "Knitwear",
                    "Outerwear",
                    "Accessories",
                    "Dresses",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Collection
                <select
                  value={p.audience}
                  onChange={(e) => field("audience", e.target.value)}
                >
                  {["Women", "Men", "Unisex"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Price (ZAR)
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={p.price / 100}
                  onChange={(e) =>
                    field("price", Math.round(Number(e.target.value) * 100))
                  }
                  required
                />
              </label>
              <label>
                Product badge
                <input
                  value={p.tag}
                  onChange={(e) => field("tag", e.target.value)}
                  maxLength={30}
                />
              </label>
            </div>
            <label>
              Description
              <textarea
                rows={3}
                value={p.description}
                onChange={(e) => field("description", e.target.value)}
                maxLength={2000}
                required
              />
            </label>
            <label>
              Composition & care
              <textarea
                rows={2}
                value={p.material}
                onChange={(e) => field("material", e.target.value)}
                maxLength={1000}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => field("active", e.target.checked)}
              />{" "}
              Publish this piece on the storefront
            </label>
          </div>
        </div>
        <div className="card-title">
          <h3>Colours & inventory</h3>
          <button
            type="button"
            onClick={() =>
              field("variants", [
                ...p.variants,
                {
                  color: "",
                  hex: "#888888",
                  sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0 },
                },
              ])
            }
          >
            <Plus size={15} /> Add colour
          </button>
        </div>
        <p className="admin-note">
          Stock is held per colour and size. Product edits use a revision check
          so incoming orders cannot be overwritten.
        </p>
        {p.variants.map((v, i) => (
          <div className="variant-editor" key={i}>
            <div className="form-row">
              <label>
                Colour name
                <input
                  required
                  maxLength={30}
                  value={v.color}
                  onChange={(e) => variant(i, "color", e.target.value)}
                />
              </label>
              <label>
                Swatch colour
                <input
                  type="color"
                  value={v.hex}
                  onChange={(e) => variant(i, "hex", e.target.value)}
                />
              </label>
            </div>
            <div className="stock-inputs">
              {Object.entries(v.sizes).map(([s, n]) => (
                <label key={s}>
                  {s}
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    value={n}
                    required
                    onChange={(e) =>
                      variant(i, "sizes", {
                        ...v.sizes,
                        [s]: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              Photo for this colour (optional)
              <input
                value={v.image || ""}
                onChange={(e) => variant(i, "image", e.target.value)}
              />
            </label>
            <div className="variant-actions">
              <label className="upload-label">
                <ImagePlus size={14} />
                Upload colour photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => upload(e.target.files[0], i)}
                />
              </label>
              <button
                className="text-link"
                type="button"
                onClick={() =>
                  field(
                    "variants",
                    p.variants.filter((_, j) => j !== i),
                  )
                }
              >
                Remove colour <X size={13} />
              </button>
            </div>
          </div>
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button dark full" disabled={busy || uploading}>
          {busy ? "Saving…" : "Save piece"} <Check size={16} />
        </button>
      </form>
    </Modal>
  );
}
function SettingsForm({ settings, onSave, busy, onSeed }) {
  const [s, setS] = useState(settings);
  const f = (k, v) => setS((s) => ({ ...s, [k]: v }));
  return (
    <section className="admin-card">
      <form
        className="admin-form settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(s);
        }}
      >
        <h2>The storefront</h2>
        <label>
          Announcement
          <input
            value={s.announcement}
            onChange={(e) => f("announcement", e.target.value)}
            maxLength={150}
            required
          />
        </label>
        <label>
          Hero title (one line per row)
          <textarea
            rows={2}
            value={s.heroTitle}
            onChange={(e) => f("heroTitle", e.target.value)}
            maxLength={150}
            required
          />
        </label>
        <label>
          Hero description
          <textarea
            rows={2}
            value={s.heroDescription}
            onChange={(e) => f("heroDescription", e.target.value)}
            maxLength={400}
            required
          />
        </label>
        <label>
          Hero image URL
          <input
            value={s.heroImage}
            onChange={(e) => f("heroImage", e.target.value)}
            required
          />
        </label>
        <h3>Brand story & newsletter</h3>
        {[
          ["storyTitle", "Story heading"],
          ["storyText", "Story introduction"],
          ["storyTextSecondary", "Story closing paragraph"],
          ["newsletterTitle", "Newsletter heading"],
          ["newsletterDescription", "Newsletter description"],
        ].map(([k, label]) => (
          <label key={k}>
            {label}
            <textarea
              value={s[k]}
              onChange={(e) => f(k, e.target.value)}
              maxLength={1000}
              required
            />
          </label>
        ))}
        <label>
          Story image URL
          <input
            value={s.storyImage}
            onChange={(e) => f("storyImage", e.target.value)}
            required
          />
        </label>
        <h3>Delivery & client services</h3>
        <div className="form-row">
          <label>
            Delivery fee (ZAR)
            <input
              type="number"
              min="0"
              step=".01"
              value={s.shippingFee / 100}
              onChange={(e) =>
                f("shippingFee", Math.round(Number(e.target.value) * 100))
              }
              required
            />
          </label>
          <label>
            Free delivery from (ZAR)
            <input
              type="number"
              min="0"
              step=".01"
              value={s.freeShippingThreshold / 100}
              onChange={(e) =>
                f(
                  "freeShippingThreshold",
                  Math.round(Number(e.target.value) * 100),
                )
              }
              required
            />
          </label>
        </div>
        <label>
          Support email
          <input
            type="email"
            value={s.supportEmail}
            onChange={(e) => f("supportEmail", e.target.value)}
          />
        </label>
        <label>
          Instagram URL
          <input
            type="url"
            value={s.instagramUrl}
            onChange={(e) => f("instagramUrl", e.target.value)}
          />
        </label>
        {[
          ["shippingPolicy", "Shipping & delivery policy"],
          ["returnsPolicy", "Returns & exchanges policy"],
          ["privacyPolicy", "Privacy policy"],
          ["terms", "Terms of service"],
        ].map(([k, label]) => (
          <label key={k}>
            {label}
            <textarea
              rows={4}
              value={s[k]}
              onChange={(e) => f(k, e.target.value)}
              maxLength={6000}
              required
            />
          </label>
        ))}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={s.published}
            onChange={(e) => f("published", e.target.checked)}
          />{" "}
          Enable checkout. I have reviewed prices, stock, policies, and Paystack
          configuration.
        </label>
        <button className="button dark" disabled={busy}>
          {busy ? "Saving…" : "Save store settings"} <Check size={16} />
        </button>
      </form>
      {live && (
        <div className="seed-panel">
          <h3>Start your collection</h3>
          <p className="body-copy">
            Import the sample collection as unpublished drafts. Existing
            products will be preserved. Review all images, prices, materials,
            and stock before publishing.
          </p>
          <button className="button" disabled={busy} onClick={onSeed}>
            Import starter collection
          </button>
        </div>
      )}
    </section>
  );
}
