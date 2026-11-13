/* Browser-only "backend". Bookings live in localStorage (per browser).
   To use a real server, replace the functions in MRB_API with fetch() calls
   that return the same shapes (see README). */
(function () {
  'use strict';
  var KEY = 'mrb_bookings_v1', USER = 'mrb_user_v1', SET = 'mrb_settings_v1';
  var ROOMS = { room1: 'Meeting Room One', room2: 'Meeting Room Two', training: 'Training Room' };
  var DEFAULTS = { maxPending: 5, approvers: [] }; // approvers: emails allowed to see the Approvals tab
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function all() { return read(KEY, []); }
  function settings() { var s = read(SET, {}); return { maxPending: s.maxPending || DEFAULTS.maxPending, approvers: s.approvers || DEFAULTS.approvers }; }
  function nowStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function overlap(b, s, e) { return b.start < e && b.end > s; }
  function clock(dt) { var h = Number(dt.slice(11, 13)), m = dt.slice(14, 16); return pad(h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  function fmt(dt) { var p = dt.slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + clock(dt); }
  function pending(room, s, e) { return all().filter(function (b) { return b.room === room && b.status === 'pending' && overlap(b, s, e); }).sort(function (a, b) { return a.id - b.id; }); }
  function approved(room, s, e) { return all().filter(function (b) { return b.room === room && b.status === 'approved' && overlap(b, s, e); })[0]; }
  function state(room, s, e, email) {
    var a = approved(room, s, e), p = pending(room, s, e), mine = 0;
    p.forEach(function (b, i) { if (!mine && b.email === email) mine = i + 1; });
    return { booked: !!a, booked_at: a ? clock(a.start) + ' – ' + clock(a.end) : '', pending: p.length, mine: mine };
  }
  function alternatives(s, e, exclude, email) {
    return Object.keys(ROOMS).filter(function (k) { if (k === exclude) return false; var st = state(k, s, e, email); return !st.booked && !st.mine; })
      .map(function (k) { return { key: k, name: ROOMS[k], pending: state(k, s, e, email).pending }; })
      .sort(function (a, b) { return a.pending - b.pending; });
  }
  function me() { return read(USER, null); }
  var ok = function (o) { o = o || {}; o.status = o.status || 'ok'; return Promise.resolve(o); };
  var fail = function (m) { return Promise.resolve({ status: 'error', message: m }); };

  var LOCAL = {
    rooms: ROOMS,
    user: me,
    login: function (name, email) { write(USER, { name: name, email: email.toLowerCase() }); },
    logout: function () { try { localStorage.removeItem(USER); } catch (e) {} },
    isApprover: function () { var u = me(), a = settings().approvers; return !!u && (!a.length || a.indexOf(u.email) > -1); },

    mrb_board: function (d) {
      var out = {}, day = d.date;
      Object.keys(ROOMS).forEach(function (k) {
        out[k] = { name: ROOMS[k], items: all().filter(function (b) { return b.room === k && (b.status === 'approved' || b.status === 'pending') && overlap(b, day + ' 00:00', day + ' 23:59'); })
          .sort(function (a, b) { return a.start < b.start ? -1 : 1; })
          .map(function (b) { return { time: clock(b.start) + ' – ' + clock(b.end), status: b.status, by: b.name }; }) };
      });
      return ok({ rooms: out });
    },
    mrb_submit: function (d) {
      var u = me(); if (!u) return fail('Please log in.');
      var s = d.date_from + ' ' + d.time_from, e = d.date_to + ' ' + d.time_to;
      if (e <= s) return fail('The end time must be after the start time.');
      if (s < nowStr()) return fail('The start time is in the past.');
      if (!ROOMS[d.room]) return fail('Please select a room.');
      if (!d.client_name.trim() || !d.purpose.trim()) return fail('Client name and purpose are required.');
      var guests = String(d.guests || '').split(/[\s,;]+/).filter(Boolean);
      for (var i = 0; i < guests.length; i++) if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guests[i])) return fail('Invalid guest email: ' + guests[i]);
      var st = state(d.room, s, e, u.email), alts = alternatives(s, e, d.room, u.email);
      if (st.booked) return Promise.resolve({ status: 'conflict', message: ROOMS[d.room] + ' is already booked (' + st.booked_at + ') for that time.', alternatives: alts });
      if (st.mine) return Promise.resolve({ status: 'duplicate', message: 'You already requested this room for this slot. You are #' + st.mine + ' in the queue.' });
      if (st.pending >= settings().maxPending) return Promise.resolve({ status: 'full', message: 'The waiting list for ' + ROOMS[d.room] + ' is full for this slot.', alternatives: alts });
      var list = all(), id = list.reduce(function (m, b) { return Math.max(m, b.id); }, 0) + 1;
      list.push({ id: id, room: d.room, email: u.email, name: u.name, guests: guests.join(', '), client: d.client_name.trim(), purpose: d.purpose.trim(), start: s, end: e, status: 'pending', created: Date.now() });
      write(KEY, list);
      return ok({ message: 'Request submitted. You are #' + (st.pending + 1) + ' in the queue for ' + ROOMS[d.room] + '. It will show as Approved once an approver accepts it.' });
    },
    mrb_my: function () {
      var u = me(), n = nowStr();
      var items = all().filter(function (b) { return b.email === u.email && (b.status === 'pending' || b.status === 'approved') && b.end >= n; })
        .sort(function (a, b) { return a.start < b.start ? -1 : 1; })
        .map(function (b) {
          var p = pending(b.room, b.start, b.end), pos = p.findIndex(function (x) { return x.id === b.id; }) + 1;
          return { id: b.id, room: ROOMS[b.room], status: b.status, status_label: b.status === 'approved' ? 'Approved' : 'Pending (#' + pos + ' of ' + p.length + ')', when: fmt(b.start) + ' → ' + fmt(b.end), client: b.client };
        });
      return ok({ items: items });
    },
    mrb_cancel: function (d) {
      var u = me(), list = all(), b = list.filter(function (x) { return x.id === Number(d.id); })[0];
      if (!b || b.email !== u.email) return fail('Booking not found.');
      b.status = 'cancelled'; write(KEY, list); return ok();
    },
    /* Approver actions (demo replacement for the e-mail approve/reject links) */
    mrb_queue: function () {
      var items = all().filter(function (b) { return b.status === 'pending'; }).sort(function (a, b) { return a.id - b.id; })
        .map(function (b) { return { id: b.id, room: ROOMS[b.room], when: fmt(b.start) + ' → ' + clock(b.end), client: b.client, by: b.name + ' <' + b.email + '>', purpose: b.purpose }; });
      return ok({ items: items });
    },
    mrb_decide: function (d) {
      var list = all(), b = list.filter(function (x) { return x.id === Number(d.id); })[0];
      if (!b || b.status !== 'pending') return fail('Already decided.');
      var u = me();
      if (d.approve === 'yes') {
        if (approved(b.room, b.start, b.end)) return fail('This room is already booked for an overlapping time. Please reject this request.');
        b.status = 'approved'; b.decidedBy = u.email;
        list.forEach(function (o) { if (o.id !== b.id && o.room === b.room && o.status === 'pending' && overlap(o, b.start, b.end)) { o.status = 'rejected'; o.reason = 'Room booked by another approved request.'; } });
      } else { b.status = 'rejected'; b.reason = d.reason || ''; b.decidedBy = u.email; }
      write(KEY, list); return ok();
    }
  };

  /* ---- Real mode: talks to the Google Apps Script web app (see google-apps-script/Code.gs) ---- */
  var URL_ = (window.MRB_CONFIG && window.MRB_CONFIG.scriptUrl) || '';
  function call(action, params) {
    var q = new URLSearchParams(Object.assign({ action: action }, params || {}));
    return fetch(URL_ + '?' + q.toString()).then(function (r) { return r.json(); })
      .catch(function () { return { status: 'error', message: 'Cannot reach the booking server. Please try again.' }; });
  }
  window.MRB_API = LOCAL;
  if (URL_) {
    window.MRB_API = Object.assign({}, LOCAL, {
      mrb_board: function (d) { return call('board', d); },
      mrb_submit: function (d) { var u = me(); return call('submit', Object.assign({}, d, { email: u.email, name: u.name })); },
      mrb_my: function () { return call('my', { email: me().email }); },
      mrb_cancel: function (d) { return call('cancel', { id: d.id, email: me().email }); }
    });
  }
  window.MRB = { rooms: ROOMS };
})();
