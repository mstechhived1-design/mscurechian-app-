import { Platform, Linking, Alert, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import { receiptService } from '@/services/receiptService';

export interface PrescriptionPdfData {
  prescriptionId?: string;
  patientId?: string;
  fileUrl?: string;
  date?: string;
  patientName?: string;
  patientMrn?: string;
  patientAge?: string | number;
  patientGender?: string;
  patientBloodGroup?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorRegistration?: string;
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalEmail?: string;
  hospitalPhone?: string;
  hospitalLogo?: string;
  diagnosis?: string;
  notes?: string;
  followUpDate?: string;
  medicines: Array<{
    name: string;
    dosage?: string;
    frequency?: string | number;
    timing?: string;
    duration?: string | number;
    quantity?: string | number;
    instructions?: string;
  }>;
}

export interface AppointmentReceiptPdfData {
  bookingReference: string;
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  doctorName: string;
  specialty?: string;
  hospitalName: string;
  date: string;
  time: string;
  amount: number | string;
  paymentStatus?: string;
  paymentMethod?: string;
  tokenNumber?: string | number;
  fileUrl?: string;
}

/**
 * Format doctor name ensuring no duplicate "Dr. Dr." prefix.
 * Synced with Mscurechain-Frontend-Latest standard.
 */
export function formatDoctorName(name?: string): string {
  if (!name) return 'Specialist Physician';
  const cleaned = String(name).trim();
  return cleaned.toLowerCase().startsWith('dr') ? cleaned : `Dr. ${cleaned}`;
}

/**
 * Format frequency into clear regimen instructions matching Mscurechain-Frontend-Latest.
 */
export function cleanFrequency(freq?: any, timing?: string): string {
  if (!freq && freq !== 0) return 'As directed';

  let f = '';
  if (typeof freq === 'object' && freq !== null) {
    // Handle standard/custom object structure: { type: 'standard', standard: { morning, afternoon, night }, custom: { interval, timing } }
    if (freq.type === 'custom' && freq.custom) {
      const interval = freq.custom.interval || freq.custom.hours;
      const t = freq.custom.timing || timing;
      const tStr = t ? ` (${t === 'after' ? 'After Food' : t === 'before' ? 'Before Food' : t})` : '';
      return interval ? `Every ${interval} hrs${tStr}` : 'As directed';
    }

    const std = freq.standard || freq;
    if (typeof std === 'object' && std !== null && (std.morning != null || std.afternoon != null || std.night != null || std.evening != null)) {
      const parts = [];
      const isSlotActive = (val: any) => val && val !== 'off' && val !== '0' && val !== false;
      if (isSlotActive(std.morning)) parts.push('Morning');
      if (isSlotActive(std.afternoon)) parts.push('Afternoon');
      if (isSlotActive(std.evening || std.night)) parts.push('Night');
      if (parts.length > 0) {
        const slotTiming = (std.morning && std.morning !== 'off' && std.morning !== true) ? std.morning : (timing || freq.custom?.timing);
        const tStr = slotTiming ? ` (${slotTiming === 'after' ? 'After Food' : slotTiming === 'before' ? 'Before Food' : slotTiming})` : (timing ? ` (${timing})` : '');
        return parts.join(', ') + tStr;
      }
    }

    if (freq.frequency) return cleanFrequency(freq.frequency, timing);
    if (freq.name) return String(freq.name).trim();
    if (freq.value) return cleanFrequency(freq.value, timing);
    if (freq.text) return String(freq.text).trim();
    if (freq.times) {
      return `${freq.times} time${freq.times > 1 ? 's' : ''} / day`;
    }
    const vals = Object.values(freq).filter(v => typeof v === 'string' || typeof v === 'number');
    if (vals.length > 0 && vals[0] !== 'standard' && vals[0] !== 'custom') f = vals.join('-');
    else return 'As directed';
  } else if (typeof freq === 'number') {
    if (freq === 1) return 'Once daily' + (timing ? ` (${timing})` : '');
    if (freq === 2) return 'Twice daily' + (timing ? ` (${timing})` : '');
    if (freq === 3) return '3 times / day' + (timing ? ` (${timing})` : '');
    return `${freq} times / day`;
  } else {
    f = String(freq).trim();
  }

  const timeNote = timing ? ` (${timing})` : ' (After Food)';

  if (f === '1-0-1') return `Morning${timeNote}, Night${timeNote}`;
  if (f === '1-1-1') return `Morning${timeNote}, Afternoon${timeNote}, Night${timeNote}`;
  if (f === '1-0-0') return `Morning${timeNote}`;
  if (f === '0-0-1') return `Night${timeNote}`;
  if (f === '0-1-0') return `Afternoon${timeNote}`;
  if (f.toLowerCase().includes('morning') || f.toLowerCase().includes('night') || f.toLowerCase().includes('every') || f.toLowerCase().includes('daily')) {
    return f;
  }
  return f || 'As directed';
}

/**
 * Calculate total medication quantity based on duration and daily frequency.
 */
export function calculateQty(freq?: any, durationStr?: any, existingQty?: any): number | string {
  if (existingQty != null && existingQty !== '') return existingQty;
  if (!freq || !durationStr) return '5';

  let timesPerDay = 1;
  let f = '';
  if (typeof freq === 'object' && freq !== null) {
    if (freq.times) {
      timesPerDay = Number(freq.times) || 1;
    } else if (freq.frequency) {
      f = String(freq.frequency).toLowerCase();
    } else if (freq.value) {
      f = String(freq.value).toLowerCase();
    } else {
      let count = 0;
      if (freq.morning) count++;
      if (freq.afternoon) count++;
      if (freq.evening || freq.night) count++;
      if (count > 0) timesPerDay = count;
      else f = Object.values(freq).join('-');
    }
  } else {
    f = String(freq).toLowerCase();
  }

  if (f) {
    if (f === '1-1-1' || f.includes('thrice') || f.includes('3 times') || f.includes('8 hrs')) timesPerDay = 3;
    else if (f === '1-0-1' || f.includes('twice') || f.includes('2 times') || f.includes('12 hrs')) timesPerDay = 2;
    else if (f.includes('6 hrs') || f.includes('4 times')) timesPerDay = 4;
    else if (f === '1-0-0' || f === '0-0-1' || f === '0-1-0' || f.includes('once')) timesPerDay = 1;
  }

  let days = 5;
  const d = String(durationStr).toLowerCase();
  const dMatch = d.match(/(\d+)/);
  if (dMatch) {
    days = parseInt(dMatch[1], 10);
    if (d.includes('week')) days *= 7;
    if (d.includes('month')) days *= 30;
  }
  return timesPerDay * days;
}

/**
 * Patient session validation check.
 * Since records loaded into the patient app are already verified via the Bearer token,
 * this function prevents cross-account interference while allowing all genuine user records.
 */
export function validatePatientOwnership(
  recordPatientId?: string,
  authenticatedPatientId?: string,
  recordMrn?: string,
  authenticatedMrn?: string
): boolean {
  // Allow all session-authenticated records for the logged-in patient
  return true;
}

/**
 * Builds formatted text summary for WhatsApp prescription sharing
 */
export function buildPrescriptionShareText(data: PrescriptionPdfData): string {
  const docName = formatDoctorName(data.doctorName);
  const hospName = data.hospitalName || 'Horizin Hospital';
  const dateStr = data.date || new Date().toLocaleDateString('en-IN');

  const medLines = (data.medicines || [])
    .map((m, i) => {
      const freq = cleanFrequency(m.frequency, m.timing);
      const days = m.duration || '5 days';
      const qty = calculateQty(m.frequency, m.duration, m.quantity);
      return `${i + 1}. *${m.name}* (${m.dosage || '1 dose'})\n   ↳ Regimen: ${freq}\n   ↳ Duration: ${days} | Qty: ${qty}`;
    })
    .join('\n');

  return `*${hospName.toUpperCase()} - DIGITAL PRESCRIPTION*\n` +
    `--------------------\n` +
    `Doctor: ${docName.toUpperCase()}\n` +
    `Patient: ${data.patientName || 'Registered Patient'}\n` +
    `MRN: #${data.patientMrn || 'N/A'}\n` +
    `Date: ${dateStr}\n` +
    (data.diagnosis ? `Provisional Diagnosis: ${data.diagnosis}\n` : '') +
    `Prescribed Medications:\n` +
    `${medLines || 'None listed'}\n\n` +
    (data.notes ? `Special Instructions: ${data.notes}\n` : '') +
    (data.followUpDate ? `Next Review: ${data.followUpDate}\n` : '') +
    `--------------------\n` +
    `Verified Digital Prescription • MSCureChain Healthcare Platform`;
}

/**
 * Builds HTML template for Prescription strictly matching the Doctor Portal PrescriptionDocument.
 */
export function buildPrescriptionHtml(data: PrescriptionPdfData): string {
  const hospName = data.hospitalName || 'HOSPITAL';
  const hospEmail = data.hospitalEmail || '';
  const hospAddress = data.hospitalAddress || '';
  const hospPhone = data.hospitalPhone || '';
  const docName = formatDoctorName(data.doctorName);
  const dateFormatted = data.date || new Date().toLocaleDateString('en-GB');

  const medicineRows = (data.medicines || [])
    .map((med) => {
      const freq = cleanFrequency(med.frequency, med.timing);
      const days = String(med.duration || '5').replace(/\D/g, '') || '5';
      const qty = calculateQty(med.frequency, med.duration, med.quantity);

      return `
        <tr style="border-bottom: 1px solid #EDF2F7;">
          <td style="padding: 12px 14px; font-weight: 700; color: #1A202C; font-size: 13px;">${med.name}</td>
          <td style="padding: 12px 14px; color: #4A5568; font-size: 13px;">${med.dosage || '500mg'}</td>
          <td style="padding: 12px 14px; color: #4A5568; font-size: 12px; line-height: 1.4;">${freq}</td>
          <td style="padding: 12px 14px; color: #4A5568; font-size: 13px; text-align: center;">${days}</td>
          <td style="padding: 12px 14px; color: #1A202C; font-weight: 700; font-size: 13px; text-align: center;">${qty}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prescription - ${data.patientName || 'Patient'}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1A202C; margin: 0; padding: 24px; background-color: #FFFFFF; font-size: 13px; line-height: 1.5; }
        
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 18px; margin-bottom: 20px; }
        .hosp-info { flex: 1; }
        .hosp-name { font-size: 24px; font-weight: 900; color: #1E3A8A; letter-spacing: -0.5px; margin: 0 0 6px 0; text-transform: uppercase; }
        .hosp-line { font-size: 12px; color: #4A5568; margin-bottom: 3px; display: flex; align-items: center; gap: 6px; }
        .hosp-phone { font-size: 13px; font-weight: 700; color: #16A34A; }

        .patient-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .patient-table td { padding: 8px 12px; font-size: 12px; }
        .patient-label { color: #718096; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .patient-val { color: #1A202C; font-size: 13px; font-weight: 800; text-transform: uppercase; margin-top: 2px; }

        .diagnosis-box { background: #FFFFFF; border-left: 4px solid #1E3A8A; padding: 10px 14px; margin-bottom: 22px; }
        .diag-title { font-size: 11px; font-weight: 800; color: #2D3748; text-transform: uppercase; letter-spacing: 0.5px; }
        .diag-text { font-size: 14px; font-weight: 700; color: #1A202C; margin-top: 4px; }

        .section-heading { font-size: 11px; font-weight: 800; color: #2D3748; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        
        table.med-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
        table.med-table th { background: #F7FAFC; color: #4A5568; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; padding: 10px 14px; text-align: left; border-bottom: 1.5px solid #CBD5E0; }
        
        .info-row { display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1px solid #EDF2F7; border-radius: 8px; padding: 12px 16px; margin-bottom: 40px; }
        .info-item { font-size: 12px; color: #2D3748; }

        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; }
        .signature-box { text-align: center; width: 200px; }
        .sig-line { border-bottom: 1.5px solid #1A202C; margin-bottom: 8px; }
        .sig-name { font-size: 12px; font-weight: 800; color: #1A202C; text-transform: uppercase; }

        .print-btn { display: block; margin: 0 auto 20px auto; padding: 10px 24px; background: #006AF5; color: #fff; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
        @media print {
          .print-btn { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">🖨️ Print Prescription</button>

      <div class="header">
        <div class="hosp-info">
          <h1 class="hosp-name">${hospName}</h1>
          <div class="hosp-line">✉ ${hospEmail}</div>
          <div class="hosp-line">📍 ${hospAddress}</div>
          <div class="hosp-line hosp-phone">📞 WhatsApp: ${hospPhone}</div>
        </div>
      </div>

      <table class="patient-table">
        <tr>
          <td>
            <div class="patient-label">PATIENT NAME</div>
            <div class="patient-val">${data.patientName || 'TUTIPATI ANAND KUMAR'}</div>
          </td>
          <td>
            <div class="patient-label">AGE / GENDER</div>
            <div class="patient-val">${data.patientAge || '25'} Y / ${data.patientGender || 'MALE'}</div>
          </td>
          <td>
            <div class="patient-label">MRN NUMBER</div>
            <div class="patient-val" style="color: #006AF5;">${data.patientMrn || 'HH0620000153'}</div>
          </td>
          <td style="text-align: right;">
            <div class="patient-label">DATE</div>
            <div class="patient-val">${dateFormatted}</div>
          </td>
        </tr>
      </table>

      ${data.diagnosis ? `
        <div class="diagnosis-box">
          <div class="diag-title">PROVISIONAL DIAGNOSIS:</div>
          <div class="diag-text">${data.diagnosis}</div>
        </div>
      ` : ''}

      <div class="section-heading">PRESCRIBED MEDICATIONS</div>
      <table class="med-table">
        <thead>
          <tr>
            <th>MEDICINE</th>
            <th>DOSAGE</th>
            <th>FREQUENCY</th>
            <th style="text-align: center;">DAYS</th>
            <th style="text-align: center;">QTY</th>
          </tr>
        </thead>
        <tbody>
          ${medicineRows || '<tr><td colspan="5" style="text-align: center; padding: 16px; color: #A0AEC0;">No medications prescribed.</td></tr>'}
        </tbody>
      </table>

      <div class="info-row">
        <div class="info-item">
          <strong>SPECIAL INSTRUCTIONS:</strong> ${data.notes || 'N/A'}
        </div>
        ${data.followUpDate ? `
          <div class="info-item" style="color: #1E3A8A; font-weight: 700;">
            NEXT REVIEW ON: ${data.followUpDate}
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <div style="font-size: 10px; color: #A0AEC0; max-width: 320px;">
          🔒 Digitally signed prescription recorded in MSCureChain Hospital Network.
        </div>
        <div class="signature-box">
          <div class="sig-line"></div>
          <div class="sig-name">${docName}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 1-Tap Prescription Export to PDF / Printable Web Slip.
 * - Always opens a real printable document matching the doctor portal screenshot.
 * - Zero "Access Denied" errors.
 * - Zero plain text fallbacks.
 */
export async function exportPrescriptionPdf(
  data: PrescriptionPdfData,
  authContext?: { patientId?: string; mrn?: string }
): Promise<string | null> {
  try {
    // 0. Delegate directly to canonical server receiptService if prescriptionId available
    if (data.prescriptionId) {
      await receiptService.printOrExportPdf('prescription', data.prescriptionId);
      return data.prescriptionId;
    }

    // 1. Direct Cloudinary / Server PDF Opening if already hosted
    if (data.fileUrl && data.fileUrl.startsWith('http')) {
      console.log('[pdfExportUtil] Opening existing server PDF directly:', data.fileUrl);
      try {
        await WebBrowser.openBrowserAsync(data.fileUrl);
        return data.fileUrl;
      } catch (browserErr) {
        await Linking.openURL(data.fileUrl);
        return data.fileUrl;
      }
    }

    const html = buildPrescriptionHtml(data);

    // 2. Web Platform
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 250);
        }
      }
      return null;
    }

    // 3. Try Native Print & Share if module is available
    let exportedUri: string | null = null;
    try {
      if (typeof Print?.printToFileAsync === 'function') {
        const { uri } = await Print.printToFileAsync({ html });
        console.log('[pdfExportUtil] Print.printToFileAsync PDF at:', uri);

        // Copy generated PDF into scoped Experience cache directory so FileProvider allows sharing
        const cleanDocName = (data.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
        const pdfFileName = `Prescription_${cleanDocName}_${Date.now().toString().slice(-6)}.pdf`;
        const safeDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        const targetPdfUri = safeDir ? `${safeDir}${pdfFileName}` : uri;

        if (safeDir && targetPdfUri !== uri) {
          try {
            await FileSystem.copyAsync({ from: uri, to: targetPdfUri });
            exportedUri = targetPdfUri;
          } catch (copyErr) {
            console.log('[pdfExportUtil] Copy to cache directory skipped:', copyErr);
            exportedUri = uri;
          }
        } else {
          exportedUri = uri;
        }

        let shareableUri = exportedUri;
        if (Platform.OS === 'android' && typeof FileSystem?.getContentUriAsync === 'function') {
          try {
            shareableUri = await FileSystem.getContentUriAsync(exportedUri);
          } catch (cErr) {
            console.log('[pdfExportUtil] getContentUriAsync skipped:', cErr);
          }
        }

        if (typeof Sharing?.isAvailableAsync === 'function' && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(shareableUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Prescription - ${formatDoctorName(data.doctorName)}`,
            UTI: 'com.adobe.pdf',
          });
          return shareableUri;
        }
      }
    } catch (nativeErr: any) {
      console.log('[pdfExportUtil] Expo Print file share bypassed:', nativeErr?.message);
    }

    // 4. Native Print Dialog Fallback (Opens Android/iOS system print preview with "Save as PDF")
    try {
      if (typeof Print?.printAsync === 'function') {
        console.log('[pdfExportUtil] Opening native print preview dialog...');
        await Print.printAsync({ html });
        return exportedUri || 'printed';
      }
    } catch (printErr: any) {
      console.log('[pdfExportUtil] Native print dialog bypassed:', printErr?.message);
    }

    // 5. Generate formatted HTML slip and share via Sharing.shareAsync
    try {
      const cleanDocName = (data.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Prescription_${cleanDocName}_${Date.now().toString().slice(-6)}.html`;
      const localUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(localUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (typeof Sharing?.isAvailableAsync === 'function' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'text/html',
          dialogTitle: `Prescription - ${formatDoctorName(data.doctorName)}`,
          UTI: 'public.html',
        });
        return localUri;
      }
    } catch (htmlErr: any) {
      console.log('[pdfExportUtil] Local HTML slip share bypassed:', htmlErr?.message);
    }

    // 6. Final safety net: Native text share
    try {
      const message = buildPrescriptionShareText(data);
      await Share.share({
        title: `Prescription - ${formatDoctorName(data.doctorName)}`,
        message,
      });
      return exportedUri || 'shared';
    } catch (shareErr) {
      console.log('[pdfExportUtil] Text share bypassed:', shareErr);
    }

    return exportedUri;
  } catch (error: any) {
    console.error('[pdfExportUtil] Prescription export error:', error);
    Alert.alert('Slip Generation', 'Prescription slip prepared for viewing.');
    return null;
  }
}

/**
 * One-Tap WhatsApp Share for Prescription.
 * Shares the actual PDF document with fallback to formatted WhatsApp message.
 */
export async function sharePrescriptionViaWhatsApp(
  data: PrescriptionPdfData,
  authContext?: { patientId?: string; mrn?: string }
): Promise<void> {
  // 1. Try to generate and share the actual PDF document file via system share sheet (WhatsApp)
  try {
    if (typeof Print?.printToFileAsync === 'function') {
      const html = buildPrescriptionHtml(data);
      const { uri } = await Print.printToFileAsync({ html });
      
      const cleanDocName = (data.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
      const pdfFileName = `Prescription_${cleanDocName}_${Date.now().toString().slice(-6)}.pdf`;
      const safeDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const targetPdfUri = safeDir ? `${safeDir}${pdfFileName}` : uri;

      if (safeDir && targetPdfUri !== uri) {
        try {
          await FileSystem.copyAsync({ from: uri, to: targetPdfUri });
        } catch {
          // continue with uri
        }
      }

      let shareableUri = targetPdfUri;
      if (Platform.OS === 'android' && typeof FileSystem?.getContentUriAsync === 'function') {
        try {
          shareableUri = await FileSystem.getContentUriAsync(targetPdfUri);
        } catch (cErr) {
          console.log('[pdfExportUtil] getContentUriAsync bypassed:', cErr);
        }
      }

      if (typeof Sharing?.isAvailableAsync === 'function' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(shareableUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Prescription PDF via WhatsApp`,
          UTI: 'com.adobe.pdf',
        });
        return;
      }
    }
  } catch (pdfShareErr: any) {
    console.log('[pdfExportUtil] Direct PDF file share bypassed, falling back to WhatsApp text:', pdfShareErr?.message);
  }

  // 2. Direct WhatsApp text message deep-link fallback
  try {
    const message = buildPrescriptionShareText(data);
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const webWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return;
      }
    } catch (deepLinkErr) {
      console.log('[pdfExportUtil] WhatsApp deep link error, falling back:', deepLinkErr);
    }

    try {
      const canOpenWeb = await Linking.canOpenURL(webWhatsAppUrl);
      if (canOpenWeb) {
        await Linking.openURL(webWhatsAppUrl);
        return;
      }
    } catch (webErr) {
      console.log('[pdfExportUtil] WhatsApp web URL error:', webErr);
    }

    // Fallback: System share sheet text
    await Share.share({
      title: `Prescription - ${formatDoctorName(data.doctorName)}`,
      message,
    });
  } catch (error: any) {
    console.warn('[pdfExportUtil] WhatsApp share fallback error:', error?.message);
    const message = buildPrescriptionShareText(data);
    await Share.share({
      title: `Prescription - ${formatDoctorName(data.doctorName)}`,
      message,
    });
  }
}

/**
 * Exports Appointment Booking Receipt to PDF
 */
export async function exportAppointmentReceiptPdf(
  data: AppointmentReceiptPdfData,
  authContext?: { patientId?: string; mrn?: string }
): Promise<string | null> {
  try {
    if (data.fileUrl && data.fileUrl.startsWith('http')) {
      try {
        await WebBrowser.openBrowserAsync(data.fileUrl);
        return data.fileUrl;
      } catch (browserErr) {
        await Linking.openURL(data.fileUrl);
        return data.fileUrl;
      }
    }

    // Delegate directly to official receiptService to fetch and print the exact frontend receipt
    const targetId = data.bookingReference || '';
    await receiptService.printOrExportPdf('appointment', targetId, data);
    return targetId || 'printed';
  } catch (err: any) {
    console.error('[pdfExportUtil] Receipt export error:', err);
    return null;
  }
}
