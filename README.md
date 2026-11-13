# Honeycomb BH – Meeting Room Booking (static site + Google Apps Script)

Files (keep all next to index.html): index.html, style.css, config.js, api.js, app.js
Backend: google-apps-script/Code.gs (paste into Google Apps Script, not uploaded to GitHub Pages)

## 1. Backend (approval by email)
1. Create a Google Sheet (any name) -> Extensions -> Apps Script.
2. Replace the code with google-apps-script/Code.gs. Edit APPROVERS (and ROOMS if needed).
3. Deploy -> New deployment -> type "Web app" -> Execute as: Me; Who has access: Anyone -> Deploy.
   Approve the permission prompts (Sheets + sending email). Copy the Web app URL.
   (After any later code change: Deploy -> Manage deployments -> edit -> New version.)
4. Paste the URL into config.js: scriptUrl: 'https://script.google.com/macros/s/.../exec'

## 2. Publish
Upload index.html, style.css, config.js, api.js, app.js to a GitHub repo root.
Settings -> Pages -> main / (root).

## How it works
Employee submits -> row saved in the sheet -> every approver gets an email with a link ->
link opens a review page with Approve / Reject (reason required) -> first decision wins ->
organizer and guests are emailed. Competing pending requests for the same slot are auto-rejected.

## Limits
- Gmail free accounts send ~100 emails/day (Workspace ~1500).
- The employee login only asks for name + email (no password), so anyone could book as anyone.
  Approver links are signed and safe. For real logins, use Firebase/Supabase auth.
- With scriptUrl empty the site runs in browser-only demo mode (no emails, not shared).
