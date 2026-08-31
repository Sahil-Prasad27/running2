# Vintage Vinyl Frontend

This project is now a frontend-only version of the Vintage Vinyl dashboard.

## Files kept
- `index.html`
- `static/style.css`
- `static/app.js`
- `static/vinyl-cursor.svg`
- `static/vinyl-pointer.svg`

## How to use it
Open `index.html` in a browser, or serve the folder with any simple static server.

The app now runs entirely in the browser:
- no Python
- no SQL
- no backend API
- no server-side uploads

Demo data is seeded in `static/app.js` and saved in browser `localStorage`, so the forms, filters, exports, and dashboard stay usable as a standalone frontend.
