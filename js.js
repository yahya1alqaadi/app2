// ============================================
// نظام دعوات QR - كامل ومحدّث
// ============================================

const ADMIN_PASSWORD = "95321";

// ============================================
// تسجيل الدخول
// ============================================

const loginScreen = document.getElementById("loginScreen");
const adminContent = document.getElementById("adminContent");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

function showAdmin() {
  loginScreen.style.display = "none";
  adminContent.style.display = "block";
  createToastContainer();
}

function checkLogin() {
  const password = adminPasswordInput.value.trim();
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem("adminLoggedIn", "yes");
    showAdmin();
  } else {
    loginError.textContent = "كلمة المرور غير صحيحة";
  }
}

function logoutAdmin() {
  sessionStorage.removeItem("adminLoggedIn");
  location.reload();
}

loginBtn.onclick = checkLogin;
adminPasswordInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") checkLogin();
});

if (sessionStorage.getItem("adminLoggedIn") === "yes") {
  showAdmin();
}

// ============================================
// المتغيرات الرئيسية
// ============================================

let events = [];
let guests = [];
let currentEventId = localStorage.getItem("currentEventId") || "";
let uploadedImage = localStorage.getItem("uploadedImage") || "";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1Q4_xHS5CXKYIxElTz8YCyBjnWydxGdKIh8yJZtYTB8A/edit";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5mMSGr3cizcvh8U3pJfkwynCI9fe7DziZ7PWrFqndc6KlfKtBz6l1kQhY5CniI12MQA/exec";

let scanner = null;
let isScanningPaused = false;
let qrScalePercent = parseInt(localStorage.getItem("qrScalePercent") || "100");
let showName = localStorage.getItem("showName") !== "false";

// ============================================
// عناصر DOM
// ============================================

function getElement(id) { return document.getElementById(id); }

const eventSelect = getElement("eventSelect");
const newEventName = getElement("newEventName");
const addEventBtn = getElement("addEventBtn");
const toggleEventBtn = getElement("toggleEventBtn");
const eventStatus = getElement("eventStatus");
const guestName = getElement("guestName");
const guestPhone = getElement("guestPhone");
const addGuestBtn = getElement("addGuestBtn");
const generateBtn = getElement("generateBtn");
const downloadAllBtn = getElement("downloadAllBtn");
const scanBtn = getElement("scanBtn");
const guestTable = getElement("guestTable");
const invitationTable = getElement("invitationTable");
const inviteUpload = getElement("inviteUpload");
const inviteImage = getElement("inviteImage");
const nameBox = getElement("nameBox");
const qrBox = getElement("qrBox");
const fontFamily = getElement("fontFamily");
const fontSize = getElement("fontSize");
const fontColor = getElement("fontColor");
const qrColor = getElement("qrColor");
const fontWeight = getElement("fontWeight");
const pickFontColorBtn = getElement("pickFontColorBtn");
const pickQrColorBtn = getElement("pickQrColorBtn");
const scanResult = getElement("scanResult");
const headerEventBadge = getElement("headerEventBadge");
const guestCount = getElement("guestCount");

// ============================================
// دوال مساعدة
// ============================================

function isColorLight(hexColor) {
  if (!hexColor) return false;
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150;
}

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function sanitizeFileName(name) {
  return String(name || "ضيف").trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_").substring(0, 100);
}

function getCurrentEvent() {
  return events.find(function(e) { return String(e.eventId) === String(currentEventId); });
}

function createEventId(name) {
  const clean = String(name || "").trim().replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-zA-Z0-9-_]/g, "");
  return "EVENT-" + Date.now() + "-" + clean;
}

// ============================================
// دوال QR
// ============================================

function resizeQRBox() {
  if (!qrBox) return;
  const baseSize = 110;
  const scaledSize = Math.round(baseSize * (qrScalePercent / 100));
  qrBox.style.width = scaledSize + 'px';
  qrBox.style.height = scaledSize + 'px';
  qrBox.style.aspectRatio = '1/1';
  qrBox.style.backgroundColor = 'transparent';
  qrBox.style.border = 'none';
  qrBox.style.boxShadow = 'none';
  qrBox.style.outline = 'none';
}
function updateQRPlaceholderStyle() {
  if (!qrBox) return;
  resizeQRBox();
  qrBox.style.backgroundColor = 'transparent';
  qrBox.style.border = 'none';
  qrBox.style.boxShadow = 'none';
  qrBox.innerHTML = '';
}

function updateNameBoxAppearance() {
  if (!nameBox || !fontColor) return;
  const isLight = isColorLight(fontColor.value);
  nameBox.style.backgroundColor = isLight ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.85)';
  nameBox.style.color = fontColor.value;
  nameBox.style.border = '2px dashed ' + (isLight ? '#94a3b8' : '#2563eb');
  nameBox.style.textShadow = isLight ? '0 0 8px rgba(0,0,0,0.8)' : 'none';
  if (showName) {
    nameBox.style.display = 'flex';
    nameBox.style.opacity = '1';
  } else {
    nameBox.style.display = 'none';
    nameBox.style.opacity = '0';
  }
}

// ============================================
// متحكمات التصميم
// ============================================

function addQRSizeControl() {
  const designControls = document.querySelector('.design-controls');
  if (!designControls) return;
  if (document.getElementById('qrSizeControl')) return;

  const qrControlGroup = document.createElement('div');
  qrControlGroup.className = 'control-group';
  qrControlGroup.id = 'qrSizeControl';
  qrControlGroup.innerHTML = '<label><i class="fas fa-expand-arrows-alt"></i> حجم QR</label><div style="display:flex;align-items:center;gap:8px;"><input type="range" id="qrSizeSlider" min="50" max="200" value="' + qrScalePercent + '" step="5" style="flex:1;" /><span id="qrSizeValue" style="font-weight:700;font-size:0.85rem;min-width:45px;text-align:center;">' + qrScalePercent + '%</span></div>';
  designControls.appendChild(qrControlGroup);

  const nameControlGroup = document.createElement('div');
  nameControlGroup.className = 'control-group';
  nameControlGroup.id = 'nameVisibilityControl';
  nameControlGroup.style.cssText = 'display:flex;align-items:flex-end;';
  nameControlGroup.innerHTML = '<button type="button" id="toggleNameBtn" class="btn ' + (showName ? 'btn-outline' : 'btn-warning') + '" style="padding:0.5rem 1rem;font-size:0.85rem;"><i class="fas ' + (showName ? 'fa-eye-slash' : 'fa-eye') + '"></i> ' + (showName ? 'إخفاء الاسم' : 'إظهار الاسم') + '</button>';
  designControls.appendChild(nameControlGroup);

  const slider = document.getElementById('qrSizeSlider');
  const valueDisplay = document.getElementById('qrSizeValue');
  const toggleNameBtn = document.getElementById('toggleNameBtn');

  if (slider && valueDisplay) {
    slider.addEventListener('input', function() {
      qrScalePercent = parseInt(this.value);
      valueDisplay.textContent = qrScalePercent + '%';
      localStorage.setItem("qrScalePercent", qrScalePercent);
      resizeQRBox();
      if (guests.length > 0) previewGuest(guests[0]);
    });
  }

  if (toggleNameBtn) {
    toggleNameBtn.addEventListener('click', function() {
      showName = !showName;
      localStorage.setItem("showName", showName);
      this.innerHTML = '<i class="fas ' + (showName ? 'fa-eye-slash' : 'fa-eye') + '"></i> ' + (showName ? 'إخفاء الاسم' : 'إظهار الاسم');
      this.className = 'btn ' + (showName ? 'btn-outline' : 'btn-warning');
      updateNameBoxAppearance();
      if (guests.length > 0) previewGuest(guests[0]);
    });
  }
}

function addSheetButton() {
  const eventButtonsDiv = document.querySelector('.event-buttons');
  if (!eventButtonsDiv || document.getElementById('openSheetBtn')) return;
  const sheetBtn = document.createElement('button');
  sheetBtn.id = 'openSheetBtn';
  sheetBtn.type = 'button';
  sheetBtn.className = 'btn btn-outline';
  sheetBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> فتح الشيت';
  sheetBtn.title = 'فتح Google Sheets';
  sheetBtn.style.cssText = 'background:#f0fdf4;border-color:#86efac;color:#166534;';
  sheetBtn.addEventListener('click', function() { window.open(SHEET_URL, '_blank'); });
  eventButtonsDiv.appendChild(sheetBtn);
}

// ============================================
// نظام الإشعارات
// ============================================

function createToastContainer() {
  const oldContainer = document.getElementById('toastContainer');
  if (oldContainer) oldContainer.remove();
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:none;pointer-events:none;';
  document.body.appendChild(container);
  return container;
}

function showToast(message, type, duration) {
  type = type || 'success';
  duration = duration || 4000;
  const container = document.getElementById('toastContainer') || createToastContainer();
  const colors = {
    success: { bg: 'rgba(16,185,129,0.97)', icon: '✅', border: '#059669' },
    error: { bg: 'rgba(239,68,68,0.97)', icon: '❌', border: '#dc2626' },
    warning: { bg: 'rgba(245,158,11,0.97)', icon: '⚠️', border: '#d97706' },
    info: { bg: 'rgba(59,130,246,0.97)', icon: 'ℹ️', border: '#2563eb' }
  };
  const color = colors[type] || colors.info;
  container.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;pointer-events:auto;animation:fadeInOverlay 0.3s ease;';
  const card = document.createElement('div');
  card.style.cssText = 'background:' + color.bg + ';color:white;padding:40px 30px;border-radius:24px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.4);border:3px solid ' + color.border + ';max-width:450px;width:90%;animation:scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275);direction:rtl;font-family:Cairo,Tajawal,sans-serif;';
  card.innerHTML = '<div style="font-size:5rem;margin-bottom:15px;animation:bounce 0.6s ease;">' + color.icon + '</div><div style="font-size:1.8rem;font-weight:800;line-height:1.4;">' + message + '</div>';
  overlay.appendChild(card);
  container.appendChild(overlay);
  container.style.display = 'block';
  document.body.style.overflow = 'hidden';
  setTimeout(function() {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(function() {
      container.style.display = 'none';
      container.innerHTML = '';
      document.body.style.overflow = '';
    }, 300);
  }, duration);
}

const toastStyleEl = document.createElement('style');
toastStyleEl.textContent = '@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}@keyframes bounce{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}';
document.head.appendChild(toastStyleEl);

// ============================================
// تحميل الصورة المخزنة
// ============================================

if (uploadedImage && inviteImage) {
  inviteImage.src = uploadedImage;
} else if (inviteImage) {
  inviteImage.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Crect width='400' height='500' fill='%23f1f5f9'/%3E%3Ctext x='200' y='250' font-size='20' text-anchor='middle' fill='%2394a3b8'%3Eأضف صورة%3C/text%3E%3C/svg%3E";
}

// ============================================
// وظائف الاتصال
// ============================================

function callScript(params) {
  return new Promise(function(resolve, reject) {
    const callbackName = "callback_" + Date.now() + "_" + Math.floor(Math.random() * 999999);
    params.callback = callbackName;
    const query = new URLSearchParams(params).toString();
    const script = document.createElement("script");
    window[callbackName] = function(data) { resolve(data); delete window[callbackName]; script.remove(); };
    script.onerror = function() { reject(new Error("فشل")); delete window[callbackName]; script.remove(); };
    script.src = SCRIPT_URL + "?" + query;
    document.body.appendChild(script);
  });
}

// ============================================
// تحميل المناسبات
// ============================================

async function loadEvents() {
  try {
    const result = await callScript({ action: "events", admin: "yes" });
    if (result.status !== "success") { if (eventStatus) eventStatus.textContent = "❌ فشل التحميل"; return; }
    events = result.events || [];
    if (!currentEventId && events.length > 0) { currentEventId = events[0].eventId; localStorage.setItem("currentEventId", currentEventId); }
    if (currentEventId && !events.find(function(e) { return String(e.eventId) === String(currentEventId); })) { currentEventId = events.length > 0 ? events[0].eventId : ""; localStorage.setItem("currentEventId", currentEventId); }
    renderEventSelect();
    updateEventStatus();
    updateHeaderBadge();
    if (currentEventId) { await loadGuestsFromSheet(); } else { guests = []; renderGuests(); }
    setTimeout(addQRSizeControl, 500);
    setTimeout(addSheetButton, 500);
    setTimeout(updateQRPlaceholderStyle, 600);
    setTimeout(updateNameBoxAppearance, 600);
  } catch (error) { if (eventStatus) eventStatus.textContent = "❌ فشل الاتصال"; }
}

function renderEventSelect() {
  if (!eventSelect) return;
  eventSelect.innerHTML = "";
  if (events.length === 0) { const o = document.createElement("option"); o.value = ""; o.textContent = "لا توجد مناسبات"; eventSelect.appendChild(o); return; }
  events.forEach(function(ev) {
    const o = document.createElement("option");
    o.value = ev.eventId;
    o.textContent = ev.eventName + " - " + (ev.active === "yes" ? "ظاهرة" : "مخفية");
    if (String(ev.eventId) === String(currentEventId)) o.selected = true;
    eventSelect.appendChild(o);
  });
}

function updateEventStatus() {
  if (!eventStatus || !toggleEventBtn) return;
  const ev = getCurrentEvent();
  if (!ev) { eventStatus.textContent = "ℹ️ أضف مناسبة"; toggleEventBtn.innerHTML = '<i class="fas fa-eye-slash"></i> إخفاء / إظهار'; return; }
  eventStatus.textContent = "📌 " + ev.eventName + " - " + (ev.active === "yes" ? "ظاهرة" : "مخفية");
  toggleEventBtn.innerHTML = ev.active === "yes" ? '<i class="fas fa-eye-slash"></i> إخفاء' : '<i class="fas fa-eye"></i> إظهار';
}

function updateHeaderBadge() {
  if (!headerEventBadge) return;
  const ev = getCurrentEvent();
  headerEventBadge.textContent = ev ? ev.eventName : "";
  headerEventBadge.style.display = ev ? "inline" : "none";
}

// ============================================
// إضافة وتعديل المناسبات
// ============================================

async function addEvent() {
  if (!newEventName) return;
  const name = newEventName.value.trim();
  if (!name) { showToast("⚠️ اكتب اسم المناسبة", "warning"); return; }
  const eventId = createEventId(name);
  if (addEventBtn) { addEventBtn.disabled = true; addEventBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...'; }
  try {
    const result = await callScript({ action: "addEvent", eventId: eventId, eventName: name, active: "yes" });
    if (result.status !== "success" && result.status !== "duplicate") { showToast("❌ حدث خطأ", "error"); return; }
    newEventName.value = "";
    currentEventId = eventId;
    localStorage.setItem("currentEventId", currentEventId);
    await loadEvents();
    showToast("✅ تم إضافة المناسبة", "success");
  } catch (error) { showToast("❌ فشل الاتصال", "error"); }
  finally { if (addEventBtn) { addEventBtn.disabled = false; addEventBtn.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة مناسبة'; } }
}

async function toggleCurrentEvent() {
  const ev = getCurrentEvent();
  if (!ev) { showToast("⚠️ اختر مناسبة", "warning"); return; }
  const newActive = ev.active === "yes" ? "no" : "yes";
  try {
    const result = await callScript({ action: "updateEvent", eventId: ev.eventId, active: newActive });
    if (result.status !== "success") { showToast("❌ فشل", "error"); return; }
    await loadEvents();
    showToast("✅ تم " + (newActive === "yes" ? "إظهار" : "إخفاء"), "success");
  } catch (error) { showToast("❌ فشل الاتصال", "error"); }
}

// ============================================
// تحميل وإدارة الضيوف
// ============================================

async function loadGuestsFromSheet() {
  if (!guestTable) return;
  if (!currentEventId) { guestTable.innerHTML = '<tr><td colspan="6">ℹ️ اختر مناسبة</td></tr>'; return; }
  guestTable.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';
  try {
    const result = await callScript({ action: "guests", eventId: currentEventId });
    if (result.status !== "success") { guestTable.innerHTML = '<tr><td colspan="6">❌ فشل</td></tr>'; return; }
    guests = (result.guests || []).map(function(g) { return { id: String(g.id), name: g.name || "", phone: g.phone || "", checkedIn: g.checkedIn || false, scanCount: parseInt(g.scanCount) || 0, maxScans: parseInt(g.maxScans) || 1, invitation: g.invitation || "", invitationPNG: g.invitationPNG || "" }; });
    renderGuests();
    if (guests.length > 0) { try { previewGuest(guests[0]); } catch (e) {} } else { if (nameBox) nameBox.innerHTML = showName ? '<i class="fas fa-font"></i>' : ''; updateQRPlaceholderStyle(); }
  } catch (error) { guestTable.innerHTML = '<tr><td colspan="6">❌ فشل</td></tr>'; }
}

async function addGuest() {
  if (!guestName || !guestPhone) return;
  const name = guestName.value.trim();
  const phone = guestPhone.value.trim();
  if (!currentEventId) { showToast("⚠️ اختر مناسبة", "warning"); return; }
  if (!name || !phone) { showToast("⚠️ اكتب الاسم والجوال", "warning"); return; }
  const maxScansInput = prompt("عدد مرات الدخول المسموحة؟", "1");
  const maxScans = parseInt(maxScansInput);
  if (isNaN(maxScans) || maxScans < 1) { showToast("⚠️ رقم غير صحيح", "warning"); return; }
  const guest = { id: "GUEST-" + Date.now() + "-" + Math.floor(Math.random() * 999999), name: name, phone: phone, checkedIn: false, scanCount: 0, maxScans: maxScans, invitation: "", invitationPNG: "" };
  if (addGuestBtn) { addGuestBtn.disabled = true; addGuestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...'; }
  try {
    const result = await callScript({ action: "addGuest", eventId: currentEventId, id: guest.id, name: guest.name, phone: guest.phone, maxScans: guest.maxScans });
    if (result.status !== "success" && result.status !== "duplicate") { showToast("❌ خطأ", "error"); return; }
    guestName.value = ""; guestPhone.value = "";
    await loadGuestsFromSheet();
    showToast("✅ تمت الإضافة", "success");
  } catch (error) { showToast("❌ فشل", "error"); }
  finally { if (addGuestBtn) { addGuestBtn.disabled = false; addGuestBtn.innerHTML = '<i class="fas fa-save"></i> إضافة الضيف'; } }
}

async function editGuest(index) {
  const guest = guests[index];
  const newName = prompt("الاسم:", guest.name); if (newName === null) return;
  const newPhone = prompt("الجوال:", guest.phone); if (newPhone === null) return;
  const newMaxScans = prompt("عدد مرات الدخول:", guest.maxScans || 1);
  const name = newName.trim(), phone = newPhone.trim(), maxScans = parseInt(newMaxScans);
  if (!name || !phone) { showToast("⚠️ مطلوب", "warning"); return; }
  if (isNaN(maxScans) || maxScans < 1) { showToast("⚠️ خطأ", "warning"); return; }
  try {
    const result = await callScript({ action: "updateGuest", eventId: currentEventId, id: guest.id, name: name, phone: phone, maxScans: maxScans });
    if (result.status !== "success") { showToast("❌ فشل", "error"); return; }
    await loadGuestsFromSheet();
    showToast("✅ تم التعديل", "success");
  } catch (error) { showToast("❌ فشل", "error"); }
}

async function deleteGuest(index) {
  const guest = guests[index];
  if (!confirm("حذف " + guest.name + "؟")) return;
  try {
    const result = await callScript({ action: "deleteGuest", eventId: currentEventId, id: guest.id });
    if (result.status !== "success") { showToast("❌ فشل", "error"); return; }
    await loadGuestsFromSheet();
    showToast("✅ تم الحذف", "success");
  } catch (error) { showToast("❌ فشل", "error"); }
}

// ============================================
// معاينة الضيف
// ============================================

function getQrText(guest) { return String(guest.id); }

function previewGuest(guest) {
  if (!guest || !qrBox) return;
  
  if (nameBox) {
    if (showName) {
      nameBox.innerHTML = guest.name;
      nameBox.style.display = 'flex';
      nameBox.style.opacity = '1';
      nameBox.style.backgroundColor = 'transparent';
      nameBox.style.border = 'none';
      nameBox.style.textShadow = 'none';
      if (fontFamily) nameBox.style.fontFamily = fontFamily.value;
      if (fontSize) nameBox.style.fontSize = fontSize.value + "px";
      if (fontWeight) nameBox.style.fontWeight = fontWeight.value;
      if (fontColor) nameBox.style.color = fontColor.value;
    } else {
      nameBox.innerHTML = '';
      nameBox.style.display = 'none';
      nameBox.style.opacity = '0';
    }
  }
  
  resizeQRBox();
  qrBox.innerHTML = "";
  
  const qrSize = qrBox.clientWidth || 110;
  const selectedQrColor = qrColor ? qrColor.value : "#000000";
  
  qrBox.style.backgroundColor = 'transparent';
  qrBox.style.border = 'none';
  qrBox.style.boxShadow = 'none';
  
  new QRCode(qrBox, {
    text: getQrText(guest),
    width: qrSize,
    height: qrSize,
    colorDark: selectedQrColor,
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}
// ============================================
// عرض الجداول
// ============================================

function renderGuests() {
  if (!guestTable) return;
  guestTable.innerHTML = "";
  if (guestCount) guestCount.textContent = guests.length + " ضيف";
  if (guests.length === 0) { guestTable.innerHTML = '<tr><td colspan="6">ℹ️ لا يوجد ضيوف</td></tr>'; renderInvitationTable(); return; }
  guests.forEach(function(guest, index) {
    const row = document.createElement("tr"); row.style.cursor = "pointer";
    const hasInv = guest.invitation || guest.invitationPNG;
    const remaining = Math.max(0, (guest.maxScans || 1) - (guest.scanCount || 0));
    const maxed = remaining <= 0;
    row.innerHTML = '<td><strong>' + escapeHtml(guest.name) + '</strong></td><td dir="ltr">' + escapeHtml(guest.phone) + '</td><td><span class="status-badge" style="background:' + (maxed ? '#fee2e2' : (guest.scanCount > 0 ? '#fef3c7' : '#f1f5f9')) + ';color:' + (maxed ? '#991b1b' : (guest.scanCount > 0 ? '#92400e' : '#475569')) + ';">' + (maxed ? '🚫 منتهي' : (guest.scanCount || 0) + '/' + (guest.maxScans || 1)) + '</span></td><td>' + (hasInv ? '<span style="color:#10b981;">✅ PDF</span>' : '<span style="color:#94a3b8;">—</span>') + '</td><td><button class="edit-btn"><i class="fas fa-edit"></i></button> <button class="delete-btn"><i class="fas fa-trash"></i></button></td>';
    row.addEventListener("click", function(e) { if (e.target.closest("button")) return; previewGuest(guest); });
    const eb = row.querySelector(".edit-btn"); const db = row.querySelector(".delete-btn");
    if (eb) eb.addEventListener("click", function(e) { e.stopPropagation(); editGuest(index); });
    if (db) db.addEventListener("click", function(e) { e.stopPropagation(); deleteGuest(index); });
    guestTable.appendChild(row);
  });
  renderInvitationTable();
}

function renderInvitationTable() {
  if (!invitationTable) return;
  invitationTable.innerHTML = "";
  const withInv = guests.filter(function(g) { return g.invitation || g.invitationPNG; });
  if (withInv.length === 0) { invitationTable.innerHTML = '<tr><td colspan="3">ℹ️ لا توجد دعوات</td></tr>'; return; }
  withInv.forEach(function(guest) {
    const row = document.createElement("tr");
    const pdfData = guest.invitation || guest.invitationPNG || '';
    row.innerHTML = '<td><strong>' + escapeHtml(guest.name) + '</strong></td><td><span style="font-size:2rem;">📄</span></td><td><button class="btn btn-primary download-pdf-btn"><i class="fas fa-download"></i> PDF</button></td>';
    const btn = row.querySelector('.download-pdf-btn');
    if (btn && pdfData) { btn.addEventListener('click', function(e) { e.stopPropagation(); const a = document.createElement('a'); a.href = pdfData; a.download = 'دعوة_' + sanitizeFileName(guest.name) + '.pdf'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }); }
    invitationTable.appendChild(row);
  });
}

// ============================================
// تحديث التصميم
// ============================================

function updateNamePreviewStyle() {
  if (!nameBox) return;
  if (!showName) { updateNameBoxAppearance(); return; }
  if (fontFamily) nameBox.style.fontFamily = fontFamily.value;
  if (fontSize) nameBox.style.fontSize = fontSize.value + "px";
  if (fontColor) nameBox.style.color = fontColor.value;
  if (fontWeight) nameBox.style.fontWeight = fontWeight.value;
  updateNameBoxAppearance();
}

function refreshQrPreview() {
  if (guests.length > 0) { previewGuest(guests[0]); } else { updateQRPlaceholderStyle(); updateNameBoxAppearance(); }
}

// ============================================
// رفع الصورة
// ============================================

if (inviteUpload) {
  inviteUpload.addEventListener("change", function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) { uploadedImage = ev.target.result; localStorage.setItem("uploadedImage", uploadedImage); if (inviteImage) inviteImage.src = uploadedImage; };
    reader.readAsDataURL(file);
  });
}

// ============================================
// السحب والإفلات
// ============================================

function makeDraggable(el) {
  if (!el) return;
  let dragging = false, ox = 0, oy = 0;
  el.addEventListener("mousedown", function(e) { dragging = true; ox = e.clientX - el.offsetLeft; oy = e.clientY - el.offsetTop; el.style.zIndex = "20"; });
  el.addEventListener("touchstart", function(e) { dragging = true; const t = e.touches[0]; ox = t.clientX - el.offsetLeft; oy = t.clientY - el.offsetTop; el.style.zIndex = "20"; }, { passive: false });
  document.addEventListener("mousemove", function(e) { if (!dragging) return; el.style.left = (e.clientX - ox) + "px"; el.style.top = (e.clientY - oy) + "px"; });
  document.addEventListener("touchmove", function(e) { if (!dragging) return; e.preventDefault(); const t = e.touches[0]; el.style.left = (t.clientX - ox) + "px"; el.style.top = (t.clientY - oy) + "px"; }, { passive: false });
  document.addEventListener("mouseup", function() { dragging = false; if (el) el.style.zIndex = "10"; });
  document.addEventListener("touchend", function() { dragging = false; if (el) el.style.zIndex = "10"; });
}

makeDraggable(nameBox);
makeDraggable(qrBox);

// ============================================
// ربط أحداث التصميم
// ============================================

[fontFamily, fontSize, fontColor, fontWeight].forEach(function(inp) {
  if (!inp) return;
  inp.addEventListener("input", updateNamePreviewStyle);
  inp.addEventListener("change", updateNamePreviewStyle);
});

if (qrColor) {
  qrColor.addEventListener("input", function() { refreshQrPreview(); updateQRPlaceholderStyle(); updateNameBoxAppearance(); });
}

// ============================================
// أداة اختيار اللون
// ============================================

async function pickColor(targetInput) {
  if (!window.EyeDropper) { showToast("⚠️ غير مدعوم", "warning"); return; }
  try { const ed = new EyeDropper(); const r = await ed.open(); targetInput.value = r.sRGBHex; updateNamePreviewStyle(); refreshQrPreview(); updateQRPlaceholderStyle(); updateNameBoxAppearance(); } catch (e) {}
}

if (pickFontColorBtn) pickFontColorBtn.onclick = function() { pickColor(fontColor); };
if (pickQrColorBtn) pickQrColorBtn.onclick = function() { pickColor(qrColor); };

// ============================================
// مكتبة jsPDF
// ============================================

function loadJSPDF() {
  return new Promise(function(resolve, reject) {
    if (window.jspdf && window.jspdf.jsPDF) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = function() { if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF); else reject(new Error('فشل')); };
    s.onerror = function() { reject(new Error('فشل')); };
    document.head.appendChild(s);
  });
}

// ============================================
// ✅ دوال QR النهائية
// ============================================

function getPositionOnImage(box, canvasWidth, canvasHeight) {
  if (!box || !inviteImage) return { x: 0, y: 0, w: 100, h: 100 };
  const imageRect = inviteImage.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  if (!imageRect.width || !imageRect.height) throw new Error("الصورة غير ظاهرة");
  const scaleX = canvasWidth / imageRect.width;
  const scaleY = canvasHeight / imageRect.height;
  const relLeft = boxRect.left - imageRect.left;
  const relTop = boxRect.top - imageRect.top;
  const x = relLeft * scaleX, y = relTop * scaleY;
  const w = boxRect.width * scaleX, h = boxRect.height * scaleY;
  const sq = Math.min(w, h);
  const cx = x + w / 2, cy = y + h / 2;
  return { x: Math.round(cx - sq / 2), y: Math.round(cy - sq / 2), w: Math.round(sq), h: Math.round(sq) };
}

function createQrImage(text) {
  return new Promise(function(resolve) {
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(tempDiv);
    
    const qrSize = 600;
    const selectedQrColor = qrColor ? qrColor.value : "#000000";
    
    // ✅ دائماً ننشئ QR بخلفية بيضاء
    new QRCode(tempDiv, {
      text: text,
      width: qrSize,
      height: qrSize,
      colorDark: selectedQrColor,
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    
    setTimeout(function() {
      const canvas = tempDiv.querySelector("canvas");
      if (!canvas) { document.body.removeChild(tempDiv); resolve(null); return; }
      
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // ✅ نحول الخلفية البيضاء فقط إلى شفافة
      // لكن نترك بكسلات QR الملونة كما هي
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // فقط البكسلات البيضاء النقية تصبح شفافة
        // البكسلات الملونة (حتى لو كانت فاتحة) تبقى كما هي
        if (r >= 250 && g >= 250 && b >= 250) {
          data[i + 3] = 0;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const img = new Image();
      img.onload = function() { document.body.removeChild(tempDiv); resolve(img); };
      img.onerror = function() { document.body.removeChild(tempDiv); resolve(null); };
      img.src = canvas.toDataURL("image/png");
    }, 300);
  });
}

async function updateGuestInvitationInSheet(guestId) {
  try { await callScript({ action: "updateInvitation", eventId: currentEventId, id: guestId, invitationGenerated: "yes" }); } catch (e) {}
}

async function generateInvitations() {
  try {
    if (!uploadedImage) { showToast("⚠️ ارفع التصميم أولاً", "warning"); return; }
    if (!currentEventId) { showToast("⚠️ اختر مناسبة", "warning"); return; }
    if (!guests || guests.length === 0) { showToast("⚠️ لا يوجد ضيوف", "warning"); return; }
    if (generateBtn) { generateBtn.disabled = true; generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري توليد PDF...'; }
    const JsPDF = await loadJSPDF();
    await new Promise(function(r) { setTimeout(r, 300); });
    const baseImage = new Image();
    await new Promise(function(res, rej) { baseImage.onload = res; baseImage.onerror = function() { rej(new Error("فشل")); }; baseImage.src = uploadedImage; });
    const imageRect = inviteImage.getBoundingClientRect();
    const qrPos = getPositionOnImage(qrBox, baseImage.width, baseImage.height);
    const finalFontSize = Math.round((fontSize ? Number(fontSize.value || 40) : 40) * (baseImage.width / imageRect.width));
    const selectedFontColor = fontColor ? fontColor.value : "#000000";
    const isNameLight = isColorLight(selectedFontColor);
    let namePos = null;
    if (showName && nameBox) { namePos = getPositionOnImage(nameBox, baseImage.width, baseImage.height); }

    for (let g = 0; g < guests.length; g++) {
      const guest = guests[g];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = baseImage.width; canvas.height = baseImage.height;
      ctx.drawImage(baseImage, 0, 0);

      // رسم الاسم
      if (showName && namePos) {
        if (isNameLight) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; const p = 12; ctx.fillRect(namePos.x - p, namePos.y - namePos.h/2 - p, namePos.w + p*2, namePos.h + p*2); }
        ctx.font = (fontWeight ? fontWeight.value : "bold") + " " + finalFontSize + "px " + (fontFamily ? fontFamily.value : "Arial");
        ctx.fillStyle = selectedFontColor;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(guest.name, namePos.x + namePos.w/2, namePos.y + namePos.h/2);
      }

// ✅ رسم QR - يدعم جميع الألوان
const selectedQrColor = qrColor ? qrColor.value : "#000000";
const isQrLight = isColorLight(selectedQrColor);

// إذا كان اللون فاتح جداً، نضيف خلفية داكنة خفيفة
if (isQrLight) {
  const pad = Math.round(Math.min(qrPos.w, qrPos.h) * 0.04);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(ctx, qrPos.x - pad, qrPos.y - pad, qrPos.w + pad * 2, qrPos.h + pad * 2, 8);
  ctx.fill();
}

const qrImage = await createQrImage(getQrText(guest));
if (qrImage) {
  ctx.drawImage(qrImage, qrPos.x, qrPos.y, qrPos.w, qrPos.h);
}

      const pngDataURL = canvas.toDataURL("image/png");
      guest.invitationPNG = pngDataURL;
      const pdf = new JsPDF({ orientation: baseImage.width > baseImage.height ? 'landscape' : 'portrait', unit: 'px', format: [baseImage.width, baseImage.height] });
      pdf.addImage(pngDataURL, 'PNG', 0, 0, baseImage.width, baseImage.height);
      guest.invitation = pdf.output('datauristring');
      await updateGuestInvitationInSheet(guest.id);
    }
    renderGuests();
    showToast("✅ تم توليد " + guests.length + " ملف PDF", "success", 5000);
  } catch (error) {
    showToast("❌ خطأ: " + (error.message || error), "error", 5000);
  } finally {
    if (generateBtn) { generateBtn.disabled = false; generateBtn.innerHTML = '<i class="fas fa-magic"></i> توليد الدعوات PDF'; }
  }
}

// ============================================
// تحميل جميع الدعوات
// ============================================

async function downloadAllInvitations() {
  const withInv = guests.filter(function(g) { return g.invitation; });
  if (withInv.length === 0) { showToast("⚠️ لا توجد دعوات", "warning"); return; }
  if (typeof JSZip === "undefined") { showToast("⚠️ مكتبة ZIP غير متاحة", "warning"); return; }
  if (downloadAllBtn) { downloadAllBtn.disabled = true; downloadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...'; }
  const zip = new JSZip();
  const ev = getCurrentEvent();
  const evName = ev ? sanitizeFileName(ev.eventName) : "الدعوات";
  withInv.forEach(function(guest) {
    const pdfData = guest.invitation;
    if (pdfData && pdfData.indexOf('base64') !== -1) {
      const b64 = pdfData.split(',')[1];
      zip.file('دعوة_' + sanitizeFileName(guest.name) + '.pdf', b64, { base64: true });
    }
  });
  try {
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a"); a.href = url; a.download = 'دعوات_' + evName + '.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("✅ تم التحميل", "success", 4000);
  } catch (e) { showToast("❌ خطأ", "error"); }
  finally { if (downloadAllBtn) { downloadAllBtn.disabled = false; downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> تحميل كل الدعوات PDF'; } }
}

// ============================================
// الماسح الضوئي
// ============================================

function parseQrText(text) {
  const v = String(text || "").trim();
  if (v.indexOf("|") !== -1) { const p = v.split("|"); return { eventId: p[0], guestId: p[1] }; }
  return { eventId: currentEventId, guestId: v };
}

function startScanner() {
  if (!scanBtn) return;
  if (scanner) { if (scanResult) scanResult.innerHTML = '<span style="color:#f59e0b;">⚠️ الكاميرا تعمل</span>'; return; }
  scanner = new Html5Qrcode("reader");
  scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
    function(qrText) { if (isScanningPaused) return; isScanningPaused = true; checkInGuest(qrText); setTimeout(function() { isScanningPaused = false; }, 4500); },
    function() {}
  ).catch(function() { if (scanResult) scanResult.innerHTML = '<span style="color:#ef4444;">❌ فشل</span>'; scanner = null; });
}

async function checkInGuest(qrText) {
  if (!currentEventId) { showToast("⚠️ اختر مناسبة", "warning", 3000); return; }
  const parsed = parseQrText(qrText);
  if (String(parsed.eventId) !== String(currentEventId)) { showToast("❌ مناسبة أخرى", "error", 3500); return; }
  const guest = guests.find(function(g) { return String(g.id) === String(parsed.guestId); });
  if (!guest) { showToast("❌ غير معروف", "error", 3500); return; }
  const maxScans = guest.maxScans || 1, currentScans = guest.scanCount || 0;
  if (currentScans >= maxScans) { showToast("🚫 منتهي (" + maxScans + "/" + maxScans + ")", "error", 4000); return; }
  try {
    const result = await callScript({ action: "attendance", eventId: currentEventId, id: guest.id, name: guest.name, phone: guest.phone, time: new Date().toLocaleString("ar-SA") });
    if (result.status === "success") {
      await loadGuestsFromSheet();
      const updated = guests.find(function(g) { return String(g.id) === String(guest.id); });
      const newCount = updated ? updated.scanCount : (currentScans + 1);
      const remaining = maxScans - newCount;
      if (remaining <= 0) { showToast("🚫 اكتمل", "warning", 4000); } else { showToast("✅ (" + newCount + "/" + maxScans + ")", "success", 4000); }
    }
  } catch (e) { showToast("❌ فشل", "error", 3500); }
}

// ============================================
// ربط الأحداث
// ============================================

if (eventSelect) eventSelect.onchange = async function() { currentEventId = eventSelect.value; localStorage.setItem("currentEventId", currentEventId); updateEventStatus(); updateHeaderBadge(); await loadGuestsFromSheet(); };
if (addEventBtn) addEventBtn.onclick = addEvent;
if (toggleEventBtn) toggleEventBtn.onclick = toggleCurrentEvent;
if (addGuestBtn) addGuestBtn.onclick = addGuest;
if (generateBtn) { generateBtn.onclick = generateInvitations; generateBtn.innerHTML = '<i class="fas fa-magic"></i> توليد الدعوات PDF'; }
if (downloadAllBtn) { downloadAllBtn.onclick = downloadAllInvitations; downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> تحميل كل الدعوات PDF'; }
if (scanBtn) scanBtn.onclick = startScanner;

// ============================================
// بدء التطبيق
// ============================================

setTimeout(function() { updateQRPlaceholderStyle(); updateNameBoxAppearance(); }, 300);
loadEvents();
