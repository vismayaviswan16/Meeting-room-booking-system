(function () {
  'use strict';
  var host = document.getElementById('mrb-root'), u = MRB_API.user();
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  if (!u) {
    host.innerHTML = '<div class="mrb-login"><div class="mrb-brand"><span class="mrb-brand-symbol" aria-hidden="true"></span>HONEYCOMB BH</div>'
      + '<h2>Employee Login</h2><p class="hint">Demo sign-in: bookings are saved only in this browser.</p>'
      + '<form id="mrb-login-form"><label for="ln">Name</label><input id="ln" required placeholder="Priya Sharma">'
      + '<label for="le">Employee email</label><input id="le" type="email" required placeholder="you@yourcompany.com">'
      + '<button type="submit">Log in</button></form></div>';
    document.getElementById('mrb-login-form').addEventListener('submit', function (e) {
      e.preventDefault(); MRB_API.login(document.getElementById('ln').value.trim(), document.getElementById('le').value.trim()); location.reload();
    });
    window.MRB = null; return;
  }
  var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var todayStr = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  host.innerHTML = '<div id="mrb-app" class="mrb-shell">'
  + '<header class="mrb-header"><a class="mrb-brand" href="./" aria-label="Honeycomb home"><span class="mrb-brand-symbol" aria-hidden="true"></span><span class="mrb-brand-word">HONEYCOMB BH</span></a>'
  + '<div class="mrb-user"><span class="mrb-avatar" aria-hidden="true">' + esc(u.name.charAt(0).toUpperCase()) + '</span><span class="mrb-user-name">' + esc(u.name) + '</span><button class="mrb-logout" id="mrb-logout" type="button" aria-label="Log out">↗</button></div></header>'
  + '<main class="mrb-main"><p class="mrb-greeting">Hello ' + esc(u.name) + '!</p>'
  + '<nav class="mrb-menu" aria-label="Booking sections"><button type="button" data-tab="book" class="on">Book room</button><button type="button" data-tab="cancel">Cancel room</button>' + '</nav>'
  + '<section id="tab-book" class="mrb-panel"><form id="mrb-form" autocomplete="off"><div class="mrb-top-layout"><div class="mrb-details-column"><p class="mrb-section-label">PEOPLE</p>'
  + '<label for="mrb-guests">Guest mail</label><input id="mrb-guests" type="text" name="guests" placeholder="mail@gmail.com" autocomplete="off">'
  + '<label for="mrb-client">Client name</label><input id="mrb-client" type="text" name="client_name" placeholder="Company" required>'
  + '<label for="mrb-purpose">Purpose</label><input id="mrb-purpose" type="text" name="purpose" placeholder="Purpose of meeting" required></div>'
  + '<div class="mrb-calendar-column"><div class="mrb-calendar-head"><h2 id="mrb-month-title"></h2><div class="mrb-calendar-nav"><button type="button" id="mrb-prev-month" aria-label="Previous month">‹</button><button type="button" id="mrb-next-month" aria-label="Next month">›</button></div></div>'
  + '<div class="mrb-calendar-grid" id="mrb-calendar" aria-label="Choose a meeting date"></div><input type="hidden" id="mrb-date-from" name="date_from" value="' + todayStr + '"></div></div>'
  + '<section class="mrb-availability-section"><div class="mrb-availability-title"><h2>Room availability</h2><p id="mrb-date-summary"></p></div>'
  + '<div id="mrb-grid-wrap" class="mrb-gridwrap"><div id="mrb-grid" class="mrb-grid-placeholder">Loading room availability…</div></div>'
  + '<div class="mrb-legend" aria-label="Availability legend"><span><i class="booked"></i>Booked</span><span><i class="requested"></i>Requested</span><span><i class="available"></i>Available</span></div>'
  + '<div class="mrb-selected-slot" id="mrb-selected-slot">Select an available room and time slot.</div></section>'
  + '<input type="hidden" id="mrb-time-from" name="time_from"><input type="hidden" id="mrb-time-to" name="time_to"><input type="hidden" id="mrb-room" name="room">'
  + '<div class="mrb-submit-row"><div id="mrb-book-msg" aria-live="polite"></div><button class="mrb-primary" type="submit">Submit</button></div></form></section>'
  + '<section id="tab-cancel" class="mrb-panel" style="display:none"><h2 class="mrb-cancel-title">Your room bookings</h2><div id="mrb-my"></div></section>'
  + '</main></div>';
})();

(function () {
  'use strict';
  var C = window.MRB, root = document.getElementById('mrb-app');
  if (!C || !root) return;
  var $ = function (s) { return root.querySelector(s); };
  var $$ = function (s) { return root.querySelectorAll(s); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
  var form = $('#mrb-form'), msg = $('#mrb-book-msg');
  var dateInput = $('#mrb-date-from'), timeFrom = $('#mrb-time-from'), timeTo = $('#mrb-time-to'), roomInput = $('#mrb-room');
  var today = new Date(); today.setHours(0,0,0,0);
  var selectedDate = dateInput.value || [today.getFullYear(), pad(today.getMonth()+1), pad(today.getDate())].join('-');
  var viewYear = Number(selectedDate.slice(0,4)), viewMonth = Number(selectedDate.slice(5,7))-1;
  var boardData = null;

  function post(action, data) {
    return Promise.resolve().then(function () { return window.MRB_API[action](data || {}); });
  }
  function say(text, ok) { msg.innerHTML = '<div class="mrb-msg ' + (ok ? 'ok' : 'err') + '">' + esc(text) + '</div>'; }
  function clearMessage() { msg.innerHTML = ''; }
  function dateLabel(value) {
    var p = value.split('-');
    return new Date(Number(p[0]), Number(p[1])-1, Number(p[2])).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  }
  function renderCalendar() {
    var first = new Date(viewYear, viewMonth, 1), days = new Date(viewYear, viewMonth+1, 0).getDate();
    var offset = first.getDay(), monthName = first.toLocaleDateString('en-US', { month:'long' });
    $('#mrb-month-title').innerHTML = esc(monthName) + ' <span>' + viewYear + '</span>';
    var html = ['SUN','MON','TUE','WED','THU','FRI','SAT'].map(function (d) { return '<div class="mrb-weekday">'+d+'</div>'; }).join('');
    for (var i=0; i<offset; i++) html += '<span class="mrb-calendar-blank"></span>';
    for (var day=1; day<=days; day++) {
      var val = viewYear+'-'+pad(viewMonth+1)+'-'+pad(day);
      var past = new Date(viewYear, viewMonth, day) < today;
      html += '<button type="button" class="mrb-calendar-day'+(val===selectedDate?' selected':'')+(past?' past':'')+'" data-date="'+val+'" '+(past?'disabled':'')+'>'+day+'</button>';
    }
    $('#mrb-calendar').innerHTML = html;
    $('#mrb-prev-month').disabled = (viewYear < today.getFullYear() || (viewYear === today.getFullYear() && viewMonth <= today.getMonth()));
  }
  function parseClock(value) {
    var m = String(value || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i); if (!m) return null;
    return (Number(m[1])%12 + (m[3].toUpperCase()==='PM'?12:0))*60 + Number(m[2]);
  }
  function renderGrid(data) {
    boardData = data;
    var hours = [10,11,12,13,14,15,16,17,18];
    var html = '<table class="mrb-grid-table"><thead><tr><th></th>' + hours.map(function(h){return '<th>'+pad(h)+':00</th>';}).join('') + '</tr></thead><tbody>';
    Object.keys(data.rooms || {}).forEach(function(key) {
      var room = data.rooms[key]; html += '<tr><th>'+esc(room.name)+'</th>';
      hours.forEach(function(h) {
        var start=h*60, end=start+60, status='available', tip='Available';
        (room.items || []).forEach(function(item) {
          var parts=String(item.time || '').split('–'), a=parseClock(parts[0]), b=parseClock(parts[1]);
          if (a!==null && b!==null && a<end && b>start) {
            if (item.status==='approved') { status='booked'; tip='Booked'; }
            else if (status!=='booked') { status='requested'; tip='Requested'; }
          }
        });
        var chosen = roomInput.value===key && timeFrom.value===pad(h)+':00';
        html += '<td><button type="button" class="mrb-grid-cell '+status+(chosen?' chosen':'')+'" data-room="'+esc(key)+'" data-hour="'+h+'" title="'+tip+'" '+(status==='booked'?'disabled':'')+' aria-label="'+esc(room.name)+' '+pad(h)+':00 '+tip+'"><span class="mrb-sr-only">'+tip+'</span></button></td>';
      });
      html += '</tr>';
    });
    $('#mrb-grid').innerHTML = html + '</tbody></table>';
  }
  function loadGrid() {
    $('#mrb-date-summary').textContent = dateLabel(selectedDate);
    $('#mrb-grid').textContent = 'Loading room availability…';
    post('mrb_board', { date:selectedDate }).then(function(r) {
      if (r.status !== 'ok') { $('#mrb-grid').textContent = r.message || 'Unable to load availability.'; return; }
      renderGrid(r);
    }).catch(function(){ $('#mrb-grid').textContent='Unable to load room availability. Please try again.'; });
  }
  function chooseDate(value) {
    selectedDate=value; dateInput.value=value; viewYear=Number(value.slice(0,4)); viewMonth=Number(value.slice(5,7))-1;
    roomInput.value=''; timeFrom.value=''; timeTo.value=''; $('#mrb-selected-slot').textContent='Select an available room and time slot.';
    clearMessage(); renderCalendar(); loadGrid();
  }
  $('#mrb-calendar').addEventListener('click', function(e) {
    var b=e.target.closest('button[data-date]'); if(b) chooseDate(b.dataset.date);
  });
  $('#mrb-prev-month').addEventListener('click', function(){ viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} renderCalendar(); });
  $('#mrb-next-month').addEventListener('click', function(){ viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} renderCalendar(); });
  $('#mrb-grid').addEventListener('click', function(e) {
    var b=e.target.closest('button[data-room]'); if(!b || b.disabled) return;
    var hour=Number(b.dataset.hour), key=b.dataset.room;
    roomInput.value=key; timeFrom.value=pad(hour)+':00'; timeTo.value=pad(hour+1)+':00';
    var name=(C.rooms && C.rooms[key]) || (boardData.rooms[key] && boardData.rooms[key].name) || key;
    $('#mrb-selected-slot').textContent=name+' · '+dateLabel(selectedDate)+' · '+pad(hour)+':00 – '+pad(hour+1)+':00';
    clearMessage(); renderGrid(boardData);
  });

  var modal=document.createElement('div'); modal.className='mrb-modal'; modal.hidden=true;
  modal.innerHTML='<div class="mrb-dialog" role="dialog" aria-modal="true" aria-labelledby="mrb-dialog-title"><h3 id="mrb-dialog-title">Room not available</h3><p class="mrb-dialog-message"></p><div class="mrb-alternatives"></div><button type="button" class="mrb-close">Close</button></div>';
  root.appendChild(modal);
  function popup(r) {
    modal.querySelector('.mrb-dialog-message').textContent=r.message||'This room is not available for the selected time.';
    var alts=r.alternatives||[];
    modal.querySelector('.mrb-alternatives').innerHTML=alts.length?'<p>Try one of these rooms:</p>'+alts.map(function(a){return '<button type="button" class="mrb-alt" data-pick="'+esc(a.key)+'">'+esc(a.name)+'</button>';}).join(''):'<p>No other room is available for this time. Please choose another slot.</p>';
    modal.hidden=false;
  }
  function submit(keyOverride) {
    clearMessage();
    if(!timeFrom.value || !timeTo.value || !(roomInput.value || keyOverride)) return say('Please select an available room and time slot.',false);
    var key=keyOverride || roomInput.value;
    var button=form.querySelector('button[type="submit"]'); button.disabled=true;
    post('mrb_submit', { guests:form.guests.value, date_from:selectedDate, time_from:timeFrom.value, date_to:selectedDate, time_to:timeTo.value, room:key, client_name:form.client_name.value, purpose:form.purpose.value })
      .then(function(r){
        if(r.status==='ok') { say(r.message,true); form.client_name.value=''; form.purpose.value=''; form.guests.value=''; roomInput.value=''; timeFrom.value=''; timeTo.value=''; $('#mrb-selected-slot').textContent='Select an available room and time slot.'; loadGrid(); }
        else if(r.status==='conflict'||r.status==='full') popup(r);
        else say(r.message||'Something went wrong. Please try again.',false);
      }).catch(function(){say('Network error. Please try again.',false);}).finally(function(){button.disabled=false;});
  }
  form.addEventListener('submit',function(e){e.preventDefault();submit();});
  modal.addEventListener('click',function(e){
    if(e.target===modal||e.target.classList.contains('mrb-close')) modal.hidden=true;
    var key=e.target.dataset&&e.target.dataset.pick; if(key){modal.hidden=true;submit(key);}
  });

  function loadMine() {
    var box=$('#mrb-my'); box.textContent='Loading your bookings…';
    post('mrb_my',{}).then(function(r){
      if(!r.items||!r.items.length){box.innerHTML='<p class="mrb-empty">You have no upcoming bookings.</p>';return;}
      box.innerHTML=r.items.map(function(b){return '<article class="mrb-booking-item"><div><strong>'+esc(b.room)+'</strong><p>'+esc(b.when)+'</p><small>'+esc(b.client)+' · '+esc(b.status_label)+'</small></div><button type="button" data-cancel="'+Number(b.id)+'">Cancel booking</button></article>';}).join('');
    }).catch(function(){box.textContent='Unable to load your bookings. Please try again.';});
  }
  $('#mrb-my').addEventListener('click',function(e){
    var id=e.target.dataset&&e.target.dataset.cancel; if(!id||!window.confirm('Cancel this booking?'))return;
    var btn=e.target;btn.disabled=true;
    post('mrb_cancel',{id:id}).then(function(r){if(r.status!=='ok')window.alert(r.message||'Unable to cancel this booking.');loadMine();loadGrid();}).catch(function(){window.alert('Network error. Please try again.');btn.disabled=false;});
  });
  $$('.mrb-menu button').forEach(function(button){button.addEventListener('click',function(){
    var tab=button.dataset.tab; $$('.mrb-menu button').forEach(function(b){b.classList.toggle('on',b===button);});
    $('#tab-book').style.display=tab==='book'?'':'none'; $('#tab-cancel').style.display=tab==='cancel'?'':'none'; if(tab==='cancel')loadMine();
  });});
  var lo=$('#mrb-logout'); if(lo) lo.addEventListener('click',function(){ MRB_API.logout(); location.reload(); });
  renderCalendar(); loadGrid();
})();
