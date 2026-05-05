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

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5mMSGr3cizcvh8U3pJfkwynCI9fe7DziZ7PWrFqndc6KlfKtBz6l1kQhY5CniI12MQA/exec";

let scanner = null;
let isScanningPaused = false;

// ============================================
// عناصر DOM
// ============================================

const eventSelect = document.getElementById("eventSelect");
const newEventName = document.getElementById("newEventName");
const addEventBtn = document.getElementById("addEventBtn");
const toggleEventBtn = document.getElementById("toggleEventBtn");
const eventStatus = document.getElementById("eventStatus");
const guestName = document.getElementById("guestName");
const guestPhone = document.getElementById("guestPhone");
const addGuestBtn = document.getElementById("addGuestBtn");
const generateBtn = document.getElementById("generateBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const scanBtn = document.getElementById("scanBtn");
const guestTable = document.getElementById("guestTable");
const invitationTable = document.getElementById("invitationTable");
const inviteUpload = document.getElementById("inviteUpload");
const inviteImage = document.getElementById("inviteImage");
const nameBox = document.getElementById("nameBox");
const qrBox = document.getElementById("qrBox");
const fontFamily = document.getElementById("fontFamily");
const fontSize = document.getElementById("fontSize");
const fontColor = document.getElementById("fontColor");
const qrColor = document.getElementById("qrColor");
const fontWeight = document.getElementById("fontWeight");
const pickFontColorBtn = document.getElementById("pickFontColorBtn");
const pickQrColorBtn = document.getElementById("pickQrColorBtn");
const scanResult = document.getElementById("scanResult");
const headerEventBadge = document.getElementById("headerEventBadge");
const guestCount = document.getElementById("guestCount");

// ============================================
// نظام الإشعارات (Toast Notifications)
// ============================================

function createToastContainer() {
  // إزالة الحاوية القديمة إن وجدت
  const oldContainer = document.getElementById('toastContainer');
  if (oldContainer) oldContainer.remove();

  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
    width: 90%;
    max-width: 500px;
  `;
  document.body.appendChild(container);
  return container;
}

function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer') || createToastContainer();

  const colors = {
    success: { bg: '#10b981', icon: '✅', border: '#059669' },
    error: { bg: '#ef4444', icon: '❌', border: '#dc2626' },
    warning: { bg: '#f59e0b', icon: '⚠️', border: '#d97706' },
    info: { bg: '#3b82f6', icon: 'ℹ️', border: '#2563eb' }
  };

  const color = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${color.bg};
    color: white;
    padding: 18px 22px;
    border-radius: 16px;
    font-size: 1.1rem;
    font-weight: 700;
    text-align: center;
    box-shadow: 0 15px 35px rgba(0,0,0,0.25);
    border: 2px solid ${color.border};
    pointer-events: auto;
    animation: slideDown 0.4s ease, fadeOut 0.4s ease ${duration - 400}ms forwards;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    direction: rtl;
    font-family: 'Cairo', 'Tajawal', sans-serif;
  `;

  toast.innerHTML = `<span style="font-size:1.5rem;">${color.icon}</span> ${message}`;

  container.appendChild(toast);

  // إزالة الإشعار بعد المدة المحددة
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, duration);
}

// إضافة أنيميشن CSS للإشعارات
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideDown {
    from { transform: translateY(-30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-20px); }
  }
  
  @keyframes scanPulse {
    0% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.05); }
    100% { transform: translateX(-50%) scale(1); }
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
      eventStatus.textContent = "❌ فشل تحميل المناسبات";
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
  } catch (error) {
    eventStatus.textContent = "❌ فشل الاتصال بالشيت لتحميل المناسبات";
  }
}

function renderEventSelect() {
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
  const event = getCurrentEvent();
  if (!event) {
    eventStatus.textContent = "ℹ️ أضف مناسبة أولاً";
    toggleEventBtn.innerHTML = '<i class="fas fa-eye-slash"></i> إخفاء / إظهار للموظف';
    return;
  }
  eventStatus.textContent = `📌 المناسبة الحالية: ${event.eventName} - ${event.active === "yes" ? "ظاهرة للموظف" : "مخفية عن الموظف"}`;
  toggleEventBtn.innerHTML = event.active === "yes" ? 
    '<i class="fas fa-eye-slash"></i> إخفاء المناسبة' : 
    '<i class="fas fa-eye"></i> إظهار المناسبة';
}

function updateHeaderBadge() {
  const event = getCurrentEvent();
  if (headerEventBadge) {
    headerEventBadge.textContent = event ? event.eventName : "";
    headerEventBadge.style.display = event ? "inline" : "none";
  }
}

// ============================================
// إضافة وتعديل المناسبات
// ============================================

async function addEvent() {
  const name = newEventName.value.trim();
  if (!name) { 
    showToast("⚠️ اكتب اسم المناسبة", "warning");
    return; 
  }

  const eventId = createEventId(name);
  addEventBtn.disabled = true;
  addEventBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';

  try {
    const result = await callScript({ action: "addEvent", eventId, eventName: name, active: "yes" });
    if (result.status !== "success" && result.status !== "duplicate") {
      showToast("❌ حدث خطأ أثناء إضافة المناسبة", "error");
      return;
    }
    newEventName.value = "";
    currentEventId = eventId;
    localStorage.setItem("currentEventId", currentEventId);
    await loadEvents();
    showToast("✅ تم إضافة المناسبة بنجاح", "success");
  } catch (error) {
    showToast("❌ فشل الاتصال بالشيت", "error");
  } finally {
    addEventBtn.disabled = false;
    addEventBtn.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة مناسبة';
  }
}

async function toggleCurrentEvent() {
  const event = getCurrentEvent();
  if (!event) { 
    showToast("⚠️ اختر مناسبة أولاً", "warning");
    return; 
  }

  const newActive = event.active === "yes" ? "no" : "yes";
  try {
    const result = await callScript({ action: "updateEvent", eventId: event.eventId, active: newActive });
    if (result.status !== "success") { 
      showToast("❌ لم يتم تعديل حالة المناسبة", "error");
      return; 
    }
    await loadEvents();
    showToast(`✅ تم ${newActive === "yes" ? "إظهار" : "إخفاء"} المناسبة`, "success");
  } catch (error) {
    showToast("❌ فشل الاتصال بالشيت", "error");
  }
}

// ============================================
// تحميل وإدارة الضيوف
// ============================================

async function loadGuestsFromSheet() {
  if (!currentEventId) {
    guestTable.innerHTML = '<tr><td colspan="5">ℹ️ اختر مناسبة أولاً</td></tr>';
    return;
  }

  guestTable.innerHTML = '<tr><td colspan="5"><i class="fas fa-spinner fa-spin"></i> جاري تحميل الضيوف...</td></tr>';

  try {
    const result = await callScript({ action: "guests", eventId: currentEventId });

    if (result.status !== "success") {
      guestTable.innerHTML = `<tr><td colspan="5">❌ فشل تحميل الضيوف<br>${result.message || ""}</td></tr>`;
      return;
    }

    guests = (result.guests || []).map(guest => ({
      id: String(guest.id),
      name: guest.name || "",
      phone: guest.phone || "",
      checkedIn: guest.checkedIn || false,
      invitation: ""
    }));

    renderGuests();

    if (guests.length > 0) {
      try { previewGuest(guests[0]); } catch (e) { console.log("Preview error:", e); }
    } else {
      if (nameBox) nameBox.innerHTML = '<i class="fas fa-font"></i> اسم الضيف';
      if (qrBox) {
        qrBox.innerHTML = '<i class="fas fa-qrcode"></i>';
        qrBox.style.width = '100px';
        qrBox.style.height = '100px';
      }
    }
  } catch (error) {
    guestTable.innerHTML = `<tr><td colspan="5">❌ فشل الاتصال بالشيت<br>${error.message || error}</td></tr>`;
  }
}

async function addGuest() {
  const name = guestName.value.trim();
  const phone = guestPhone.value.trim();

  if (!currentEventId) { 
    showToast("⚠️ اختر أو أضف مناسبة أولاً", "warning");
    return; 
  }
  if (!name || !phone) { 
    showToast("⚠️ اكتب الاسم ورقم الجوال", "warning");
    return; 
  }

  const guest = {
    id: "GUEST-" + Date.now() + "-" + Math.floor(Math.random() * 999999),
    name, phone, checkedIn: false, invitation: ""
  };

  addGuestBtn.disabled = true;
  addGuestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';

  try {
    const result = await callScript({
      action: "addGuest", eventId: currentEventId,
      id: guest.id, name: guest.name, phone: guest.phone
    });

    if (result.status !== "success" && result.status !== "duplicate") {
      showToast("❌ حدث خطأ أثناء إضافة الضيف", "error");
      return;
    }

    guestName.value = "";
    guestPhone.value = "";
    await loadGuestsFromSheet();
    
    const addedGuest = guests.find(g => g.id === guest.id);
    if (addedGuest) previewGuest(addedGuest);
    
    showToast("✅ تم إضافة الضيف بنجاح", "success");
  } catch (error) {
    showToast("❌ فشل الاتصال بالشيت", "error");
  } finally {
    addGuestBtn.disabled = false;
    addGuestBtn.innerHTML = '<i class="fas fa-save"></i> إضافة الضيف';
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
  if (!name || !phone) { 
    showToast("⚠️ الاسم ورقم الجوال مطلوبة", "warning");
    return; 
  }

  try {
    const result = await callScript({
      action: "updateGuest", eventId: currentEventId,
      id: guest.id, name, phone
    });
    if (result.status !== "success") { 
      showToast("❌ لم يتم تعديل بيانات الضيف", "error");
      return; 
    }
    await loadGuestsFromSheet();
    const updatedGuest = guests.find(g => g.id === guest.id);
    if (updatedGuest) previewGuest(updatedGuest);
    showToast("✅ تم تعديل بيانات الضيف", "success");
  } catch (error) {
    showToast("❌ فشل الاتصال بالشيت", "error");
  }
}

async function deleteGuest(index) {
  const guest = guests[index];
  if (!confirm("🗑️ هل تريد حذف هذا الضيف؟")) return;

  try {
    const result = await callScript({
      action: "deleteGuest", eventId: currentEventId, id: guest.id
    });
    if (result.status !== "success") { 
      showToast("❌ لم يتم حذف الضيف", "error");
      return; 
    }
    await loadGuestsFromSheet();
    showToast("✅ تم حذف الضيف", "success");
  } catch (error) {
    showToast("❌ فشل الاتصال بالشيت", "error");
  }
}

// ============================================
// معاينة الضيف - QR مربع دائماً
// ============================================

function getQrText(guest) {
  return String(guest.id);
}

function previewGuest(guest) {
  if (!guest) return;
  
  nameBox.innerHTML = guest.name;
  if (fontFamily) nameBox.style.fontFamily = fontFamily.value;
  if (fontSize) nameBox.style.fontSize = fontSize.value + "px";
  if (fontColor) nameBox.style.color = fontColor.value;
  if (fontWeight) nameBox.style.fontWeight = fontWeight.value;

  // 🔧 إصلاح: جعل QR مربع دائماً
  qrBox.innerHTML = "";
  
  // تحديد الحجم المربع (نفس العرض والارتفاع)
  const qrSize = Math.min(qrBox.clientWidth || 100, qrBox.clientHeight || 100);
  
  // فرض الشكل المربع
  qrBox.style.width = qrSize + 'px';
  qrBox.style.height = qrSize + 'px';
  qrBox.style.aspectRatio = '1/1';
  
  new QRCode(qrBox, {
    text: getQrText(guest),
    width: qrSize,
    height: qrSize,
    colorDark: qrColor ? qrColor.value : "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

// ============================================
// عرض الجداول
// ============================================

function renderGuests() {
  guestTable.innerHTML = "";

  if (guestCount) guestCount.textContent = `${guests.length} ضيف`;

  if (guests.length === 0) {
    guestTable.innerHTML = '<tr><td colspan="5">ℹ️ لا يوجد ضيوف في هذه المناسبة</td></tr>';
    renderInvitationTable();
    return;
  }

  guests.forEach((guest, index) => {
    const row = document.createElement("tr");
    row.style.cursor = "pointer";
    
    row.innerHTML = `
      <td><strong>${escapeHtml(guest.name)}</strong></td>
      <td dir="ltr">${escapeHtml(guest.phone)}</td>
      <td>
        <span class="status-badge" style="background:${guest.checkedIn ? '#d1fae5' : '#fee2e2'};color:${guest.checkedIn ? '#065f46' : '#991b1b'};">
          ${guest.checkedIn ? '✅ حضر' : '⏳ لم يدخل'}
        </span>
      </td>
      <td>${guest.invitation ? '<span style="color:#10b981;">✅ تم التوليد</span>' : '<span style="color:#94a3b8;">—</span>'}</td>
      <td>
        <button type="button" class="edit-btn"><i class="fas fa-edit"></i> تعديل</button>
        <button type="button" class="delete-btn"><i class="fas fa-trash"></i> حذف</button>
      </td>
    `;

    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      previewGuest(guest);
    });

    row.querySelector(".edit-btn").addEventListener("click", function(e) {
      e.stopPropagation();
      editGuest(index);
    });

    row.querySelector(".delete-btn").addEventListener("click", function(e) {
      e.stopPropagation();
      deleteGuest(index);
    });

    guestTable.appendChild(row);
  });

  renderInvitationTable();
}

function renderInvitationTable() {
  invitationTable.innerHTML = "";

  const guestsWithInvitations = guests.filter(g => g.invitation);
  
  if (guestsWithInvitations.length === 0) {
    invitationTable.innerHTML = '<tr><td colspan="3">ℹ️ لا توجد دعوات مولدة بعد</td></tr>';
    return;
  }

  guestsWithInvitations.forEach(guest => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(guest.name)}</strong></td>
      <td>
        <img src="${guest.invitation}" class="guest-img" alt="دعوة ${escapeHtml(guest.name)}" />
      </td>
      <td>
        <a href="${guest.invitation}" download="دعوة-${escapeHtml(guest.name)}.png" class="btn btn-primary">
          <i class="fas fa-download"></i> تحميل
        </a>
      </td>
    `;
    invitationTable.appendChild(row);
  });
}

// ============================================
// رفع الصورة
// ============================================

inviteUpload.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    uploadedImage = event.target.result;
    localStorage.setItem("uploadedImage", uploadedImage);
    inviteImage.src = uploadedImage;
  };
  reader.readAsDataURL(file);
});

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

  // دعم اللمس للجوال
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

function refreshQrPreview() {
  if (guests.length > 0) previewGuest(guests[0]);
}

[fontFamily, fontSize, fontColor, fontWeight].forEach(input => {
  if (!input) return;
  input.addEventListener("input", updateNamePreviewStyle);
});

if (qrColor) {
  qrColor.addEventListener("input", refreshQrPreview);
}

// ============================================
// أداة اختيار اللون من الصورة
// ============================================

async function pickColor(targetInput) {
  if (!window.EyeDropper) {
    showToast("⚠️ أداة اختيار اللون غير مدعومة في هذا المتصفح", "warning");
    return;
  }
  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    targetInput.value = result.sRGBHex;
    updateNamePreviewStyle();
    refreshQrPreview();
  } catch (error) {
    console.log("تم إلغاء اختيار اللون");
  }
}

if (pickFontColorBtn) pickFontColorBtn.onclick = () => pickColor(fontColor);
if (pickQrColorBtn) pickQrColorBtn.onclick = () => pickColor(qrColor);

// ============================================
// توليد الدعوات - QR مربع دائماً
// ============================================

function getPositionOnImage(box, canvasWidth, canvasHeight) {
  const imageRect = inviteImage.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  if (!imageRect.width || !imageRect.height) throw new Error("صورة التصميم غير ظاهرة");
  const scaleX = canvasWidth / imageRect.width;
  const scaleY = canvasHeight / imageRect.height;
  return {
    x: Math.max(0, (boxRect.left - imageRect.left) * scaleX),
    y: Math.max(0, (boxRect.top - imageRect.top) * scaleY),
    w: Math.max(20, boxRect.width * scaleX),
    h: Math.max(20, boxRect.height * scaleY)
  };
}

function createQrImage(text) {
  return new Promise(resolve => {
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(tempDiv);
    
    // 🔧 إنشاء QR بحجم مربع
    const qrSize = 600;
    
    new QRCode(tempDiv, {
      text,
      width: qrSize,
      height: qrSize,
      colorDark: qrColor ? qrColor.value : "#000000",
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
      
      // جعل الخلفية شفافة
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

async function generateInvitations() {
  try {
    if (!uploadedImage) { 
      showToast("⚠️ ارفع التصميم أولاً", "warning");
      return; 
    }
    if (!currentEventId) { 
      showToast("⚠️ اختر مناسبة أولاً", "warning");
      return; 
    }
    if (!guests || guests.length === 0) { 
      showToast("⚠️ لا يوجد ضيوف", "warning");
      return; 
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التوليد...';

    await new Promise(resolve => setTimeout(resolve, 300));

    const baseImage = new Image();
    await new Promise((resolve, reject) => {
      baseImage.onload = resolve;
      baseImage.onerror = () => reject(new Error("فشل تحميل الصورة"));
      baseImage.src = uploadedImage;
    });

    const imageRect = inviteImage.getBoundingClientRect();
    const fontScale = baseImage.width / imageRect.width;
    const namePos = getPositionOnImage(nameBox, baseImage.width, baseImage.height);
    const qrPos = getPositionOnImage(qrBox, baseImage.width, baseImage.height);
    const finalFontSize = Math.round((fontSize ? Number(fontSize.value || 40) : 40) * fontScale);

    // 🔧 جعل منطقة QR مربعة دائماً
    const qrSquareSize = Math.min(qrPos.w, qrPos.h);
    const qrCenterX = qrPos.x + qrPos.w / 2;
    const qrCenterY = qrPos.y + qrPos.h / 2;
    const qrDrawX = qrCenterX - qrSquareSize / 2;
    const qrDrawY = qrCenterY - qrSquareSize / 2;

    for (const guest of guests) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = baseImage.width;
      canvas.height = baseImage.height;
      ctx.drawImage(baseImage, 0, 0);

      // اسم الضيف
      ctx.font = `${fontWeight ? fontWeight.value : "bold"} ${finalFontSize}px ${fontFamily ? fontFamily.value : "Arial"}`;
      ctx.fillStyle = fontColor ? fontColor.value : "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(guest.name, namePos.x + namePos.w/2, namePos.y + namePos.h/2);

      // QR Code - مربع دائماً
      const qrImage = await createQrImage(getQrText(guest));
      if (qrImage) {
        ctx.drawImage(qrImage, qrDrawX, qrDrawY, qrSquareSize, qrSquareSize);
      }

      guest.invitation = canvas.toDataURL("image/png");
    }

    renderGuests();
    showToast("✅ تم توليد جميع الدعوات بنجاح", "success", 5000);
  } catch (error) {
    console.log("خطأ:", error);
    showToast("❌ خطأ: " + (error.message || error), "error", 5000);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<i class="fas fa-magic"></i> توليد الدعوات';
  }
}

// ============================================
// تحميل جميع الدعوات
// ============================================

async function downloadAllInvitations() {
  const guestsWithInvitations = guests.filter(g => g.invitation);
  if (guestsWithInvitations.length === 0) {
    showToast("⚠️ لا توجد دعوات مولدة", "warning");
    return;
  }
  if (typeof JSZip === "undefined") {
    showToast("⚠️ مكتبة ZIP غير متاحة. تأكد من الاتصال بالإنترنت", "warning");
    return;
  }

  const zip = new JSZip();
  const event = getCurrentEvent();
  const eventName = event ? event.eventName : "الدعوات";

  guestsWithInvitations.forEach(guest => {
    const base64Data = guest.invitation.split(",")[1];
    const safeName = String(guest.name).replace(/[\\/:*?"<>|]/g, "-");
    zip.file(`دعوة-${safeName}.png`, base64Data, { base64: true });
  });

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `دعوات-${eventName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast("✅ تم تحميل جميع الدعوات", "success");
}

// ============================================
// الماسح الضوئي مع إشعارات واضحة
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
    scanResult.innerHTML = '<span style="color:#f59e0b;">⚠️ الكاميرا تعمل بالفعل</span>';
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
      setTimeout(() => { isScanningPaused = false; }, 3500);
    },
    error => {}
  ).catch(() => {
    scanResult.innerHTML = '<span style="color:#ef4444;">❌ لم يتم تشغيل الكاميرا</span>';
    scanner = null;
  });
}

async function checkInGuest(qrText) {
  if (!currentEventId) {
    showToast("⚠️ اختر مناسبة أولاً", "warning");
    scanResult.innerHTML = '<span style="color:#ef4444;">⚠️ اختر مناسبة أولاً</span>';
    return;
  }

  const parsed = parseQrText(qrText);
  
  if (String(parsed.eventId) !== String(currentEventId)) {
    showToast("❌ هذا QR تابع لمناسبة أخرى", "error", 4000);
    scanResult.innerHTML = '<span style="color:#ef4444;">❌ QR تابع لمناسبة أخرى</span>';
    playErrorSound();
    return;
  }

  const guest = guests.find(g => String(g.id) === String(parsed.guestId));
  if (!guest) {
    showToast("❌ QR غير معروف لهذه المناسبة", "error", 4000);
    scanResult.innerHTML = '<span style="color:#ef4444;">❌ QR غير معروف</span>';
    playErrorSound();
    return;
  }

  if (guest.checkedIn) {
    showToast(`⚠️ ${guest.name} تم تسجيله مسبقاً`, "warning", 4000);
    scanResult.innerHTML = `<span style="color:#f59e0b;">⚠️ مكرر: ${guest.name}</span>`;
    playErrorSound();
    return;
  }

  const time = new Date().toLocaleString("ar-SA");

  try {
    const result = await callScript({
      action: "attendance",
      eventId: currentEventId,
      id: guest.id,
      name: guest.name,
      phone: guest.phone,
      time
    });

    if (result.status === "duplicate") {
      showToast(`⚠️ ${guest.name} تم تسجيله مسبقاً`, "warning", 4000);
      scanResult.innerHTML = `<span style="color:#f59e0b;">⚠️ مكرر: ${guest.name}</span>`;
      playErrorSound();
      return;
    }

    if (result.status === "success") {
      // 🔧 إشعار كبير وواضح عند النجاح
      showToast(`✅ أهلاً وسهلاً ${guest.name}`, "success", 5000);
      scanResult.innerHTML = `<span style="color:#10b981;font-size:1.3rem;">✅ تم تسجيل دخول ${guest.name}</span>`;
      playSuccessSound();
      await loadGuestsFromSheet();
      return;
    }

    showToast("❌ حدث خطأ أثناء التسجيل", "error", 4000);
    scanResult.innerHTML = '<span style="color:#ef4444;">❌ حدث خطأ</span>';
    playErrorSound();

  } catch (error) {
    showToast("❌ فشل الاتصال بالخادم", "error", 4000);
    scanResult.innerHTML = '<span style="color:#ef4444;">❌ فشل الاتصال</span>';
    playErrorSound();
  }
}

// ============================================
// المؤثرات الصوتية
// ============================================

function playSuccessSound() {
  try {
    const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (e) {}
}

function playErrorSound() {
  try {
    const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (e) {}
}

// ============================================
// ربط الأحداث
// ============================================

eventSelect.onchange = async function() {
  currentEventId = eventSelect.value;
  localStorage.setItem("currentEventId", currentEventId);
  updateEventStatus();
  updateHeaderBadge();
  await loadGuestsFromSheet();
};

addEventBtn.onclick = addEvent;
toggleEventBtn.onclick = toggleCurrentEvent;
addGuestBtn.onclick = addGuest;
generateBtn.onclick = generateInvitations;
downloadAllBtn.onclick = downloadAllInvitations;

if (scanBtn) scanBtn.onclick = startScanner;

// ============================================
// بدء التطبيق
// ============================================

loadEvents();
