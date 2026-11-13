# Meeting Room Booking

> ⚠️ Status: under development.This project is not fully developed yet. Features may be
> incomplete, change without notice, or contain bugs. Do not rely on it for critical bookings.

A simple meeting-room booking portal built with plain HTML, CSS and JavaScript, hosted on GitHub Pages.
Bookings are approved by email through a small Google Apps Script backend.

## Features
- Employee login screen (name + email)
- Book a room: pick a date, see live availability for each room, choose a one-hour slot
- Guest emails, client name and purpose of the meeting
- Waiting list with queue position when a slot already has requests
- Pop-up with alternative rooms when a room is booked or the waiting list is full
- Cancel your own bookings
- Approval by email: approvers get Approve / Reject links (reject needs a reason)
- Organizer and guests are emailed after a decision

## Project files
| File | Purpose |
|---|---|
| `index.html` | The page |
| `style.css` | Styling |
| `config.js` | Paste your Apps Script web-app URL here |
| `api.js` | Talks to the backend (or runs browser-only demo mode) |
| `app.js` | Login, calendar, availability grid, pop-ups, tabs |
| `google-apps-script/Code.gs` | Backend: Google Sheet storage + approval emails (not uploaded to GitHub Pages) |
| `users-sample.csv` | Example list of employees |

Keep the first five files together in the same folder.

## Setup
### 1. Backend (email approval)
1. Create a Google Sheet, then go to **Extensions → Apps Script**.
2. Replace the code with `google-apps-script/Code.gs`.
3. Edit `APPROVERS` (approver emails) and, if needed, `ROOMS` and `MAX_PENDING`.
4. **Deploy → New deployment → Web app**. Execute as: *Me*. Who has access: *Anyone*.
5. Accept the permission prompts (Sheets and sending email) and copy the web-app URL.
6. After any later code change: Deploy → Manage deployments → edit → New version.

### 2. Front end
1. Open `config.js` and set `scriptUrl: 'https://script.google.com/macros/s/.../exec'`.
2. Upload `index.html`, `style.css`, `config.js`, `api.js`, `app.js` to the root of a GitHub repo.
3. **Settings → Pages →** Source: `main` branch, `/ (root)`.
4. Open `https://<username>.github.io/<repo>/`.

> Extract the zip first. Opening `index.html` from inside the zip shows a blank page.

### Demo mode
If `scriptUrl` is empty, the site runs only in your browser: bookings are saved locally,
are not shared, and no emails are sent.

### Changing rooms
Edit `ROOMS` in **both** `api.js` and `google-apps-script/Code.gs` (keep them identical).

## How approval works
1. Employee submits a request, saved as *pending* in the Sheet.
2. Every approver receives an email with a link to a review page.
3. The first approver to decide wins. Approve confirms the booking; Reject needs a reason.
4. The organizer (and guests, on approval) are emailed.
5. Other pending requests for the same room and time are rejected automatically.

## Known limitations (work in progress)
- Login is not secure. There is no password; anyone can enter any email. Approver links are signed and safe, but employee identity is not verified. Real accounts need Firebase or Supabase.
- Gmail limits sending to about 100 emails/day (about 1500 for Google Workspace).
- Slots are fixed one-hour blocks between 10:00 and 18:00.
- Times use the Apps Script project's time zone (File → Project settings).
- No admin screen; manage data directly in the Google Sheet.
- Not yet tested at scale or across all browsers.

## Roadmap ideas
Secure login, multi-hour bookings, admin dashboard, calendar (ICS) invites, reminders.
