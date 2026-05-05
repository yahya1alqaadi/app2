let guests = [];
let uploadedImage = localStorage.getItem("uploadedImage") || "";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5mMSGr3cizcvh8U3pJfkwynCI9fe7DziZ7PWrFqndc6KlfKtBz6l1kQhY5CniI12MQA/exec";

let scanner = null;
let isScanningPaused = false;

const guestName = document.getElementById("guestName");
const guestPhone = document.getElementById("guestPhone");
const addGuestBtn = document.getElementById("addGuestBtn");
const generateBtn = document.getElementById("generateBtn");
const scanBtn = document.getElementById("scanBtn");

const guestTable = document.getElementById("guestTable");
const invitationTable = document.getElementById("invitationTable");

const inviteUpload = document.getElementById("inviteUpload");
const inviteImage = document.getElementById("inviteImage");
const nameBox = document.getElementById("nameBox");
const qrBox = document.getElementById("qrBox");

const scanResult = document.getElementById("scanResult");

if (uploadedImage) {
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

async function loadGuestsFromSheet() {
  guestTable.innerHTML = `
    <tr>
      <td colspan="5">جاري تحميل الضيوف من الشيت...</td>
    </tr>
  `;

  try {
    const result = await callScript({
      action: "guests"
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
    previewGuest(guest);

    alert("تم إضافة الضيف في الشيت ✅");

  } catch (error) {
    alert("فشل الاتصال بالشيت. تأكد من الإنترنت أو رابط Apps Script.");
  } finally {
    addGuestBtn.disabled = false;
    addGuestBtn.textContent = "إضافة الضيف";
  }
}

function previewGuest(guest) {
  if (!guest) return;

  nameBox.textContent = guest.name;
  qrBox.innerHTML = "";

  new QRCode(qrBox, {
    text: guest.id,
    width: qrBox.clientWidth || 100,
    height: qrBox.clientHeight || 100
  });
}

function renderGuests() {
  guestTable.innerHTML = "";

  if (guests.length === 0) {
    guestTable.innerHTML = `
      <tr>
        <td colspan="5">لا يوجد ضيوف حتى الآن</td>
      </tr>
    `;
    renderInvitationTable();
    return;
  }

  guests.forEach((guest, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${guest.name}</td>
      <td>${guest.phone}</td>
      <td>${guest.checkedIn ? "تم الدخول ✅" : "لم يدخل"}</td>
      <td>${guest.invitation ? "تم توليدها" : "لم تولد"}</td>
      <td><button type="button">حذف</button></td>
    `;

    row.addEventListener("click", () => previewGuest(guest));

    row.querySelector("button").addEventListener("click", function (e) {
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
      <td>${guest.name}</td>
      <td>
        <img src="${guest.invitation}" style="width:180px;border-radius:8px;" />
      </td>
      <td>
        <a href="${guest.invitation}" download="دعوة-${guest.name}.png">تحميل</a>
      </td>
    `;

    invitationTable.appendChild(row);
  });
}

async function deleteGuest(index) {
  const guest = guests[index];

  const ok = confirm("هل تريد حذف هذا الضيف؟ سيتم حذفه من الشيت أيضًا.");
  if (!ok) return;

  try {
    const result = await callScript({
      action: "deleteGuest",
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

  if (guests.length === 0) {
    alert("لا يوجد ضيوف في الشيت");
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

    const qrImage = await createQrImage(guest.id);

    ctx.drawImage(qrImage, qrPos.x, qrPos.y, qrPos.w, qrPos.h);

    guest.invitation = canvas.toDataURL("image/png");
  }

  renderGuests();

  generateBtn.disabled = false;
  generateBtn.textContent = "توليد الدعوات";

  alert("تم توليد الدعوات بنجاح ✨");
}

function makeDraggable(el) {
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

async function checkInGuest(id) {
  const guest = guests.find(g => String(g.id) === String(id));

  if (!guest) {
    scanResult.textContent = "QR غير معروف ❌";
    scanResult.style.color = "red";
    return;
  }

  const time = new Date().toLocaleString("ar-SA");

  try {
    const result = await callScript({
      action: "attendance",
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

addGuestBtn.onclick = addGuest;
generateBtn.onclick = generateInvitations;

if (scanBtn) {
  scanBtn.onclick = startScanner;
}

makeDraggable(nameBox);
makeDraggable(qrBox);

loadGuestsFromSheet();
