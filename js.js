let guests = JSON.parse(localStorage.getItem("guests")) || [];
let uploadedImage = localStorage.getItem("uploadedImage") || "";
let attendance = JSON.parse(localStorage.getItem("attendance")) || [];

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycby_5Hs7hJiy4L3xG4TB3cBZ_oI8yVHkxaqkYVpF7zdG58-NKWdb5a5qemjMIJ4XZGyOsw/exec";

let scanner = null;
let isScanningPaused = false;

const guestName = document.getElementById("guestName");
const guestPhone = document.getElementById("guestPhone");
const addGuestBtn = document.getElementById("addGuestBtn");
const generateBtn = document.getElementById("generateBtn");
const scanBtn = document.getElementById("scanBtn");

const guestTable = document.getElementById("guestTable");
const invitationTable = document.getElementById("invitationTable");
const attendanceTable = document.getElementById("attendanceTable");

const inviteUpload = document.getElementById("inviteUpload");
const inviteImage = document.getElementById("inviteImage");
const editor = document.getElementById("editor");
const nameBox = document.getElementById("nameBox");
const qrBox = document.getElementById("qrBox");

const scanResult = document.getElementById("scanResult");

if (uploadedImage) inviteImage.src = uploadedImage;

function saveGuests() {
  localStorage.setItem("guests", JSON.stringify(guests));
}

function saveAttendance() {
  localStorage.setItem("attendance", JSON.stringify(attendance));
}

function playSuccessSound() {
  const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");
  audio.play();
}

function playErrorSound() {
  const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg");
  audio.play();
}

function sendAttendanceToGoogleSheet(row) {
  fetch(GOOGLE_SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(row)
  });
}

function addGuest() {
  const name = guestName.value.trim();
  const phone = guestPhone.value.trim();

  if (!name || !phone) {
    alert("اكتب الاسم ورقم الجوال");
    return;
  }

  const guest = {
    id: "GUEST-" + Date.now() + "-" + Math.floor(Math.random() * 999999),
    name,
    phone,
    checkedIn: false,
    invitation: ""
  };

  guests.push(guest);
  saveGuests();

  guestName.value = "";
  guestPhone.value = "";

  renderGuests();
  previewGuest(guest);
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
  updateAttendanceCount();
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

function renderAttendance() {
  if (!attendanceTable) return;

  attendanceTable.innerHTML = "";

  attendance.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.phone}</td>
      <td>${row.time}</td>
    `;

    attendanceTable.appendChild(tr);
  });

  updateAttendanceCount();
}

function deleteGuest(index) {
  const guestId = guests[index].id;

  guests.splice(index, 1);
  attendance = attendance.filter(item => item.id !== guestId);

  saveGuests();
  saveAttendance();

  renderGuests();
  renderAttendance();
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

  const baseImage = new Image();
  baseImage.src = uploadedImage;

  await new Promise(r => baseImage.onload = r);

  const namePos = getPositionOnImage(nameBox, baseImage.width, baseImage.height);
  const qrPos = getPositionOnImage(qrBox, baseImage.width, baseImage.height);

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

  saveGuests();
  renderGuests();

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

  document.addEventListener("mouseup", () => dragging = false);
}

function startScanner() {
  if (scanner) {
    scanResult.textContent = "الكاميرا تعمل بالفعل";
    return;
  }

  scanner = new Html5Qrcode("reader");

  scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    txt => {
      if (isScanningPaused) return;

      isScanningPaused = true;
      checkInGuest(txt);

      setTimeout(() => {
        isScanningPaused = false;
      }, 2500);
    },
    error => {}
  ).catch(() => {
    scanResult.textContent = "لم يتم تشغيل الكاميرا، تأكد من السماح باستخدام الكاميرا";
    scanner = null;
  });
}

function checkInGuest(id) {
  const guest = guests.find(g => g.id === id);

  if (!guest) {
    scanResult.textContent = "QR غير معروف ❌";
    playErrorSound();
    return;
  }

  if (guest.checkedIn) {
    scanResult.textContent = `مكرر ❌ ${guest.name} تم تسجيل دخوله مسبقًا`;
    playErrorSound();
    return;
  }

  guest.checkedIn = true;

  const row = {
    name: guest.name,
    phone: guest.phone,
    id: guest.id,
    time: new Date().toLocaleString("ar-SA")
  };

  attendance.push(row);

  saveGuests();
  saveAttendance();

  renderGuests();
  renderAttendance();

  sendAttendanceToGoogleSheet(row);

  scanResult.textContent = `تم تسجيل دخول ${guest.name} ✅`;
  playSuccessSound();
}

function downloadAttendance() {
  if (attendance.length === 0) {
    alert("لا يوجد حضور حتى الآن");
    return;
  }

  let csv = "الاسم,الجوال,رقم QR,وقت الحضور\n";

  attendance.forEach(row => {
    csv += `"${row.name}","${row.phone}","${row.id}","${row.time}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "كشف-الحضور.csv";
  a.click();

  URL.revokeObjectURL(url);
}

function clearAttendance() {
  const ok = confirm("هل أنت متأكد من تصفير الحضور؟ سيتم حذف سجل الحضور من الموقع فقط.");

  if (!ok) return;

  attendance = [];

  guests.forEach(guest => {
    guest.checkedIn = false;
  });

  saveGuests();
  saveAttendance();

  renderGuests();
  renderAttendance();

  scanResult.textContent = "تم تصفير الحضور ✅";
}

function updateAttendanceCount() {
  const countBox = document.getElementById("attendanceCountBox");

  if (countBox) {
    countBox.textContent = `عدد الحضور: ${attendance.length}`;
  }
}

function createControlButtons() {
  if (!scanResult) return;

  const box = document.createElement("div");
  box.style.marginTop = "15px";
  box.style.display = "flex";
  box.style.gap = "10px";
  box.style.flexWrap = "wrap";

  const count = document.createElement("p");
  count.id = "attendanceCountBox";
  count.style.fontWeight = "bold";
  count.textContent = `عدد الحضور: ${attendance.length}`;

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.textContent = "تحميل كشف الحضور Excel";
  downloadBtn.onclick = downloadAttendance;

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.textContent = "تصفير الحضور";
  clearBtn.style.background = "#b91c1c";
  clearBtn.style.color = "#fff";
  clearBtn.onclick = clearAttendance;

  box.appendChild(downloadBtn);
  box.appendChild(clearBtn);

  scanResult.insertAdjacentElement("afterend", box);
  box.insertAdjacentElement("beforebegin", count);
}

addGuestBtn.onclick = addGuest;
generateBtn.onclick = generateInvitations;
scanBtn.onclick = startScanner;

makeDraggable(nameBox);
makeDraggable(qrBox);

createControlButtons();
renderGuests();
renderAttendance();