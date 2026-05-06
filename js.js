// ============================================
// معاينة الضيف - QR مع خلفية متباينة للمعاينة
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

  // تطبيق الحجم النسبي للـ QR
  resizeQRBox();
  
  qrBox.innerHTML = "";
  
  // استخدام حجم مربع متساوي
  const qrSize = qrBox.clientWidth || 110;
  
  // الحصول على لون QR المختار
  const selectedQrColor = qrColor ? qrColor.value : "#000000";
  
  // 🔧 إضافة خلفية متباينة في المعاينة لتوضيح لون QR
  // إذا كان اللون فاتحاً، نضيف خلفية داكنة للتوضيح
  const isLightColor = isColorLight(selectedQrColor);
  
  if (isLightColor) {
    qrBox.style.backgroundColor = '#334155'; // خلفية داكنة للألوان الفاتحة
    qrBox.style.border = '2px dashed #64748b';
  } else {
    qrBox.style.backgroundColor = '#ffffff'; // خلفية بيضاء للألوان الداكنة
    qrBox.style.border = '2px dashed #2563eb';
  }
  
  // إنشاء QR Code
  new QRCode(qrBox, {
    text: getQrText(guest),
    width: qrSize,
    height: qrSize,
    colorDark: selectedQrColor,
    colorLight: isLightColor ? '#334155' : '#ffffff', // لون الخلفية يتغير حسب لون QR
    correctLevel: QRCode.CorrectLevel.H
  });
}

// ============================================
// دالة مساعدة: تحديد إذا كان اللون فاتحاً أم داكناً
// ============================================

function isColorLight(hexColor) {
  // إزالة # إذا وجدت
  const hex = hexColor.replace('#', '');
  
  // تحويل إلى RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // حساب السطوع (نفس طريقة YIQ)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // إذا كان السطوع > 150 يعتبر فاتحاً
  return brightness > 150;
}

// ============================================
// تحديث resizeQRBox للحفاظ على الخلفية المناسبة
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
// تحديث refreshQrPreview
// ============================================

function refreshQrPreview() {
  if (guests.length > 0) {
    previewGuest(guests[0]);
  } else {
    // حتى لو لم يكن هناك ضيوف، نظهر تأثير اللون على الـ QR placeholder
    updateQRPlaceholderStyle();
  }
}

// ============================================
// تحديث شكل placeholder QR بناءً على اللون
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
// ربط حدث تغيير لون QR
// ============================================

if (qrColor) {
  qrColor.addEventListener("input", function() {
    refreshQrPreview();
    updateQRPlaceholderStyle();
  });
  
  // تطبيق النمط الأولي
  updateQRPlaceholderStyle();
}

// ============================================
// دالة createQrImage - QR بخلفية شفافة دائماً
// ============================================

function createQrImage(text) {
  return new Promise(resolve => {
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(tempDiv);
    
    // حجم مربع للـ QR
    const qrSize = 600;
    const selectedQrColor = qrColor ? qrColor.value : "#000000";
    
    // إنشاء QR بخلفية بيضاء مؤقتة
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
      
      // 🔧 جعل الخلفية شفافة تماماً
      // نحدد لون QR المختار
      const hex = selectedQrColor.replace('#', '');
      const qrR = parseInt(hex.substring(0, 2), 16);
      const qrG = parseInt(hex.substring(2, 4), 16);
      const qrB = parseInt(hex.substring(4, 6), 16);
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // إذا كان البكسل أبيض أو قريب من الأبيض، نجعله شفاف
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0; // شفاف
        }
        // إذا كان البكسل قريب من لون QR المختار، نبقيه كما هو
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

// ============================================
// توليد الدعوات - مع دعم الألوان الفاتحة
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
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري توليد ملفات PDF...';

    // تحميل مكتبة jsPDF
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
      // 1. إنشاء صورة PNG للدعوة
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = baseImage.width;
      canvas.height = baseImage.height;
      
      // رسم الصورة الأساسية
      ctx.drawImage(baseImage, 0, 0);

      // رسم اسم الضيف
      ctx.font = `${fontWeight ? fontWeight.value : "bold"} ${finalFontSize}px ${fontFamily ? fontFamily.value : "Arial"}`;
      ctx.fillStyle = fontColor ? fontColor.value : "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(guest.name, namePos.x + namePos.w/2, namePos.y + namePos.h/2);

      // 🔧 رسم QR Code - مع دعم الألوان الفاتحة
      const qrImage = await createQrImage(getQrText(guest));
      if (qrImage) {
        // إذا كان لون QR فاتحاً، نضيف خلفية داكنة للـ QR
        const selectedQrColor = qrColor ? qrColor.value : "#000000";
        const isLight = isColorLight(selectedQrColor);
        
        if (isLight) {
          // إضافة خلفية داكنة تحت QR
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(qrPos.x - 5, qrPos.y - 5, qrPos.w + 10, qrPos.h + 10);
          
          // إضافة إطار أبيض رفيع حول منطقة QR
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(qrPos.x - 5, qrPos.y - 5, qrPos.w + 10, qrPos.h + 10);
        }
        
        // رسم QR Code
        ctx.drawImage(qrImage, qrPos.x, qrPos.y, qrPos.w, qrPos.h);
      }

      const pngDataURL = canvas.toDataURL("image/png");
      guest.invitationPNG = pngDataURL;

      // 2. إنشاء ملف PDF
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
    showToast(`✅ تم توليد ${guests.length} ملف PDF بنجاح`, "success", 5000);
  } catch (error) {
    console.log("خطأ:", error);
    showToast("❌ خطأ: " + (error.message || error), "error", 5000);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<i class="fas fa-magic"></i> توليد الدعوات PDF';
  }
}
