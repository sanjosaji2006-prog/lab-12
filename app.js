import { loadProducts, getCart, addToCart, setQuantity, saveCart, totals, money, escapeHtml as e, sessionUser, signIn, register, signOut } from "./store.js";

const page = document.body.dataset.page;
let products = [];
let toastTimer;
const $ = id => document.getElementById(id);

function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 3200);
}

function showError(error) {
    const area = $("page-error");
    if (area) { area.textContent = error.message || "Something went wrong. Please try again."; area.hidden = false; }
    else toast(error.message || "Please try again.");
}

function updateHeader() {
    $("cart-count").textContent = String(totals(getCart(products)).quantity);
    const user = sessionUser();
    $("account-label").textContent = user ? user.name.split(" ")[0] : "Account";
}

function productCard(product) {
    return `<article class="product-card"><a class="product-image" href="product.html?id=${encodeURIComponent(product.id)}" style="background:${e(product.color)}"><img src="${e(product.image)}" alt="Illustration of ${e(product.name)}" loading="lazy">${product.badge ? `<span class="badge">${e(product.badge)}</span>` : ""}</a><div class="product-meta"><span>${e(product.category)}</span><h3><a href="product.html?id=${encodeURIComponent(product.id)}">${e(product.name)}</a></h3><div class="product-bottom"><strong>${money(product.price)}</strong><button type="button" class="quick-add" data-add="${e(product.id)}" aria-label="Add ${e(product.name)} to cart">+</button></div></div></article>`;
}

function summary(lines, action = "") {
    const price = totals(lines);
    return `<h2>Order summary</h2><div class="summary-row"><span>Subtotal</span><strong>${money(price.subtotal)}</strong></div><div class="summary-row"><span>Delivery</span><strong>${price.shipping ? money(price.shipping) : "Free"}</strong></div><div class="summary-total"><span>Total</span><strong>${money(price.total)}</strong></div><p class="fine-print">Free delivery on orders of ${money(2500)} or more.</p>${action}`;
}

function renderProducts() {
    const query = $("product-search").value.trim().toLowerCase();
    const category = $("category-filter").value;
    let matches = products.filter(product => (category === "all" || product.category === category) && `${product.name} ${product.description}`.toLowerCase().includes(query));
    const sort = $("sort-products").value;
    if (sort === "price-asc") matches.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") matches.sort((a, b) => b.price - a.price);
    if (sort === "name") matches.sort((a, b) => a.name.localeCompare(b.name));
    $("product-count").textContent = `${matches.length} ${matches.length === 1 ? "product" : "products"}`;
    $("product-grid").innerHTML = matches.length ? matches.map(productCard).join("") : '<div class="empty-state wide"><h2>No products found.</h2><p>Try another search or category.</p></div>';
}

function renderProduct() {
    const id = new URLSearchParams(location.search).get("id");
    const product = products.find(item => item.id === id);
    if (!product) {
        $("product-detail").innerHTML = '<div class="empty-state wide"><h1>Product not found.</h1><a class="button" href="products.html">Explore the collection</a></div>';
        return;
    }
    document.title = `${product.name} | nook. — Lab 12`;
    $("product-detail").innerHTML = `<div class="detail-image" style="background:${e(product.color)}"><img src="${e(product.image)}" alt="Illustration of ${e(product.name)}"></div><div class="detail-copy"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><a href="products.html">Shop</a><span>/</span><span>${e(product.category)}</span></nav><p class="eyebrow">${e(product.category)}</p><h1>${e(product.name)}</h1><p class="detail-price">${money(product.price)}</p><p class="subtitle">${e(product.description)}</p><ul class="feature-list">${product.features.map(feature => `<li>${e(feature)}</li>`).join("")}</ul><form id="add-product-form"><label for="product-quantity">Quantity</label><div class="detail-actions"><input id="product-quantity" type="number" value="1" min="1" max="${Math.min(product.stock, 10)}" step="1" required><button type="submit" class="button">Add to cart <span aria-hidden="true">&rarr;</span></button></div></form><p class="fine-print">${product.stock} available in this demo catalogue. Delivery ${money(99)}, or free from ${money(2500)}.</p></div>`;
    $("add-product-form").addEventListener("submit", event => {
        event.preventDefault();
        try { addToCart(products, product.id, Number($("product-quantity").value)); toast(`${product.name} added to your cart.`); }
        catch (error) { toast(error.message); }
    });
}

function renderCart() {
    const lines = getCart(products);
    $("cart-layout").hidden = !lines.length;
    $("empty-cart").hidden = Boolean(lines.length);
    $("cart-item-count").textContent = `${totals(lines).quantity} items in your bag`;
    if (!lines.length) return;
    $("cart-lines").innerHTML = lines.map(({ product, quantity }) => `<article class="cart-line"><a class="cart-image" href="product.html?id=${e(product.id)}" style="background:${e(product.color)}"><img src="${e(product.image)}" alt="${e(product.name)}"></a><div class="cart-copy"><span class="eyebrow">${e(product.category)}</span><h2><a href="product.html?id=${e(product.id)}">${e(product.name)}</a></h2><span class="muted">${money(product.price)} each</span><div class="quantity-stepper"><button type="button" data-quantity="${e(product.id)}" data-step="-1" aria-label="Decrease quantity of ${e(product.name)}">&minus;</button><span>${quantity}</span><button type="button" data-quantity="${e(product.id)}" data-step="1" aria-label="Increase quantity of ${e(product.name)}" ${quantity >= Math.min(product.stock, 10) ? "disabled" : ""}>+</button></div></div><div class="cart-line-total"><strong>${money(product.price * quantity)}</strong><button class="text-button" type="button" data-remove="${e(product.id)}" aria-label="Remove ${e(product.name)}">Remove</button></div></article>`).join("");
    $("cart-summary").innerHTML = summary(lines, '<a href="checkout.html" class="button full-width">Continue to checkout <span aria-hidden="true">&rarr;</span></a><a href="products.html" class="continue-link">Continue shopping</a>');
}

function setupCheckout() {
    const lines = getCart(products);
    $("checkout-layout").hidden = !lines.length;
    $("checkout-empty").hidden = Boolean(lines.length);
    if (!lines.length) return;
    const user = sessionUser();
    if (user) { $("checkout-name").value = user.name; $("checkout-email").value = user.email; }
    $("checkout-summary").innerHTML = summary(lines) + `<div class="checkout-items">${lines.map(line => `<p><span>${e(line.product.name)} &times; ${line.quantity}</span><strong>${money(line.product.price * line.quantity)}</strong></p>`).join("")}</div>`;
    $("checkout-form").addEventListener("submit", event => {
        event.preventDefault();
        if (["checkout-name", "checkout-address", "checkout-city"].some(id => !$(id).value.trim())) { toast("Please complete your delivery details."); return; }
        const current = getCart(products);
        if (!current.length) { location.assign("cart.html"); return; }
        const price = totals(current);
        const id = "NK-" + crypto.randomUUID().slice(0, 8).toUpperCase();
        try { localStorage.setItem("lab12.nook.last-order", JSON.stringify({ id, total: price.total, items: current.map(line => ({ id: line.product.id, quantity: line.quantity })), createdAt: new Date().toISOString() })); saveCart([]); }
        catch { toast("Please allow browser storage to complete the demo order."); return; }
        $("checkout-layout").hidden = true;
        $("order-confirmation").hidden = false;
        $("order-id").textContent = id;
        $("order-total").textContent = money(price.total);
        $("order-confirmation").focus();
    });
    $("checkout-submit").disabled = false;
}

function renderAccount() {
    const user = sessionUser();
    $("account-forms").hidden = Boolean(user);
    $("account-profile").hidden = !user;
    if (user) { $("profile-name").textContent = `Hello, ${user.name}.`; $("profile-email").textContent = user.email; }
    updateHeader();
}

function setupAccount() {
    renderAccount();
    for (const button of document.querySelectorAll("[data-account-tab]")) {
        button.addEventListener("click", () => {
            const registerView = button.dataset.accountTab === "register";
            $("login-form").hidden = registerView;
            $("register-form").hidden = !registerView;
            $("account-message").hidden = true;
            for (const tab of document.querySelectorAll("[data-account-tab]")) tab.setAttribute("aria-pressed", String(tab === button));
        });
    }
    const complete = () => { renderAccount(); toast("You are signed in."); };
    for (const id of ["login-form", "register-form"]) {
        const form = $(id);
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = false;
        form.addEventListener("submit", async event => {
            event.preventDefault();
            $("account-message").hidden = true;
            submit.disabled = true;
            try {
                if (id === "login-form") await signIn($("login-email").value, $("login-password").value);
                else {
                    if ($("register-password").value !== $("register-confirm").value) throw new Error("The passwords do not match.");
                    await register($("register-name").value, $("register-email").value, $("register-password").value);
                }
                form.reset(); complete();
            } catch (error) { $("account-message").textContent = error.message; $("account-message").hidden = false; }
            finally { submit.disabled = false; }
        });
    }
    $("demo-account").addEventListener("click", () => { $("login-email").value = "shopper@example.com"; $("login-password").value = "Shopper@123"; });
    $("sign-out").addEventListener("click", () => { signOut(); renderAccount(); toast("You have signed out."); });
}

$("menu-toggle").addEventListener("click", () => {
    const expanded = $("menu-toggle").getAttribute("aria-expanded") !== "true";
    $("menu-toggle").setAttribute("aria-expanded", String(expanded)); $("main-nav").classList.toggle("open", expanded);
});

document.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    const change = event.target.closest("[data-quantity]");
    const remove = event.target.closest("[data-remove]");
    try {
        if (add) { addToCart(products, add.dataset.add); toast("Added to your cart."); }
        if (change) { const line = getCart(products).find(item => item.product.id === change.dataset.quantity); if (line) setQuantity(products, line.product.id, line.quantity + Number(change.dataset.step)); }
        if (remove) { setQuantity(products, remove.dataset.remove, 0); toast("Item removed from your cart."); }
    } catch (error) { toast(error.message); }
});

window.addEventListener("cart-updated", () => { updateHeader(); if (page === "cart") renderCart(); });
window.addEventListener("storage", () => { updateHeader(); if (page === "cart") renderCart(); });

try {
    products = await loadProducts(); updateHeader();
    if (page === "home") $("featured-products").innerHTML = products.slice(0, 4).map(productCard).join("");
    if (page === "products") {
        $("category-filter").innerHTML = '<option value="all">All categories</option>' + [...new Set(products.map(product => product.category))].map(category => `<option>${e(category)}</option>`).join("");
        for (const id of ["product-search", "category-filter", "sort-products"]) $(id).addEventListener(id === "product-search" ? "input" : "change", renderProducts);
        renderProducts();
    }
    if (page === "product") renderProduct();
    if (page === "cart") renderCart();
    if (page === "checkout") setupCheckout();
    if (page === "account") setupAccount();
    if (page === "contact") {
        $("contact-form").addEventListener("submit", event => { event.preventDefault(); $("contact-form").reset(); $("contact-confirmation").hidden = false; $("contact-confirmation").focus(); });
        $("contact-submit").disabled = false;
    }
} catch (error) { showError(error); }
