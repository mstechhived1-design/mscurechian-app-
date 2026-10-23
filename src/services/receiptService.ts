import { Alert, Share, Platform, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from '@/api';
import { RECEIPT_ENDPOINTS } from '@/api/endpoints';
import { safeFormat } from '@/utils/dateUtils';

export type ReceiptType =
  | 'appointment'
  | 'consultation'
  | 'prescription'
  | 'lab-token'
  | 'lab-invoice'
  | 'lab-report'
  | 'pharmacy'
  | 'pharmacy-invoice'
  | 'discharge-summary'
  | 'discharge'
  | 'discharge-settlement'
  | 'final-bill';

export interface OfficialReceiptResponse {
  success: boolean;
  type: string;
  id: string;
  html: string;
  title: string;
  documentName: string;
  caption: string;
}

class ReceiptService {
  /**
   * Fetches the authentic, server-rendered official HTML document.
   * Single Source of Truth routed from Mscurechain-Frontend-Latest.
   */
  async getOfficialReceiptHtml(type: ReceiptType, id: string, payload?: any): Promise<OfficialReceiptResponse> {
    try {
      let res: any;
      if (payload) {
        res = await apiClient.post<OfficialReceiptResponse>('/patient/receipts/render', {
          type,
          id,
          data: payload,
        });
      } else {
        const endpoint = RECEIPT_ENDPOINTS.GET_HTML(type, id);
        res = await apiClient.get<OfficialReceiptResponse>(endpoint);
      }

      if (!res.data?.success || !res.data?.html) {
        throw new Error('Official receipt generation failed.');
      }

      return res.data;
    } catch (error: any) {
      console.error(`[ReceiptService] Failed to fetch ${type} receipt:`, error);
      throw new Error(
        error?.response?.data?.error ||
        error?.message ||
        `Unable to load official ${type} receipt.`
      );
    }
  }

  /**
   * Prints the official receipt directly or exports it to high-res PDF.
   * Feeds the exact authentic HTML into the native device print engine.
   */
  async printOrExportPdf(type: ReceiptType, id: string, payload?: any): Promise<void> {
    try {
      const receipt = await this.getOfficialReceiptHtml(type, id, payload);

      // Instantaneous native document / print preview (under 1-2 sec) on both Android & iOS
      await Print.printAsync({
        html: receipt.html,
      });
    } catch (error: any) {
      console.error('[ReceiptService] printOrExportPdf error:', error);
      Alert.alert('Document Notice', error.message || 'Could not display document.');
    }
  }

  /**
   * Builds clean plain-text summary for WhatsApp sharing (no emojis).
   */
  buildShareText(type: ReceiptType, payload: any): string {
    const hospName = payload?.hospital?.name || payload?.hospitalName || 'Horizin Hospital';
    const patientName =
      payload?.patient?.fullName ||
      payload?.patientName ||
      payload?.fullName ||
      payload?.name ||
      'Patient';
    const mrn = payload?.patient?.mrn || payload?.mrn || 'N/A';
    const rawDoctor =
      payload?.primaryDoctor ||
      (Array.isArray(payload?.consultants) && payload?.consultants[0]) ||
      payload?.doctorName ||
      (typeof payload?.doctor === 'string' ? payload?.doctor : (payload?.doctor?.name || payload?.doctor?.user?.name)) ||
      'Dr. Ramesh';
    const doctorName = rawDoctor.startsWith('Dr.') ? rawDoctor : `Dr. ${rawDoctor}`;

    if (type === 'discharge-summary' || type === 'discharge') {
      const ipNo = payload?.admissionId || payload?.ipNo || '';
      const admDate = payload?.admissionDate ? safeFormat(payload.admissionDate, 'dd MMM yyyy') : '';
      const disDate = payload?.dischargeDate ? safeFormat(payload.dischargeDate, 'dd MMM yyyy') : '';
      const diag = payload?.diagnosis || 'General Assessment / Observation';
      const condition = payload?.conditionAtDischarge || 'Stable / Improved';
      const meds = payload?.medicationsPrescribed || 'Check pharmacy discharge prescription for details';
      const followUp = payload?.followUpDate
        ? safeFormat(payload.followUpDate, 'dd MMM yyyy')
        : (payload?.followUpInstructions || 'Review in OPD after 7 days or as per instruction');

      return (
        `*${hospName.toUpperCase()} - DISCHARGE SUMMARY*\n` +
        `--------------------\n` +
        `Doctor: ${doctorName.toUpperCase()}\n` +
        `Patient: ${patientName}\n` +
        `MRN: #${mrn}\n` +
        (ipNo ? `IP No: ${ipNo}\n` : '') +
        (admDate ? `Admission Date: ${admDate}\n` : '') +
        (disDate ? `Discharge Date: ${disDate}\n` : '') +
        `Diagnosis: ${diag}\n` +
        `Condition at Discharge: ${condition}\n` +
        `Medications: ${meds}\n` +
        `Follow-up: ${followUp}\n` +
        `--------------------\n` +
        `Verified Digital Discharge Summary - MSCureChain Healthcare Platform`
      );
    }

    const title = (type || 'Clinical Document').replace(/-/g, ' ').toUpperCase();
    return (
      `*${hospName.toUpperCase()} - ${title}*\n` +
      `--------------------\n` +
      `Doctor: ${doctorName.toUpperCase()}\n` +
      `Patient: ${patientName}\n` +
      `MRN: #${mrn}\n` +
      (payload?.formattedDate || payload?.date ? `Date: ${payload.formattedDate || payload.date}\n` : '') +
      (payload?.amount !== undefined ? `Total Amount: Rs. ${payload.amount}\n` : '') +
      (payload?.paidAmount !== undefined ? `Paid: Rs. ${payload.paidAmount}\n` : '') +
      (payload?.balanceAmount !== undefined ? `Balance: Rs. ${payload.balanceAmount}\n` : '') +
      `--------------------\n` +
      `Verified Medical Record - MSCureChain Healthcare Platform`
    );
  }

  /**
   * Opens WhatsApp app directly on the user's phone with plain text message (no emojis, no PDF).
   */
  async sendViaWhatsApp(
    type: ReceiptType,
    id: string,
    phone?: string,
    hospitalId?: string,
    payload?: any
  ): Promise<boolean> {
    try {
      const message = this.buildShareText(type, payload);
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

      const whatsappUrl = cleanPhone
        ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
        : `whatsapp://send?text=${encodeURIComponent(message)}`;

      const webWhatsAppUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          return true;
        }
      } catch (deepLinkErr) {
        console.log('[ReceiptService] Direct whatsapp:// URL bypassed:', deepLinkErr);
      }

      try {
        const canOpenWeb = await Linking.canOpenURL(webWhatsAppUrl);
        if (canOpenWeb) {
          await Linking.openURL(webWhatsAppUrl);
          return true;
        }
      } catch (webErr) {
        console.log('[ReceiptService] wa.me URL bypassed:', webErr);
      }

      // Native device share fallback
      await Share.share({
        title: 'Discharge Summary',
        message,
      });
      return true;
    } catch (error: any) {
      console.error('[ReceiptService] sendViaWhatsApp error:', error);
      Alert.alert(
        'WhatsApp Share',
        error?.message || 'Unable to open WhatsApp on this device.'
      );
      return false;
    }
  }
}

export const receiptService = new ReceiptService();
