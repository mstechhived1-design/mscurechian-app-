# NEW Keystore & Fingerprint Information

This document contains the final configuration for the new upload keystore generated on **April 28, 2026**. Use this information for Google Play Console and Firebase configuration.

---

## 1. Keystore Details
- **File Location**: `android/app/mscurechain-patient-upload.jks`
- **Keystore Password**: `ffef75d67c70b7a5f4fa796f3724cf5c`
- **Key Alias**: `mscurechain-alias`
- **Key Password**: `ffef75d67c70b7a5f4fa796f3724cf5c`

---

## 2. Certificate Fingerprints (Perfect Keys)
These are the fingerprints for the **NEW** keystore. These must be registered in the Google Play Console (via the upload key reset) and the Firebase Console.

| Algorithm | Fingerprint |
| :--- | :--- |
| **MD5** | `D0:4E:0C:99:9B:D0:7A:96:83:D1:30:E2:9D:98:F1:79` |
| **SHA-1** | `EB:5E:55:52:3B:B4:34:DF:66:16:3E:4A:B6:84:81:8C:74:A9:EE:70` |
| **SHA-256** | `4C:7F:6F:C7:67:22:82:4D:B2:12:1C:4C:79:3C:EE:FA:BA:26:88:21:1D:82:3F:1A:0C:3F:2D:A1:13:7B:AF:C7` |

---

## 3. Upload Key Reset Status
- **PEM Certificate**: `android/mscurechain_upload_certificate.pem`
- **Action**: This `.pem` file should be uploaded to the Google Play Console under the "Request upload key reset" section.
- **Expected Outcome**: Once Google processes the request, they will allow app bundles signed with the local `.jks` file above.

---

## 4. Build Configuration
The project is already configured to use these keys. The following file has been updated:
- **File**: `android/gradle.properties`
- **Settings**:
  ```properties
  MYAPP_UPLOAD_STORE_FILE=mscurechain-patient-upload.jks
  MYAPP_UPLOAD_KEY_ALIAS=mscurechain-alias
  MYAPP_UPLOAD_STORE_PASSWORD=ffef75d67c70b7a5f4fa796f3724cf5c
  MYAPP_UPLOAD_KEY_PASSWORD=ffef75d67c70b7a5f4fa796f3724cf5c
  ```

---
**Note**: Keep the keystore file and passwords secure. If you lose this `.jks` file, you will need to repeat the upload key reset process.
