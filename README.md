# Lab 12 — Online Shopping Website

An independent HTML, CSS, JavaScript, and XML shopping website named **nook.**

## Public website

https://sanjosaji2006-prog.github.io/lab-12/

## Required pages

| Page | File | Features |
| --- | --- | --- |
| Home | `index.html` | Store introduction, featured products, and collection links. |
| Products | `products.html` | Products fetched from `products.xml`, with search, category filtering, sorting, and add-to-cart. |
| Product details | `product.html?id=...` | XML product details, price, stock, features, quantity, and add-to-cart. |
| Shopping cart | `cart.html` | Persistent items, quantity changes, removal, delivery, totals, and checkout link. |
| Checkout | `checkout.html` | Delivery form, order summary, validation, and demonstration order confirmation. |
| Login / Register | `account.html` | Sign-in, registration, password confirmation, demo account, profile, and sign-out. |
| Contact | `contact.html` | Contact details and a validated demonstration contact form. |

## Demo account

Email: `shopper@example.com`  
Password: `Shopper@123`

The website is an educational browser demo. Cart and account records use browser storage; account password hashes use salted PBKDF2. The session is limited to the current tab. Orders are demonstration records, payments are not collected, and the contact form does not send emails. Do not use a real password for a demonstration account.

`products.xml` is the product catalogue. Each product has an ID, name, category, price, stock, image, description, and features. `store.js` fetches and parses the XML using `DOMParser`; the catalogue is used by all shopping pages. Product illustrations are original SVG files included in this repository.

## Preview locally

```sh
python -m http.server 8012 --bind 127.0.0.1
```

Open http://127.0.0.1:8012/. Use an HTTP server so the browser can fetch the XML file. No packages or build step are required.

## Hosting

GitHub Pages publishes the `main` branch from **/ (root)**. All links, JavaScript modules, images, and the XML file use relative paths, so the site works at its `/lab-12/` project URL.
