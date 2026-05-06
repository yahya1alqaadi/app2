// ============================================
// نظام دعوات QR - المنطق البرمجي الكامل
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
// المتغيرات الرئيسية - تعريف qrScalePercent هنا
// ============================================

let events = [];
let guests = [];
let currentEventId = localStorage.getItem("currentEventId") || "";
let uploadedImage = localStorage.getItem("uploadedImage") || "";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5mMSGr3cizcvh8U3pJfkwynCI9fe7DziZ7PWrFqndc6KlfKtBz6l1kQhY5CniI12MQA/exec";

let scanner = null;
let isScanningPaused = false;

// ✅ تعريف qrScalePercent هنا قبل أي استخدام
let qrScalePercent = parseInt(localStorage.getItem("qrScalePercent") || "100");

// ============================================
// عناصر DOM - مع التحقق من وجودها
// ============================================

function getElement(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`⚠️ عنصر ${id} غير موجود في الصفحة`);
  }
  return el;
}

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
// دالة مساعدة: تحديد إذا كان اللون فاتحاً
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

// ============================================
// دالة resizeQRBox - تعتمد على qrScalePercent
// ============================================

function resizeQRBox() {
  if (!qrBox) return;
  
  const baseSize = 110;
  const scaledSize = Math.round(baseSize * (qrScalePercent / 100));
  
  qrBox.style.width = scaledSize + 'px';
  qrBox.style.height = scaledSize + 'px';
  qrBox.style.aspectRatio = '1/1';
  
  // الحفاظ على الخلفية المناسبة
  const selectedQrColor = qrColor ? qrColor.value : "#000000";
  const isLight = isColorLight(selectedQrColor);
  
  if (isLight) {
    qrBox.style.backgroundColor = '#334155';
  } else {
    qrBox.style.backgroundColor = '#ffffff';
  }
}

// ============================================
// تحديث شكل placeholder QR
// ============================================

function updateQRPlaceholderStyle() {
  if (!qrBox) return;
  
  const selectedQrColor = qrColor ? qrColor.value : "#000000";
  const isLight = isColorLight(selectedQrColor);
  
  resizeQRBox();
  
  if (isLight) {
    qrBox.style.backgroundColor = '#334155';
    qrBox.style.color = selectedQrColor;
    qrBox.style.border = '2px dashed #64748b';
  } else {
    qrBox.style.backgroundColor = '#ffffff';
    qrBox.style.color = selectedQrColor;
    qrBox.style.border = '2px dashed #2563eb';
  }
  
  qrBox.innerHTML = '<i class="fas fa-qrcode"></i>';
}

// ============================================
// إضافة متحكم حجم QR
// ============================================

function addQRSizeControl() {
  const designControls = document.querySelector('.design-controls');
  if (!designControls) return;
  if (document.getElementById('qrSizeControl')) return;

  const controlGroup = document.createElement('div');
  controlGroup.className = 'control-group';
  controlGroup.id = 'qrSizeControl';
  controlGroup.innerHTML = `
    <label><i class="fas fa-expand-arrows-alt"></i> حجم QR</label>
    <div style="display:flex;align-items:center;gap:8px;">
      <input type="range" id="qrSizeSlider" min="50" max="200" value="${qrScalePercent}" step="5" style="flex:1;" />
      <span id="qrSizeValue" style="font-weight:700;font-size:0.85rem;min-width:45px;text-align:center;">${qrScalePercent}%</span>
    </div>
  `;

  designControls.appendChild(controlGroup);

  const slider = document.getElementById('qrSizeSlider');
  const valueDisplay = document.getElementById('qrSizeValue');

  if (slider && valueDisplay) {
    slider.addEventListener('input', function() {
      qrScalePercent = parseInt(this.value);
      valueDisplay.textContent = qrScalePercent + '%';
      localStorage.setItem("qrScalePercent", qrScalePercent);
      resizeQRBox();
      if (guests.length > 0) {
        previewGuest(guests[0]);
      }
    });
  }
}

// ============================================
// نظام الإشعارات (Toast Notifications)
// ============================================

function createToastContainer() {
  const oldContainer = document.getElementById('toastContainer');
  if (oldContainer) oldContainer.remove();

  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99999;
    display: none;
    pointer-events: none;
  `;
  document.body.appendChild(container);
  return container;
}

function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer') || createToastContainer();

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.97)', icon: '✅', border: '#059669' },
    error: { bg: 'rgba(239, 68, 68, 0.97)', icon: '❌', border: '#dc2626' },
    warning: { bg: 'rgba(245, 158, 11, 0.97)', icon: '⚠️', border: '#d97706' },
    info: { bg: 'rgba(59, 130, 246, 0.97)', icon: 'ℹ️', border: '#2563eb' }
  };

  const color = colors[type] || colors.info;

  container.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    animation: fadeInOverlay 0.3s ease;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: ${color.bg};
    color: white;
    padding: 40px 30px;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 25px 60px rgba(0,0,0,0.4);
    border: 3px solid ${color.border};
    max-width: 450px;
    width: 90%;
    animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    direction: rtl;
    font-family: 'Cairo', 'Tajawal', sans-serif;
  `;

  card.innerHTML = `
    <div style="font-size:5rem;margin-bottom:15px;animation:bounce 0.6s ease;">${color.icon}</div>
    <div style="font-size:1.8rem;font-weight:800;margin-bottom:10px;line-height:1.4;">${message}</div>
  `;

  overlay.appendChild(card);
  container.appendChild(overlay);

  container.style.display = 'block';
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      container.style.display = 'none';
      container.innerHTML = '';
      document.body.style.overflow = '';
    }, 300);
  }, duration);
}

// إضافة الأنيميشنات
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes bounce {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(toastStyle);

// ============================================
// تحميل الصورة المخزنة
// ============================================

if (uploadedImage && inviteImage) {
  inviteImage.src = uploadedImage;
} else if (inviteImage) {
  inviteImage.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Crect width='400' height='500' fill='%23f1f5f9'/%3E%3Ctext x='200' y='250' font-size='20' text-anchor='middle' fill='%2394a3b8'%3Eأضف صورة%3C/text%3E%3C/svg%3E";
}

// ============================================
// وظائف الاتصال بـ Google Sheets
// ============================================

function callScript(params) {
  return new Promise((resolve, reject) => {
    const callbackName = "callback_" + Date.now() + "_" + Math.floor(Math.random() * 999999);
    params.callback = callbackName;
    const query = new URLSearchParams(params).toString();
    const script = document.createElement("script");

    window[callbackName] = function(data) {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    script.onerror = function() {
      reject();
      delete window[callbackName];
      script.remove();
    };

    script.src = SCRIPT_URL + "?" + query;
    document.body.appendChild(script);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeFileName(name) {
  return String(name || "ضيف")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

function getCurrentEvent() {
  return events.find(event => String(event.eventId) === String(currentEventId));
}

function createEventId(name) {
  const clean = String(name || "").trim().replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-zA-Z0-9-_]/g, "");
  return "EVENT-" + Date.now() + "-" + clean;
}

// ============================================
// تحميل المناسبات
// ============================================

async function loadEvents() {
  try {
    const result = await callScript({ action: "events", admin: "yes" });

    if (result.status !== "success") {
      if (eventStatus) eventStatus.textContent = "❌ فشل تحميل المناسبات";
      return;
    }

    events = result.events || [];

    if (!currentEventId && events.length > 0) {
      currentEventId = events[0].eventId;
      localStorage.setItem("currentEventId", currentEventId);
    }

    if (currentEventId && !events.find(e => String(e.eventId) === String(currentEventId))) {
      currentEventId = events.length > 0 ? events[0].eventId : "";
      localStorage.setItem("currentEventId", currentEventId);
    }

    renderEventSelect();
    updateEventStatus();
    updateHeaderBadge();

    if (currentEventId) {
      await loadGuestsFromSheet();
    } else {
      guests = [];
      renderGuests();
    }
    
    setTimeout(addQRSizeControl, 500);
    setTimeout(updateQRPlaceholderStyle, 600);
  } catch (error) {
    if (eventStatus) eventStatus.textContent = "❌ فشل الاتصال بالشيت";
  }
}

function renderEventSelect() {
  if (!eventSelect) return;
  eventSelect.innerHTML = "";

  if (events.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "لا توجد مناسبات";
    eventSelect.appendChild(option);
    return;
  }

  events.forEach(event => {
    const option = document.createElement("option");
    option.value = event.eventId;
    option.textContent = `${event.eventName} - ${event.active === "yes" ? "ظاهرة" : "مخفية"}`;
    if (String(event.eventId) === String(currentEventId)) option.selected = true;
    eventSelect.appendChild(option);
  });
}

function updateEventStatus() {
  if (!eventStatus || !toggleEventBtn) return;
  const event = getCurrentEvent();
  if (!event) {
    eventStatus.textContent = "ℹ️ أضف مناسبة أولاً";
    toggleEventBtn.innerHTML = '<i class="fas fa-eye-slash"></i> إخفاء / إظهار للموظف';
    return;
  }
  eventStatus.textContent = `📌 المناسبة الحالية: ${event.eventName} - ${event.active === "yes" ? "ظاهرة" : "مخفية"}`;
  toggleEventBtn.innerHTML = event.active === "yes" ? 
    '<i class="fas fa-eye-slash"></i> إخفاء المناسبة' : 
    '<i class="fas fa-eye"></i> إظهار المناسبة';
}

function updateHeaderBadge() {
  if (!headerEventBadge) return;
  const event = getCurrentEvent();
  headerEventBadge.textContent = event ? event.eventName : "";
  headerEventBadge.style.display = event ? "inline" : "none";
}

// ============================================
// إضافة وتعديل المناسبات
// ============================================

async function addEvent() {
  if (!newEventName) return;
  const name = newEventName.value.trim();
  if (!name) { showToast("⚠️ اكتب اسم المناسبة", "warning"); return; }

  const eventId = createEventId(name);
  if (addEventBtn) {
    addEventBtn.disabled = true;
    addEventBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';
  }

  try {
    const result = await callScript({ action: "addEvent", eventId, eventName: name, active: "yes" });
    if (result.status !== "success" && result.status !== "duplicate") {
      showToast("❌ حدث خطأ", "error");
      return;
    }
    newEventName.value = "";
    currentEventId = eventId;
    localStorage.setItem("currentEventId", currentEventId);
    await loadEvents();
    showToast("✅ تم إضافة المناسبة", "success");
  } catch (error) {
    showToast("❌ فشل الاتصال", "error");
  } finally {
    if (addEventBtn) {
      addEventBtn.disabled = false;
      addEventBtn.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة مناسبة';
    }
  }
}

async function toggleCurrentEvent() {
  const event = getCurrentEvent();
  if (!event) { showToast("⚠️ اختر مناسبة أولاً", "warning"); return; }

  const newActive = event.active === "yes" ? "no" : "yes";
  try {
    const result = await callScript({ action: "updateEvent", eventId: event.eventId, active: newActive });
    if (result.status !== "success") { showToast("❌ لم يتم التعديل", "error"); return; }
    await loadEvents();
    showToast(`✅ تم ${newActive === "yes" ? "إظهار" : "إخفاء"} المناسبة`, "success");
  } catch (error) {
    showToast("❌ فشل الاتصال", "error");
  }
}

// ============================================
// تحميل وإدارة الضيوف
// ============================================

async function loadGuestsFromSheet() {
  if (!guestTable) return;
  
  if (!currentEventId) {
    guestTable.innerHTML = '<tr><td colspan="5">ℹ️ اختر مناسبة أولاً</td></tr>';
    return;
  }

  guestTable.innerHTML = '<tr><td colspan="5"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';

  try {
    const result = await callScript({ action: "guests", eventId: currentEventId });

    if (result.status !== "success") {
      guestTable.innerHTML = `<tr><td colspan="5">❌ فشل التحميل</td></tr>`;
      return;
    }

    guests = (result.guests || []).map(g => ({
      id: String(g.id),
      name: g.name || "",
      phone: g.phone || "",
      checkedIn: g.checkedIn || false,
      invitation: g.invitation || "",
      invitationPNG: g.invitationPNG || ""
    }));

    renderGuests();

    if (guests.length > 0) {
      try { previewGuest(guests[0]); } catch (e) {}
    } else {
      if (nameBox) nameBox.innerHTML = '<i class="fas fa-font"></i> اسم الضيف';
      updateQRPlaceholderStyle();
    }
  } catch (error) {
    guestTable.innerHTML = '<tr><td colspan="5">❌ فشل الاتصال</td></tr>';
  }
}

async function addGuest() {
  if (!guestName || !guestPhone) return;
  
  const name = guestName.value.trim();
  const phone = guestPhone.value.trim();

  if (!currentEventId) { showToast("⚠️ اختر مناسبة أولاً", "warning"); return; }
  if (!name || !phone) { showToast("⚠️ اكتب الاسم ورقم الجوال", "warning"); return; }

  const guest = {
    id: "GUEST-" + Date.now() + "-" + Math.floor(Math.random() * 999999),
    name, phone, checkedIn: false, invitation: "", invitationPNG: ""
  };

  if (addGuestBtn) {
    addGuestBtn.disabled = true;
    addGuestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';
  }

  try {
    const result = await callScript({
      action: "addGuest", eventId: currentEventId,
      id: guest.id, name: guest.name, phone: guest.phone
    });

    if (result.status !== "success" && result.status !== "duplicate") {
      showToast("❌ حدث خطأ", "error");
      return;
    }

    guestName.value = "";
    guestPhone.value = "";
    await loadGuestsFromSheet();
    
    const addedGuest = guests.find(g => g.id === guest.id);
    if (addedGuest) previewGuest(addedGuest);
    
    showToast("✅ تم إضافة الضيف", "success");
  } catch (error) {
    showToast("❌ فشل الاتصال", "error");
  } finally {
    if (addGuestBtn) {
      addGuestBtn.disabled = false;
      addGuestBtn.innerHTML = '<i class="fas fa-save"></i> إضافة الضيف';
    }
  }
}

async function editGuest(index) {
  const guest = guests[index];
  const newName = prompt("عدّل اسم الضيف:", guest.name);
  if (newName === null) return;
  const newPhone = prompt("عدّل رقم الجوال:", guest.phone);
  if (newPhone === null) return;

  const name = newName.trim();
  const phone = newPhone.trim();
  if (!name || !phone) { showToast("⚠️ الاسم ورقم الجوال مطلوبة", "warning"); return; }

  try {
    const result = await callScript({
      action: "updateGuest", eventId: currentEventId,
      id: guest.id, name, phone
    });
    if (result.status !== "success") { showToast("❌ لم يتم التعديل", "error"); return; }
    await loadGuestsFromSheet();
    showToast("✅ تم تعديل بيانات الضيف", "success");
  } catch (error) {
    showToast("❌ فشل الاتصال", "error");
  }
}

async function deleteGuest(index) {
  const guest = guests[index];
  if (!confirm("🗑️ هل تريد حذف هذا الضيف؟")) return;

  try {
    const result = await callScript({
      action: "deleteGuest", eventId: currentEventId, id: guest.id
    });
    if (result.status !== "success") { showToast("❌ لم يتم الحذف", "error"); return; }
    await loadGuestsFromSheet();
    showToast("✅ تم حذف الضيف", "success");
  } catch (error) {
    showToast("❌ فشل الاتصال", "error");
  }
}

// ============================================
// معاينة الضيف
// ============================================

function getQrText(guest) {
  return String(guest.id);
}

function previewGuest(guest) {
  if (!guest || !nameBox || !qrBox) return;
  
  nameBox.innerHTML = guest.name;
  if (fontFamily) nameBox.style.fontFamily = fontFamily.value;
  if (fontSize) nameBox.style.fontSize = fontSize.value + "px";
  if (fontColor) nameBox.style.color = fontColor.value;
  if (fontWeight) nameBox.style.fontWeight = fontWeight.value;

  resizeQRBox();
  
  qrBox.innerHTML = "";
  
  const qrSize = qrBox.clientWidth || 110;
  const selectedQrColor = qrColor ? qrColor.value : "#000000";
  const isLight = isColorLight(selectedQrColor);
  
  if (isLight) {
    qrBox.style.backgroundColor = '#334155';
    qrBox.style.border = '2px dashed #64748b';
  } else {
    qrBox.style.backgroundColor = '#ffffff';
    qrBox.style.border = '2px dashed #2563eb';
  }
  
  new QRCode(qrBox, {
    text: getQrText(guest),
    width: qrSize,
    height: qrSize,
    colorDark: selectedQrColor,
    colorLight: isLight ? '#334155' : '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

// ============================================
// عرض الجداول
// ============================================

function renderGuests() {
  if (!guestTable) return;

  guestTable.innerHTML = "";

  if (guestCount) guestCount.textContent = `${guests.length} ضيف`;

  if (guests.length === 0) {
    guestTable.innerHTML = '<tr><td colspan="5">ℹ️ لا يوجد ضيوف</td></tr>';
    renderInvitationTable();
    return;
  }

  guests.forEach((guest, index) => {
    const row = document.createElement("tr");
    row.style.cursor = "pointer";
    
    const hasInvitation = guest.invitation || guest.invitationPNG;
    
    row.innerHTML = `
      <td><strong>${escapeHtml(guest.name)}</strong></td>
      <td dir="ltr">${escapeHtml(guest.phone)}</td>
      <td>
        <span class="status-badge" style="background:${guest.checkedIn ? '#d1fae5' : '#fee2e2'};color:${guest.checkedIn ? '#065f46' : '#991b1b'};">
          ${guest.checkedIn ? '✅ حضر' : '⏳ لم يدخل'}
        </span>
      </td>
      <td>${hasInvitation ? '<span style="color:#10b981;">✅ PDF</span>' : '<span style="color:#94a3b8;">—</span>'}</td>
      <td>
        <button type="button" class="edit-btn"><i class="fas fa-edit"></i></button>
        <button type="button" class="delete-btn"><i class="fas fa-trash"></i></button>
      </td>
    `;

    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      previewGuest(guest);
    });

    row.querySelector(".edit-btn")?.addEventListener("click", function(e) {
      e.stopPropagation();
      editGuest(index);
    });

    row.querySelector(".delete-btn")?.addEventListener("click", function(e) {
      e.stopPropagation();
      deleteGuest(index);
    });

    guestTable.appendChild(row);
  });

  renderInvitationTable();
}

function renderInvitationTable() {
  if (!invitationTable) return;
  
  invitationTable.innerHTML = "";

  const guestsWithInvitations = guests.filter(g => g.invitation || g.invitationPNG);
  
  if (guestsWithInvitations.length === 0) {
    invitationTable.innerHTML = '<tr><td colspan="3">ℹ️ لا توجد دعوات</td></tr>';
    return;
  }

  guestsWithInvitations.forEach(guest => {
    const row = document.createElement("tr");
    const pdfData = guest.invitation || guest.invitationPNG || '';
    const safeName = sanitizeFileName(guest.name);
    
    row.innerHTML = `
      <td><strong>${escapeHtml(guest.name)}</strong></td>
      <td><span style="font-size:2rem;">📄</span></td>
      <td>
        <button class="btn btn-primary download-pdf-btn">
          <i class="fas fa-download"></i> PDF
        </button>
      </td>
    `;
    
    const downloadBtn = row.querySelector('.download-pdf-btn');
    if (downloadBtn && pdfData) {
      downloadBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = pdfData;
        link.download = `دعوة_${safeName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
    
    invitationTable.appendChild(row);
  });
}

// ============================================
// وظائف مساعدة للـ QR
// ============================================

function refreshQrPreview() {
  if (guests.length > 0) {
    previewGuest(guests[0]);
  } else {
    updateQRPlaceholderStyle();
  }
}

// ============================================
// رفع الصورة
// ============================================

if (inviteUpload) {
  inviteUpload.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      uploadedImage = event.target.result;
      localStorage.setItem("uploadedImage", uploadedImage);
      if (inviteImage) inviteImage.src = uploadedImage;
    };
    reader.readAsDataURL(file);
  });
}

// ============================================
// السحب والإفلات
// ============================================

function makeDraggable(el) {
  if (!el) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener("mousedown", e => {
    dragging = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    el.style.zIndex = "20";
  });

  el.addEventListener("touchstart", e => {
    dragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - el.offsetLeft;
    offsetY = touch.clientY - el.offsetTop;
    el.style.zIndex = "20";
  }, { passive: false });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    el.style.left = (e.clientX - offsetX) + "px";
    el.style.top = (e.clientY - offsetY) + "px";
  });

  document.addEventListener("touchmove", e => {
    if (!dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    el.style.left = (touch.clientX - offsetX) + "px";
    el.style.top = (touch.clientY - offsetY) + "px";
  }, { passive: false });

  document.addEventListener("mouseup", () => {
    dragging = false;
    if (el) el.style.zIndex = "10";
  });

  document.addEventListener("touchend", () => {
    dragging = false;
    if (el) el.style.zIndex = "10";
  });
}

makeDraggable(nameBox);
makeDraggable(qrBox);

// ============================================
// تحديث معاينة الاسم
// ============================================

function updateNamePreviewStyle() {
  if (!nameBox) return;
  if (fontFamily) nameBox.style.fontFamily = fontFamily.value;
  if (fontSize) nameBox.style.fontSize = fontSize.value + "px";
  if (fontColor) nameBox.style.color = fontColor.value;
  if (fontWeight) nameBox.style.fontWeight = fontWeight.value;
}

// ============================================
// ربط أحداث التصميم
// ============================================

[fontFamily, fontSize, fontColor, fontWeight].forEach(input => {
  if (!input) return;
  input.addEventListener("input", updateNamePreviewStyle);
});

if (qrColor) {
  qrColor.addEventListener("input", function() {
    refreshQrPreview();
    updateQRPlaceholderStyle();
  });
}

// ============================================
// أداة اختيار اللون
// ============================================

async function pickColor(targetInput) {
  if (!window.EyeDropper) {
    showToast("⚠️ غير مدعوم في هذا المتصفح", "warning");
    return;
  }
  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    targetInput.value = result.sRGBHex;
    updateNamePreviewStyle();
    refreshQrPreview();
    updateQRPlaceholderStyle();
  } catch (error) {}
}

if (pickFontColorBtn) pickFontColorBtn.onclick = () => pickColor(fontColor);
if (pickQrColorBtn) pickQrColorBtn.onclick = () => pickColor(qrColor);

// ============================================
// مكتبة jsPDF
// ============================================

function loadJSPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf && window.jspdf.jsPDF) {
      resolve(window.jspdf.jsPDF);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error('فشل تحميل PDF'));
      }
    };
    script.onerror = () => reject(new Error('فشل تحميل PDF'));
    document.head.appendChild(script);
  });
}

// ============================================
// توليد الدعوات PDF
// ============================================

function getPositionOnImage(box, canvasWidth, canvasHeight) {
  const imageRect = inviteImage.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  if (!imageRect.width || !imageRect.height) throw new Error("صورة التصميم غير ظاهرة");
  const scaleX = canvasWidth / imageRect.width;
  const scaleY = canvasHeight / imageRect.height;
  
  const rawW = boxRect.width * scaleX;
  const rawH = boxRect.height * scaleY;
  const squareSize = Math.min(rawW, rawH);
  
  return {
    x: (boxRect.left - imageRect.left) * scaleX + (rawW - squareSize) / 2,
    y: (boxRect.top - imageRect.top) * scaleY + (rawH - squareSize) / 2,
    w: squareSize,
    h: squareSize
  };
}

function createQrImage(text) {
  return new Promise(resolve => {
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(tempDiv);
    
    const qrSize = 600;
    const selectedQrColor = qrColor ? qrColor.value : "#000000";
    
    new QRCode(tempDiv, {
      text,
      width: qrSize,
      height: qrSize,
      colorDark: selectedQrColor,
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    
    setTimeout(() => {
      const canvas = tempDiv.querySelector("canvas");
      if (!canvas) {
        document.body.removeChild(tempDiv);
        resolve(null);
        return;
      }
      
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
          data[i+3] = 0;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const img = new Image();
      img.onload = () => {
        document.body.removeChild(tempDiv);
        resolve(img);
      };
      img.onerror = () => {
        document.body.removeChild(tempDiv);
        resolve(null);
      };
      img.src = canvas.toDataURL("image/png");
    }, 300);
  });
}

async function updateGuestInvitationInSheet(guestId, pdfData, pngData) {
  try {
    await callScript({
      action: "updateInvitation",
      eventId: currentEventId,
      id: guestId,
      invitationGenerated: "yes"
    });
  } catch (error) {}
}

async function generateInvitations() {
  try {
    if (!uploadedImage) { showToast("⚠️ ارفع التصميم أولاً", "warning"); return; }
    if (!currentEventId) { showToast("⚠️ اختر مناسبة أولاً", "warning"); return; }
    if (!guests || guests.length === 0) { showToast("⚠️ لا يوجد ضيوف", "warning"); return; }

    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري توليد PDF...';
    }

    const JsPDF = await loadJSPDF();
    await new Promise(resolve => setTimeout(resolve, 300));

    const baseImage = new Image();
    await new Promise((resolve, reject) => {
      baseImage.onload = resolve;
      baseImage.onerror = () => reject(new Error("فشل تحميل الصورة"));
      baseImage.src = uploadedImage;
    });

    const imageRect = inviteImage.getBoundingClientRect();
    const namePos = getPositionOnImage(nameBox, baseImage.width, baseImage.height);
    const qrPos = getPositionOnImage(qrBox, baseImage.width, baseImage.height);
    const finalFontSize = Math.round((fontSize ? Number(fontSize.value || 40) : 40) * (baseImage.width / imageRect.width));

    for (const guest of guests) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = baseImage.width;
      canvas.height = baseImage.height;
      ctx.drawImage(baseImage, 0, 0);

      ctx.font = `${fontWeight ? fontWeight.value : "bold"} ${finalFontSize}px ${fontFamily ? fontFamily.value : "Arial"}`;
      ctx.fillStyle = fontColor ? fontColor.value : "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(guest.name, namePos.x + namePos.w/2, namePos.y + namePos.h/2);

      const qrImage = await createQrImage(getQrText(guest));
      if (qrImage) {
        const selectedQrColor = qrColor ? qrColor.value : "#000000";
        const isLight = isColorLight(selectedQrColor);
        
        if (isLight) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(qrPos.x - 5, qrPos.y - 5, qrPos.w + 10, qrPos.h + 10);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(qrPos.x - 5, qrPos.y - 5, qrPos.w + 10, qrPos.h + 10);
        }
        
        ctx.drawImage(qrImage, qrPos.x, qrPos.y, qrPos.w, qrPos.h);
      }

      const pngDataURL = canvas.toDataURL("image/png");
      guest.invitationPNG = pngDataURL;

      const pdf = new JsPDF({
        orientation: baseImage.width > baseImage.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [baseImage.width, baseImage.height]
      });

      pdf.addImage(pngDataURL, 'PNG', 0, 0, baseImage.width, baseImage.height);
      const pdfDataURL = pdf.output('datauristring');
      guest.invitation = pdfDataURL;

      await updateGuestInvitationInSheet(guest.id, pdfDataURL, pngDataURL);
    }

    renderGuests();
    showToast(`✅ تم توليد ${guests.length} ملف PDF`, "success", 5000);
  } catch (error) {
    showToast("❌ خطأ: " + (error.message || error), "error", 5000);
  } finally {
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-magic"></i> توليد الدعوات PDF';
    }
  }
}

// ============================================
// تحميل جميع الدعوات PDF
// ============================================

async function downloadAllInvitations() {
  const guestsWithInvitations = guests.filter(g => g.invitation);
  if (guestsWithInvitations.length === 0) {
    showToast("⚠️ لا توجد دعوات", "warning");
    return;
  }
  if (typeof JSZip === "undefined") {
    showToast("⚠️ مكتبة ZIP غير متاحة", "warning");
    return;
  }

  if (downloadAllBtn) {
    downloadAllBtn.disabled = true;
    downloadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
  }

  const zip = new JSZip();
  const event = getCurrentEvent();
  const eventName = event ? sanitizeFileName(event.eventName) : "الدعوات";

  guestsWithInvitations.forEach(guest => {
    const pdfData = guest.invitation;
    if (pdfData && pdfData.includes('base64')) {
      const base64Data = pdfData.split(',')[1];
      const safeName = sanitizeFileName(guest.name);
      zip.file(`دعوة_${safeName}.pdf`, base64Data, { base64: true });
    }
  });

  try {
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `دعوات_${eventName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✅ تم تحميل ${guestsWithInvitations.length} ملف`, "success", 4000);
  } catch (error) {
    showToast("❌ خطأ في إنشاء ZIP", "error");
  } finally {
    if (downloadAllBtn) {
      downloadAllBtn.disabled = false;
      downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> تحميل كل الدعوات PDF';
    }
  }
}

// ============================================
// الماسح الضوئي
// ============================================

function parseQrText(text) {
  const value = String(text || "").trim();
  if (value.includes("|")) {
    const parts = value.split("|");
    return { eventId: parts[0], guestId: parts[1] };
  }
  return { eventId: currentEventId, guestId: value };
}

function startScanner() {
  if (!scanBtn) return;
  if (scanner) { 
    if (scanResult) scanResult.innerHTML = '<span style="color:#f59e0b;">⚠️ الكاميرا تعمل</span>';
    return; 
  }

  scanner = new Html5Qrcode("reader");
  scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    qrText => {
      if (isScanningPaused) return;
      isScanningPaused = true;
      checkInGuest(qrText);
      setTimeout(() => { isScanningPaused = false; }, 4500);
    },
    error => {}
  ).catch(() => {
    if (scanResult) scanResult.innerHTML = '<span style="color:#ef4444;">❌ فشل التشغيل</span>';
    scanner = null;
  });
}

async function checkInGuest(qrText) {
  if (!currentEventId) {
    showToast("⚠️ اختر مناسبة أولاً", "warning", 3000);
    if (scanResult) scanResult.innerHTML = '<span style="color:#ef4444;">⚠️ اختر مناسبة</span>';
    return;
  }

  const parsed = parseQrText(qrText);
  
  if (String(parsed.eventId) !== String(currentEventId)) {
    showToast("❌ QR تابع لمناسبة أخرى", "error", 3500);
    if (scanResult) scanResult.innerHTML = '<span style="color:#ef4444;">❌ مناسبة أخرى</span>';
    return;
  }

  const guest = guests.find(g => String(g.id) === String(parsed.guestId));
  if (!guest) {
    showToast("❌ QR غير معروف", "error", 3500);
    if (scanResult) scanResult.innerHTML = '<span style="color:#ef4444;">❌ غير معروف</span>';
    return;
  }

  if (guest.checkedIn) {
    showToast(`⚠️ ${guest.name} مكرر`, "warning", 3500);
    if (scanResult) scanResult.innerHTML = `<span style="color:#f59e0b;">⚠️ ${guest.name} مكرر</span>`;
    return;
  }

  const time = new Date().toLocaleString("ar-SA");

  try {
    const result = await callScript({
      action: "attendance", eventId: currentEventId,
      id: guest.id, name: guest.name, phone: guest.phone, time
    });

    if (result.status === "duplicate") {
      showToast(`⚠️ ${guest.name} مكرر`, "warning", 3500);
      return;
    }

    if (result.status === "success") {
      showToast(`✅ أهلاً ${guest.name}`, "success", 4000);
      if (scanResult) scanResult.innerHTML = `<span style="color:#10b981;">✅ ${guest.name}</span>`;
      await loadGuestsFromSheet();
      return;
    }

    showToast("❌ خطأ في التسجيل", "error", 3500);
  } catch (error) {
    showToast("❌ فشل الاتصال", "error", 3500);
  }
}

// ============================================
// ربط الأحداث
// ============================================

if (eventSelect) eventSelect.onchange = async function() {
  currentEventId = eventSelect.value;
  localStorage.setItem("currentEventId", currentEventId);
  updateEventStatus();
  updateHeaderBadge();
  await loadGuestsFromSheet();
};

if (addEventBtn) addEventBtn.onclick = addEvent;
if (toggleEventBtn) toggleEventBtn.onclick = toggleCurrentEvent;
if (addGuestBtn) addGuestBtn.onclick = addGuest;
if (generateBtn) {
  generateBtn.onclick = generateInvitations;
  generateBtn.innerHTML = '<i class="fas fa-magic"></i> توليد الدعوات PDF';
}
if (downloadAllBtn) {
  downloadAllBtn.onclick = downloadAllInvitations;
  downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> تحميل كل الدعوات PDF';
}
if (scanBtn) scanBtn.onclick = startScanner;

// ============================================
// تطبيق النمط الأولي
// ============================================

setTimeout(updateQRPlaceholderStyle, 300);

// ============================================
// بدء التطبيق
// ============================================

loadEvents();
