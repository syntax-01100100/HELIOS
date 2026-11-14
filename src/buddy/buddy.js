const q = (s) => document.querySelector(s);
const qa = (s) => document.querySelectorAll(s);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const buddyConfigured = Boolean(supabaseUrl && supabaseAnonKey);
let supabase = null;
let supabaseLoading = null;

function loadSupabase() {
  supabaseLoading ??= import('@supabase/supabase-js').then(({ createClient }) => {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
  });
  return supabaseLoading;
}

const MY_ID_KEY = 'helios_buddy_id';
const MY_CALL_KEY = 'helios_buddy_callsign';

let myProfile = null;
let allProfiles = [];
let myLinks = [];
let myAlerts = [];

const grid = q('#buddyGrid');
const roster = q('#buddyRoster');
const alertsList = q('#buddyAlerts');
const setupForm = q('#buddySetup');
const setupWrap = q('#buddySetupWrap');
const panel = q('#buddyPanel');
const callsignInput = q('#buddyCallsign');
const roleSelect = q('#buddyRole');
const myTag = q('#buddyMyTag');
const alertForm = q('#buddyAlertForm');
const alertTarget = q('#buddyAlertTarget');
const alertMsg = q('#buddyAlertMsg');
const alertLevel = q('#buddyAlertLevel');

function escape(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function statusClass(status) {
  if (status === 'ALERT') return 'bs-alert';
  if (status === 'CAUTION') return 'bs-caution';
  return 'bs-nominal';
}

function getMyId() {
  try { return localStorage.getItem(MY_ID_KEY); } catch { return null; }
}

function saveMyId(id) {
  try { localStorage.setItem(MY_ID_KEY, id); } catch {}
}

function getMyCallsign() {
  try { return localStorage.getItem(MY_CALL_KEY); } catch { return null; }
}

function saveMyCallsign(name) {
  try { localStorage.setItem(MY_CALL_KEY, name); } catch {}
}

function connectedBuddyIds() {
  const ids = new Set();
  for (const link of myLinks) {
    if (link.status === 'CONNECTED') {
      ids.add(link.from_id);
      ids.add(link.to_id);
    }
  }
  if (myProfile) ids.delete(myProfile.id);
  return ids;
}

function pendingFromMe() {
  const ids = new Set();
  for (const link of myLinks) {
    if (link.status === 'PENDING' && link.from_id === myProfile?.id) ids.add(link.to_id);
  }
  return ids;
}

function pendingToMe() {
  const ids = new Set();
  for (const link of myLinks) {
    if (link.status === 'PENDING' && link.to_id === myProfile?.id) ids.add(link.from_id);
  }
  return ids;
}

function profileById(id) {
  return allProfiles.find((p) => p.id === id);
}

function renderMyTag() {
  if (!myProfile) return;
  myTag.textContent = `${myProfile.callsign} · ${myProfile.role}`;
  myTag.className = `buddy-mytag ${statusClass(myProfile.status)}`;
}

function renderRoster() {
  if (!myProfile) return;
  const others = allProfiles.filter((p) => p.id !== myProfile.id);
  const conn = connectedBuddyIds();
  const pendFrom = pendingFromMe();
  const pendTo = pendingToMe();

  if (others.length === 0) {
    roster.innerHTML = '<p class="buddy-empty">No other crew members yet. They will appear here when they join.</p>';
    return;
  }

  roster.innerHTML = others.map((p) => {
    const isConn = conn.has(p.id);
    const isPendFrom = pendFrom.has(p.id);
    const isPendTo = pendTo.has(p.id);
    let action = '';
    if (isConn) {
      action = `<button class="xb bs-disconnect" data-act="disconnect" data-id="${p.id}">DISCONNECT</button>`;
    } else if (isPendTo) {
      action = `<button class="xb bs-accept" data-act="accept" data-id="${p.id}">ACCEPT</button><button class="xb bs-reject" data-act="reject" data-id="${p.id}">DECLINE</button>`;
    } else if (isPendFrom) {
      action = `<span class="bs-pending">Request sent</span><button class="xb bs-cancel" data-act="cancel" data-id="${p.id}">CANCEL</button>`;
    } else {
      action = `<button class="xb bs-connect" data-act="connect" data-id="${p.id}">CONNECT</button>`;
    }
    return `<div class="buddy-card ${statusClass(p.status)}">
      <div class="buddy-head"><b>${escape(p.callsign)}</b><span>${escape(p.role)}</span></div>
      <div class="buddy-vitals"><span>HR <b>${p.hr}</b></span><span>SpO₂ <b>${p.spo2}</b>%</span></div>
      <div class="buddy-statustag">${p.status}</div>
      <div class="buddy-actions">${action}</div>
    </div>`;
  }).join('');

  roster.querySelectorAll('[data-act]').forEach((btn) => {
    btn.onclick = () => handleAction(btn.dataset.act, btn.dataset.id);
  });
}

function renderConnected() {
  if (!myProfile) return;
  const conn = connectedBuddyIds();
  const buddies = allProfiles.filter((p) => conn.has(p.id));

  if (buddies.length === 0) {
    grid.innerHTML = '<p class="buddy-empty">No connected buddies yet. Send a connect request from the roster below.</p>';
  } else {
    grid.innerHTML = buddies.map((p) => `
      <div class="buddy-tile ${statusClass(p.status)}">
        <div class="bt-top"><b>${escape(p.callsign)}</b><span>${escape(p.role)}</span></div>
        <div class="bt-vitals">
          <div><em>HR</em><b>${p.hr}</b><i>BPM</i></div>
          <div><em>SpO₂</em><b>${p.spo2}</b><i>%</i></div>
        </div>
        <div class="bt-status">${p.status}</div>
        <button class="xb bs-alert-btn" data-id="${p.id}">SEND ALERT</button>
      </div>
    `).join('');

    grid.querySelectorAll('.bs-alert-btn').forEach((btn) => {
      btn.onclick = () => openAlertDialog(btn.dataset.id);
    });
  }

  const targetSelect = alertTarget;
  targetSelect.innerHTML = buddies.length === 0
    ? '<option value="">No buddies connected</option>'
    : buddies.map((p) => `<option value="${p.id}">${escape(p.callsign)} · ${escape(p.role)}</option>`).join('');
}

function renderAlerts() {
  if (!myProfile) return;
  const mine = myAlerts.filter((a) => a.recipient_id === myProfile.id && !a.acknowledged);

  if (mine.length === 0) {
    alertsList.innerHTML = '<p class="buddy-empty">No incoming alerts. You are clear.</p>';
    return;
  }

  alertsList.innerHTML = mine.map((a) => {
    const sender = profileById(a.sender_id);
    const name = sender ? sender.callsign : 'Unknown';
    return `<div class="buddy-alert-item ${a.level === 'CRITICAL' ? 'bs-critical' : 'bs-caution'}">
      <div class="ba-head"><b>${escape(name)}</b><span>${a.level}</span></div>
      <p>${escape(a.message)}</p>
      <button class="xb bs-ack" data-id="${a.id}">ACKNOWLEDGE</button>
    </div>`;
  }).join('');

  alertsList.querySelectorAll('.bs-ack').forEach((btn) => {
    btn.onclick = () => acknowledgeAlert(btn.dataset.id);
  });
}

function renderAll() {
  renderMyTag();
  renderConnected();
  renderRoster();
  renderAlerts();
}

async function handleAction(action, otherId) {
  if (!myProfile) return;
  const myId = myProfile.id;

  if (action === 'connect') {
    const { error } = await supabase.from('buddy_links').insert({
      from_id: myId, to_id: otherId, status: 'PENDING',
    });
    if (error) { console.error(error); return; }
  } else if (action === 'accept') {
    const link = myLinks.find((l) => l.from_id === otherId && l.to_id === myId && l.status === 'PENDING');
    if (link) {
      const { error } = await supabase.from('buddy_links').update({ status: 'CONNECTED' }).eq('id', link.id);
      if (error) console.error(error);
    }
  } else if (action === 'reject' || action === 'cancel') {
    const link = myLinks.find((l) =>
      l.status === 'PENDING' &&
      ((l.from_id === myId && l.to_id === otherId) || (l.from_id === otherId && l.to_id === myId))
    );
    if (link) {
      const { error } = await supabase.from('buddy_links').delete().eq('id', link.id);
      if (error) console.error(error);
    }
  } else if (action === 'disconnect') {
    const link = myLinks.find((l) =>
      l.status === 'CONNECTED' &&
      ((l.from_id === myId && l.to_id === otherId) || (l.from_id === otherId && l.to_id === myId))
    );
    if (link) {
      const { error } = await supabase.from('buddy_links').delete().eq('id', link.id);
      if (error) console.error(error);
    }
  }
}

function openAlertDialog(buddyId) {
  alertTarget.value = buddyId;
  alertMsg.value = '';
  alertLevel.value = 'CAUTION';
  alertForm.hidden = false;
  alertMsg.focus();
}

alertForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!myProfile) return;
  const targetId = alertTarget.value;
  const msg = alertMsg.value.trim();
  const level = alertLevel.value;
  if (!targetId || !msg) return;

  const { error } = await supabase.from('buddy_alerts').insert({
    sender_id: myProfile.id,
    recipient_id: targetId,
    message: msg,
    level: level,
  });
  if (error) { console.error(error); return; }
  alertForm.hidden = true;
  alertMsg.value = '';
};

q('#buddyAlertCancel').onclick = () => {
  alertForm.hidden = true;
  alertMsg.value = '';
};

async function acknowledgeAlert(alertId) {
  const { error } = await supabase.from('buddy_alerts').update({ acknowledged: true }).eq('id', alertId);
  if (error) console.error(error);
}

async function loadProfiles() {
  const { data, error } = await supabase.from('crew_profiles').select('*').order('created_at', { ascending: true });
  if (error) { console.error(error); return; }
  allProfiles = data || [];
}

async function loadLinks() {
  if (!myProfile) return;
  const { data, error } = await supabase.from('buddy_links')
    .select('*')
    .or(`from_id.eq.${myProfile.id},to_id.eq.${myProfile.id}`);
  if (error) { console.error(error); return; }
  myLinks = data || [];
}

async function loadAlerts() {
  if (!myProfile) return;
  const { data, error } = await supabase.from('buddy_alerts')
    .select('*')
    .or(`sender_id.eq.${myProfile.id},recipient_id.eq.${myProfile.id}`)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  myAlerts = data || [];
}

async function loadAll() {
  await loadProfiles();
  if (myProfile) {
    myProfile = allProfiles.find((p) => p.id === myProfile.id) || myProfile;
    await loadLinks();
    await loadAlerts();
  }
  renderAll();
}

function subscribeRealtime() {
  supabase.channel('buddy-crew')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_profiles' }, () => loadAll())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'buddy_links' }, () => loadAll())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'buddy_alerts' }, () => loadAll())
    .subscribe();
}

async function restoreSession() {
  const savedId = getMyId();
  if (!savedId) return false;
  await loadProfiles();
  const found = allProfiles.find((p) => p.id === savedId);
  if (found) {
    myProfile = found;
    return true;
  }
  return false;
}

setupForm.onsubmit = async (e) => {
  e.preventDefault();
  const callsign = callsignInput.value.trim();
  const role = roleSelect.value;
  if (!callsign) return;

  const { data, error } = await supabase.from('crew_profiles').insert({
    callsign, role, status: 'NOMINAL', hr: 72, spo2: 98,
  }).select().single();

  if (error) { console.error(error); return; }

  myProfile = data;
  saveMyId(data.id);
  saveMyCallsign(callsign);
  setupWrap.hidden = true;
  panel.hidden = false;
  await loadAll();
};

async function updateMyStatus() {
  if (!myProfile) return;
  const hr = 68 + Math.round(Math.random() * 12);
  const spo2 = 96 + Math.round(Math.random() * 3);
  const { error } = await supabase.from('crew_profiles')
    .update({ hr, spo2 })
    .eq('id', myProfile.id);
  if (error) console.error(error);
}

function showNotConfigured() {
  setupForm.hidden = true;
  panel.hidden = true;
  const note = document.createElement('p');
  note.className = 'buddy-empty';
  note.textContent = 'Buddy Link is not configured for this deployment. Add the Supabase URL and anon key to enable it.';
  setupWrap.prepend(note);
  setupWrap.hidden = false;
}

async function init() {
  const restored = await restoreSession();
  if (restored) {
    setupWrap.hidden = true;
    panel.hidden = false;
    const savedName = getMyCallsign();
    if (savedName) callsignInput.value = savedName;
  }
  await loadAll();
  subscribeRealtime();
  if (myProfile) {
    setInterval(updateMyStatus, 5000);
  }
}

window.addEventListener('helios:buddy-alert', (event) => {
  const detail = event.detail || {};
  const item = document.createElement('div');
  item.className = 'buddy-alert-item bs-critical';
  item.innerHTML = '<div class="ba-head"><b>HELIOS MISSION VIEW</b><span>SIMULATED</span></div>';
  const message = document.createElement('p');
  message.textContent = detail.message || 'Simulated emergency assistance request.';
  item.appendChild(message);
  alertsList.prepend(item);
});

if (!buddyConfigured) {
  showNotConfigured();
} else {
  const buddySection = q('#buddy');
  const startBuddy = () => {
    loadSupabase().then(init).catch((err) => console.error(err));
  };
  if (buddySection && 'IntersectionObserver' in window) {
    const watcher = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      watcher.disconnect();
      startBuddy();
    }, { rootMargin: '200px 0px' });
    watcher.observe(buddySection);
  } else {
    startBuddy();
  }
}
