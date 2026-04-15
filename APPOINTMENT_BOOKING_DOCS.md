# MSCureChain Patient App — Appointment Booking & Timeslot System

## ✅ Current Status

| Component | Status |
|-----------|--------|
| Local Backend (`Multitenant_MsCurechain_Backend`) | ✅ Running on port 5003 |
| Backend Health | ✅ 15 hospitals, 17 doctors loaded |
| App → Local Backend URL | ✅ `http://192.168.29.48:5003/api` |
| Timeslot booking flow | ✅ Implemented |
| Hospital search | ✅ Implemented |
| Specialty filter | ✅ Implemented |
| Doctor search | ✅ Implemented |
| Hybrid model (app + frontdesk) | ✅ Implemented |

---

## Hybrid Booking Architecture

```
FRONTDESK/WALK-IN (existing, unchanged):
  Receptionist → Helpdesk Dashboard → POST /bookings/book
  → patient queued immediately (no timeslot required)
  → type = "offline"

APP BOOKING (new):
  Patient App → Select Hospital → Filter by Specialty
             → Search/Select Doctor → Pick Date
             → GET /bookings/availability → Hourly blocks shown
             → Select Hour Block → Confirm & Pay
             → POST /bookings/book
             → type = "online", paymentStatus = "Paid"
             → BookingConfirmationScreen shown
```

Both flows create the SAME Appointment model in MongoDB.
The `type` field (`"online"` vs `"offline"`) distinguishes them.

---

## Backend: Local vs Production

| Environment | URL |
|-------------|-----|
| **Local (current)** | `http://192.168.29.48:5003/api` |
| Production | `https://www.mscurechain.com/api` |

To switch back to production, edit `.env`:
```env
EXPO_PUBLIC_API_URL=https://www.mscurechain.com/api
```

---

## Key API Endpoints Used

### Hospitals
```
GET /api/hospitals
→ Returns list of all hospitals (public, no auth required)
→ App Step 1: Hospital selection
```

### Doctors
```
GET /api/doctors?hospitalId=XXX&speciality=Cardiology&search=Sharma
Query params (all optional):
  hospitalId  → filter by hospital
  speciality  → filter by specialty (backend uses 'speciality' spelling)
  search      → text search by name
→ App Step 2: Doctor selection with specialty filter
```

### Availability (Hourly Blocks)
```
GET /api/bookings/availability?doctorId=XXX&hospitalId=YYY&date=2026-04-15
→ Returns hourly blocks with capacity info:
  { slots: [{ timeSlot: "9:00 AM - 10:00 AM", totalCapacity: 12, bookedCount: 3, availableCount: 9, isFull: false }] }
→ Shows "isLeave" if doctor is on approved leave
→ App Step 3: Date & time selection
```

### Fine-Grained Timeslots (New Endpoint)
```
GET /api/bookings/timeslots?doctorId=XXX&hospitalId=YYY&date=2026-04-15&hourBlock=9:00 AM - 10:00 AM
→ Returns individual 5-minute slots within the selected hour
→ isHeldByApp=true if an app patient already booked that exact slot
→ Walk-in patients do NOT block these slots (they go to queue, not timeslots)
```

### Book Appointment
```
POST /api/bookings/book
Auth: Bearer token (patient role)
Body:
{
  "doctorId": "string",
  "date": "2026-04-15",
  "timeSlot": "9:00 AM - 10:00 AM",
  "startTime": "9:00 AM",
  "endTime": "10:00 AM",
  "symptoms": ["Fever", "Headache"],
  "reason": "General consultation",
  "type": "online",
  "urgency": "non-urgent",
  "paymentMethod": "online",
  "paymentStatus": "Paid"
}
→ Creates appointment with status "Booked"
→ Notifies doctor + helpdesk via socket.io
→ Assigns/creates MRN for patient
```

---

## Booking Wizard — Step Breakdown

### Step 1: Hospital Selection
- Fetches from GET /api/hospitals (public endpoint)
- Search bar (name + address)
- Shows hospital ID, address
- If only 1 hospital, auto-selected

### Step 2: Doctor Selection
- Fetches from GET /api/doctors?hospitalId=XXX
- Specialty filter chips (extracted from available doctors)
- Search by name or specialty
- Shows photo (initials), specialty badge, experience badge, fee
- Appointment type (In-Person / Video)

### Step 3: Date & Time
- Next 14 days shown as horizontal scroll
- On date selection: GET /api/bookings/availability fetched
- Hourly blocks shown (9:00 AM - 10:00 AM, etc.)
- Shows available slots count per block
- Full blocks are greyed out and disabled
- Doctor on leave → shows message, no slots

### Step 4: Symptoms & Notes
- 15 preset symptom chips (tap to select)
- Custom symptom text input
- Additional notes for doctor
- At least one of symptoms/notes/custom required

### Step 5: Review
- Full summary of all selections
- Consultation fee prominently shown
- Payment methods listed (UPI/Card/NetBanking/Wallet)
- Disclaimer about confirmation only after payment

---

## Hybrid Model: What Doesn't Change

| Frontdesk/Walk-in flow | App booking flow |
|------------------------|-----------------|
| Helpdesk dashboard | Patient app |
| No timeslot required | Timeslot mandatory (hourly block) |
| `type = "offline"` | `type = "online"` |
| Status: "Booked" | Status: "Booked" |
| Goes to queue | Specific time confirmed |
| Walk-in patients can arrive anytime | Patient comes at booked time |
| 12 slots/hour capacity shared | App slots checked before booking |

---

## Environment Setup

### .env (auto-detecting local backend)
```env
EXPO_PUBLIC_API_URL=http://192.168.29.48:5003/api
REACT_APP_API_URL=http://192.168.29.48:5003/api
```

### For different devices:
| Device | URL to use |
|--------|-----------|
| Physical device (same WiFi) | `http://192.168.29.48:5003/api` |
| iOS Simulator | `http://localhost:5003/api` |
| Android Emulator | `http://10.0.2.2:5003/api` |

---

## Files Modified

### Patient App
| File | Change |
|------|--------|
| `.env` | Switched to local backend `192.168.29.48:5003` |
| `src/services/paymentService.ts` | Complete rewrite for local backend API |
| `src/screens/BookAppointmentScreen.tsx` | Complete rewrite with 5-step wizard |
| `src/screens/BookingPaymentScreen.tsx` | Uses local backend direct booking |
| `src/screens/BookingConfirmationScreen.tsx` | Success screen (unchanged) |
| `src/navigation/types.ts` | BookingSlot/BookingConfirmation types |
| `src/navigation/AppNavigator.tsx` | New screens registered |
| `src/api/endpoints.ts` | PAYMENT_ENDPOINTS added |

### Backend (Multitenant_MsCurechain_Backend)
| File | Change |
|------|--------|
| `Doctor/Controllers/doctorController.ts` | Enhanced searchDoctors with hospitalId + search |
| `Appointment/Controllers/bookingController.ts` | Added getTimeslots endpoint |
| `Appointment/Routes/bookingRoutes.ts` | Added /timeslots route |

---

## Testing Checklist

- [ ] Open app → tap "Book Appointment"
- [ ] Step 1: See list of hospitals (should show 15)
- [ ] Step 1: Search for a hospital by name
- [ ] Step 1: Select a hospital → Continue
- [ ] Step 2: See doctors from that hospital (should show 17 total)
- [ ] Step 2: Filter by specialty chip
- [ ] Step 2: Search by doctor name
- [ ] Step 2: Select a doctor → Continue
- [ ] Step 3: Select a date
- [ ] Step 3: See available hourly blocks
- [ ] Step 3: Select a time block → Continue
- [ ] Step 4: Select symptoms → Continue
- [ ] Step 5: Review all details + fee
- [ ] Step 5: Tap "Confirm & Pay"
- [ ] Payment screen: Select UPI → Tap "Pay Securely"
- [ ] Confirmation screen with booking reference + receipt

---

*MSCureChain Patient App — Local Backend: Multitenant_MsCurechain_Backend — Port 5003*
