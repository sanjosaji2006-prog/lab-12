const CART_KEY = "lab12.nook.cart";
const USER_KEY = "lab12.nook.users";
const SESSION_KEY = "lab12.nook.session";
let productRequest;

export const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export async function loadProducts() {
    productRequest ??= (async () => {
        const response = await fetch("products.xml");
        if (!response.ok) throw new Error("The product catalogue could not be loaded. Please refresh.");
        const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
        if (xml.querySelector("parsererror")) throw new Error("The product catalogue is invalid.");
        const products = [...xml.querySelectorAll("product")].map(node => {
            const text = tag => node.querySelector(tag)?.textContent.trim() ?? "";
            return { id: node.getAttribute("id"), name: text("name"), category: text("category"), price: Number(text("price")), stock: Number(text("stock")), image: text("image"), color: text("color"), description: text("description"), badge: text("badge"), features: [...node.querySelectorAll("feature")].map(feature => feature.textContent.trim()) };
        });
        const ids = new Set();
        for (const product of products) {
            if (!/^[a-z0-9-]+$/.test(product.id) || ids.has(product.id) || !product.name || !Number.isSafeInteger(product.price) || product.price <= 0 || !Number.isSafeInteger(product.stock) || product.stock < 1 || !/^[a-z0-9-]+\.svg$/.test(product.image) || !/^#[a-f0-9]{6}$/i.test(product.color)) throw new Error("The product catalogue contains invalid details.");
            ids.add(product.id);
        }
        if (!products.length) throw new Error("There are no products to display.");
        return products;
    })();
    return productRequest;
}

export function getCart(products) {
    const raw = read(CART_KEY, []);
    if (!Array.isArray(raw)) return [];
    const quantities = new Map();
    for (const line of raw) {
        const product = products.find(item => item.id === line?.id);
        if (!product || !Number.isSafeInteger(line.quantity) || line.quantity < 1) continue;
        quantities.set(product.id, Math.min(product.stock, 10, (quantities.get(product.id) ?? 0) + line.quantity));
    }
    return [...quantities].map(([id, quantity]) => ({ product: products.find(item => item.id === id), quantity }));
}

export function saveCart(lines) {
    localStorage.setItem(CART_KEY, JSON.stringify(lines.map(line => ({ id: line.product.id, quantity: line.quantity }))));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
}

export function addToCart(products, id, quantity = 1) {
    const product = products.find(item => item.id === id);
    if (!product || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Please choose a valid quantity.");
    const cart = getCart(products);
    const line = cart.find(item => item.product.id === id);
    const nextQuantity = (line?.quantity ?? 0) + quantity;
    if (nextQuantity > Math.min(product.stock, 10)) throw new Error(`You can add up to ${Math.min(product.stock, 10)} of this item.`);
    if (line) line.quantity = nextQuantity; else cart.push({ product, quantity });
    saveCart(cart);
}

export function totals(lines) {
    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
    const shipping = subtotal === 0 || subtotal >= 2500 ? 0 : 99;
    return { subtotal, shipping, total: subtotal + shipping, quantity: lines.reduce((sum, line) => sum + line.quantity, 0) };
}

export function setQuantity(products, id, quantity) {
    const cart = getCart(products);
    const line = cart.find(item => item.product.id === id);
    if (!line || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > Math.min(line.product.stock, 10)) throw new Error("Please choose a valid quantity.");
    if (quantity === 0) saveCart(cart.filter(item => item.product.id !== id));
    else { line.quantity = quantity; saveCart(cart); }
}

const hex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
async function hashPassword(password, salt) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256));
}

async function accountRecord(name, email, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return { name, email, salt: hex(salt), hash: await hashPassword(password, salt) };
}

async function users() {
    let records = read(USER_KEY, []);
    if (!Array.isArray(records)) records = [];
    if (!records.some(user => user.email === "shopper@example.com")) {
        records.push(await accountRecord("Demo Shopper", "shopper@example.com", "Shopper@123"));
        localStorage.setItem(USER_KEY, JSON.stringify(records));
    }
    return records;
}

export function sessionUser() {
    try {
        const user = JSON.parse(sessionStorage.getItem(SESSION_KEY));
        return user && typeof user.name === "string" && typeof user.email === "string" ? user : null;
    } catch { return null; }
}

export async function signIn(email, password) {
    const user = (await users()).find(record => record.email === email.trim().toLowerCase());
    if (!user || !/^[a-f0-9]{32}$/.test(user.salt)) throw new Error("The email or password is incorrect.");
    const salt = Uint8Array.from(user.salt.match(/.{2}/g), byte => parseInt(byte, 16));
    if (await hashPassword(password, salt) !== user.hash) throw new Error("The email or password is incorrect.");
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
}

export async function register(name, email, password) {
    name = name.trim(); email = email.trim().toLowerCase();
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 256) throw new Error("Enter your name, a valid email, and a password of at least 8 characters.");
    const records = await users();
    if (records.some(user => user.email === email)) throw new Error("An account with this email already exists. Please sign in.");
    records.push(await accountRecord(name, email, password));
    localStorage.setItem(USER_KEY, JSON.stringify(records));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name, email }));
}

export function signOut() { sessionStorage.removeItem(SESSION_KEY); }
