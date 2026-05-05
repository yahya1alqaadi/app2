let events = [];
let guests = [];
let currentEventId = localStorage.getItem("currentEventId") || "";
let uploadedImage = localStorage.getItem("uploadedImage") || "";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5mMSGr3cizcvh8U3pJfkwynCI9fe7DziZ7PWrFqndc6KlfKtBz6l1kQhY5CniI12MQA/exec";

let scanner = null;
let isScanningPaused = false;

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

const scanResult = document.getElementById("scanResult");

if (uploadedImage && inviteImage) {
  inviteImage.src = uploadedImage;
}

function callScript(params) {
  return new Promise((resolve, reject) => {
    const callbackName = "callback_" + Date.now() + "_" + Math.floor(Math.random() * 999999);

    params.callback = callbackName;

    const query = new URLSearchParams(params).toString();
    const script = document.createElement("script");

    window[callbackName] = function (data) {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    script.onerror = function () {
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
  const clean = String(name || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-_]/g, "");

  return "EVENT-" + Date.now() + "-" + clean;
}

async function loadEvents() {
  try {
    const result = await callScript({
      action: "events",
      admin: "yes"
    });

    if (result.status !== "success") {
      eventStatus.textContent = "فشل تحميل المناسبات";
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

    if (currentEventId) {
      await loadGuestsFromSheet();
    } else {
      guests = [];
      renderGuests();
    }

  } catch (error) {
    eventStatus.textContent = "فشل الاتصال بالشيت لتحميل المناسبات";
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

    if (String(event.eventId) === String(currentEventId)) {
      option.selected = true;
    }

    eventSelect.appendChild(option);
  });
}

function updateEventStatus() {
  const event = getCurrentEvent();

  if (!event) {
    eventStatus.textContent = "أضف مناسبة أولاً";
    toggleEventBtn.textContent = "إخفاء / إظهار للموظف";
    return;
  }

  eventStatus.textContent = `المناسبة الحالية: ${event.eventName} - ${event.active === "yes" ? "ظاهرة للموظف" : "مخفية عن الموظف"}`;
  toggleEventBtn.textContent = event.active === "yes" ? "إخفاء المناسبة عن الموظف" : "إظهار المناسبة للموظف";
}

async function addEvent() {
  const name = newEventName.value.trim();

  if (!name) {
    alert("اكتب اسم المناسبة");
    return;
  }

  const eventId = createEventId(name);

  addEventBtn.disabled = true;
  addEventBtn.textContent = "جاري الإضافة...";

  try {
    const result = await callScript({
      action: "addEvent",
      eventId: eventId,
      eventName: name,
      active: "yes"
    });

    if (result.status !== "success" && result.status !== "duplicate") {
      alert("حدث خطأ أثناء إضافة المناسبة");
      return;
    }

    newEventName.value = "";
    currentEventId = eventId;
    localStorage.setItem("currentEventId", currentEventId);

    await loadEvents();

    alert("تم إضافة المناسبة ✅");

  } catch (error) {
    alert("فشل الاتصال بالشيت أثناء إضافة المناسبة");
  } finally {
    addEventBtn.disabled = false;
    addEventBtn.textContent = "إضافة مناسبة";
  }
}

async function toggleCurrentEvent() {
  const event = getCurrentEvent();

  if (!event) {
    alert("اختر مناسبة أولاً");
    return;
  }

  const newActive = event.active === "yes" ? "no" : "yes";

  try {
    const result = await callScript({
      action: "updateEvent",
      eventId: event.eventId,
      active: newActive
    });

    if (result.status !== "success") {
      alert("لم يتم تعديل حالة المناسبة");
      return;
    }

    await loadEvents();

  } catch (error) {
    alert("فشل الاتصال بالشيت أثناء تعديل حالة المناسبة");
  }
}

async function loadGuestsFromSheet() {
  if (!currentEventId) {
    guestTable.innerHTML = `
      <tr>
        <td colspan="5">اختر مناسبة أولاً</td>
      </tr>
    `;
    return;
  }

  guestTable.innerHTML = `
    <tr>
      <td colspan="5">جاري تحميل الضيوف من الشيت...</td>
    </tr>
  `;

  try {
    const result = await callScript({
      action: "guests",
      eventId: currentEventId
    });

    if (result.status !== "success") {
      guestTable.innerHTML = `
        <tr>
          <td colspan="5">فشل تحميل الضيوف من الشيت</td>
        </tr>
      `;
      return;
    }

    guests = (result.guests || []).map(guest => {
      return {
        id: String(guest.id),
        name: guest.name || "",
        phone: guest.phone || "",
        checkedIn: guest.checkedIn || false,
        invitation: ""
      };
    });

    renderGuests();

    if (guests.length > 0) {
      previewGuest(guests[0]);
    } else {
      nameBox.textContent = "اسم الضيف";
      qrBox.innerHTML = "QR";
    }

  } catch (error) {
    guestTable.innerHTML = `
      <tr>
        <td colspan="5">فشل الاتصال بالشيت</td>
      </tr>
    `;
  }
}

async function addGuest() {
  const name = guestName.value.trim();
  const phone = guestPhone.value.trim();

  if (!currentEventId) {
    alert("اختر أو أضف مناسبة أولاً");
    return;
  }

  if (!name || !phone) {
    alert("اكتب الاسم ورقم الجوال");
    return;
  }

  const guest = {
    id: "GUEST-" + Date.now() + "-" + Math.floor(Math.random() * 999999),
    name: name,
    phone: phone,
    checkedIn: false,
    invitation: ""
  };

  addGuestBtn.disabled = true;
  addGuestBtn.textContent = "جاري الإضافة...";

  try {
    const result = await callScript({
      action: "addGuest",
      eventId: currentEventId,
      id: guest.id,
      name: guest.name,
      phone: guest.phone
    });

    if (result.status !== "success" && result.status !== "duplicate") {
      alert("حدث خطأ أثناء إضافة الضيف في الشيت");
      return;
    }

    guestName.value = "";
    guestPhone.value = "";

    await loadGuestsFromSheet();

    const addedGuest = guests.find(g => g.id === guest.id);
    if (addedGuest) {
      previewGuest(addedGuest);
    }

    alert("تم إضافة الضيف في المناسبة الحالية ✅");

  } catch (error) {
    alert("فشل الاتصال بالشيت. تأكد من الإنترنت أو رابط Apps Script.");
  } finally {
    addGuestBtn.disabled = false;
    addGuestBtn.textContent = "إضافة الضيف";
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
    alert("الاسم ورقم الجوال مطلوبة");
    return;
  }

  try {
    const result = await callScript({
      action: "updateGuest",
      eventId: currentEventId,
      id: guest.id,
      name: name,
      phone: phone
    });

    if (result.status !== "success") {
      alert("لم يتم تعديل بيانات الضيف في الشيت");
      return;
    }

    await loadGuestsFromSheet();

    const updatedGuest = guests.find(g => g.id === guest.id);
    if (updatedGuest) {
      previewGuest(updatedGuest);
    }

    alert("تم تعديل بيانات الضيف ✅");

  } catch (error) {
    alert("فشل الاتصال بالشيت أثناء التعديل");
  }
}

async function deleteGuest(index) {
  const guest = guests[index];

  const ok = confirm("هل تريد حذف هذا الضيف؟ سيتم حذفه من الشيت ومن سجل الحضور.");
  if (!ok) return;

  try {
    const result = await callScript({
      action: "deleteGuest",
      eventId: currentEventId,
      id: guest.id
    });

    if (result.status !== "success") {
      alert("لم يتم حذف الضيف من الشيت");
      return;
    }

    await loadGuestsFromSheet();

  } catch (error) {
    alert("فشل الاتصال بالشيت أثناء الحذف");
  }
}

function getQrText(guest) {
  return currentEventId + "|" + guest.id;
}

function previewGuest(guest) {
  if (!guest) return;

  nameBox.textContent = guest.name;
  qrBox.innerHTML = "";

  new QRCode(qrBox, {
    text: getQrText(guest),
    width: qrBox.clientWidth || 100,
    height: qrBox.clientHeight || 100
  });
}

function renderGuests() {
  guestTable.innerHTML = "";

  if (guests.length === 0) {
    guestTable.innerHTML = `
      <tr>
        <td colspan="5">لا يوجد ضيوف في هذه المناسبة</td>
      </tr>
    `;
    renderInvitationTable();
    return;
  }

  guests.forEach((guest, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(guest.name)}</td>
      <td>${escapeHtml(guest.phone)}</td>
      <td>${guest.checkedIn ? "تم الدخول ✅" : "لم يدخل"}</td>
      <td>${guest.invitation ? "تم توليدها" : "لم تولد"}</td>
      <td>
        <button type="button" class="edit-btn">تعديل</button>
        <button type="button" class="delete-btn">حذف</button>
      </td>
    `;

    row.addEventListener("click", () => previewGuest(guest));

    row.querySelector(".edit-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      editGuest(index);
    });

    row.querySelector(".delete-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      deleteGuest(index);
    });

    guestTable.appendChild(row);
  });

  renderInvitationTable();
}

function renderInvitationTable() {
  invitationTable.innerHTML = "";

  guests.forEach(guest => {
    if (!guest.invitation) return;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(guest.name)}</td>
      <td>
        <img src="${guest.invitation}" style="width:180px;border-radius:8px;" />
      </td>
      <td>
        <a href="${guest.invitation}" download="دعوة-${escapeHtml(guest.name)}.png">تحميل</a>
      </td>
    `;

    invitationTable.appendChild(row);
  });
}

inviteUpload.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    uploadedImage = event.target.result;
    localStorage.setItem("uploadedImage", uploadedImage);
    inviteImage.src = uploadedImage;
  };

  reader.readAsDataURL(file);
});

function getPositionOnImage(box, canvasWidth, canvasHeight) {
  const imageRect = inviteImage.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();

  const scaleX = canvasWidth / imageRect.width;
  const scaleY = canvasHeight / imageRect.height;

  return {
    x: (boxRect.left - imageRect.left) * scaleX,
    y: (boxRect.top - imageRect.top) * scaleY,
    w: boxRect.width * scaleX,
    h: boxRect.height * scaleY
  };
}

function createQrImage(text) {
  return new Promise(resolve => {
    const tempDiv = document.createElement("div");

    new QRCode(tempDiv, {
      text: text,
      width: 600,
      height: 600
    });

    setTimeout(() => {
      const canvas = tempDiv.querySelector("canvas");
      const ctx = canvas.getContext("2d");

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const img = new Image();
      img.onload = () => resolve(img);
      img.src = canvas.toDataURL("image/png");
    }, 200);
  });
}

async function generateInvitations() {
  if (!uploadedImage) {
    alert("ارفع التصميم أولاً");
    return;
  }

  if (!currentEventId) {
    alert("اختر مناسبة أولاً");
    return;
  }

  if (guests.length === 0) {
    alert("لا يوجد ضيوف في هذه المناسبة");
    return;
  }

  const baseImage = new Image();
  baseImage.src = uploadedImage;

  await new Promise(resolve => {
    baseImage.onload = resolve;
  });

  const namePos = getPositionOnImage(nameBox, baseImage.width, baseImage.height);
  const qrPos = getPositionOnImage(qrBox, baseImage.width, baseImage.height);

  generateBtn.disabled = true;
  generateBtn.textContent = "جاري توليد الدعوات...";

  for (const guest of guests) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    ctx.drawImage(baseImage, 0, 0);

    ctx.font = "bold 40px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";

    ctx.fillText(
      guest.name,
      namePos.x + namePos.w / 2,
      namePos.y + namePos.h / 2
    );

    const qrImage = await createQrImage(getQrText(guest));

    ctx.drawImage(qrImage, qrPos.x, qrPos.y, qrPos.w, qrPos.h);

    guest.invitation = canvas.toDataURL("image/png");
  }

  renderGuests();

  generateBtn.disabled = false;
  generateBtn.textContent = "توليد الدعوات";

  alert("تم توليد الدعوات بنجاح ✨");
}

async function downloadAllInvitations() {
  const guestsWithInvitations = guests.filter(guest => guest.invitation);

  if (guestsWithInvitations.length === 0) {
    alert("لا توجد دعوات مولدة. اضغط أولاً على توليد الدعوات.");
    return;
  }

  if (typeof JSZip === "undefined") {
    alert("مكتبة ZIP لم تعمل. تأكد من الاتصال بالإنترنت.");
    return;
  }

  const zip = new JSZip();
  const event = getCurrentEvent();
  const eventName = event ? event.eventName : "الدعوات";

  guestsWithInvitations.forEach(guest => {
    const base64Data = guest.invitation.split(",")[1];
    const safeName = String(guest.name).replace(/[\\/:*?"<>|]/g, "-");

    zip.file(`دعوة-${safeName}.png`, base64Data, {
      base64: true
    });
  });

  const content = await zip.generateAsync({
    type: "blob"
  });

  const url = URL.createObjectURL(content);
  const a = document.createElement("a");

  a.href = url;
  a.download = `دعوات-${eventName}.zip`;
  a.click();

  URL.revokeObjectURL(url);
}

function makeDraggable(el) {
  if (!el) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener("mousedown", e => {
    dragging = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;

    el.style.left = (e.clientX - offsetX) + "px";
    el.style.top = (e.clientY - offsetY) + "px";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}

function parseQrText(text) {
  const value = String(text || "").trim();

  if (value.includes("|")) {
    const parts = value.split("|");

    return {
      eventId: parts[0],
      guestId: parts[1]
    };
  }

  return {
    eventId: currentEventId,
    guestId: value
  };
}

function startScanner() {
  if (!scanBtn) return;

  if (scanner) {
    scanResult.textContent = "الكاميرا تعمل بالفعل";
    return;
  }

  scanner = new Html5Qrcode("reader");

  scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    qrText => {
      if (isScanningPaused) return;

      isScanningPaused = true;
      checkInGuest(qrText);

      setTimeout(() => {
        isScanningPaused = false;
      }, 3000);
    },
    error => {}
  ).catch(() => {
    scanResult.textContent = "لم يتم تشغيل الكاميرا ❌";
    scanner = null;
  });
}

async function checkInGuest(qrText) {
  if (!currentEventId) {
    scanResult.textContent = "اختر مناسبة أولاً";
    scanResult.style.color = "red";
    return;
  }

  const parsed = parseQrText(qrText);

  if (String(parsed.eventId) !== String(currentEventId)) {
    scanResult.textContent = "QR تابع لمناسبة أخرى ❌";
    scanResult.style.color = "red";
    return;
  }

  const guest = guests.find(g => String(g.id) === String(parsed.guestId));

  if (!guest) {
    scanResult.textContent = "QR غير معروف لهذه المناسبة ❌";
    scanResult.style.color = "red";
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
      time: time
    });

    if (result.status === "duplicate") {
      scanResult.textContent = `مكرر ❌ ${guest.name} تم تسجيله مسبقًا`;
      scanResult.style.color = "red";
      return;
    }

    if (result.status === "success") {
      await loadGuestsFromSheet();

      scanResult.textContent = `تم تسجيل دخول ${guest.name} ✅`;
      scanResult.style.color = "green";
      return;
    }

    scanResult.textContent = "حدث خطأ أثناء التسجيل ❌";
    scanResult.style.color = "red";
  } catch (error) {
    scanResult.textContent = "فشل الاتصال بالشيت ❌";
    scanResult.style.color = "red";
  }
}

eventSelect.onchange = async function () {
  currentEventId = eventSelect.value;
  localStorage.setItem("currentEventId", currentEventId);

  updateEventStatus();
  await loadGuestsFromSheet();
};

addEventBtn.onclick = addEvent;
toggleEventBtn.onclick = toggleCurrentEvent;
addGuestBtn.onclick = addGuest;
generateBtn.onclick = generateInvitations;
downloadAllBtn.onclick = downloadAllInvitations;

if (scanBtn) {
  scanBtn.onclick = startScanner;
}

makeDraggable(nameBox);
makeDraggable(qrBox);

loadEvents();
