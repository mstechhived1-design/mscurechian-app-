/**
 * nameUtils.ts - Exact Honorific & Name normalization engine from MS CureChain Frontend
 */

export interface PatientPrefixItem {
  value: string;
  label: string;
}

export const sanitizePatientName = (name: string | null | undefined, fallback: string = "Unnamed Patient"): string => {
  if (!name) return fallback;
  
  const lowerName = name.trim().toLowerCase();
  const debugPlaceholders = [
    "debug",
    "unknown",
    "unknown patient",
    "unnamed",
    "unnamed patient",
    "placeholder",
    "test patient",
    "test"
  ];

  if (debugPlaceholders.includes(lowerName)) {
    return fallback;
  }

  return name;
};

export const cleanDoctorName = (name: string | null | undefined): string => {
  if (!name) return "";
  let cleaned = name.trim();
  while (/^(dr\.?\s*)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(dr\.?\s*)/i, "").trim();
  }
  return cleaned;
};

export const formatDoctorName = (name: string | null | undefined): string => {
  const cleaned = cleanDoctorName(name);
  return cleaned ? `Dr. ${cleaned}` : "Doctor";
};

export const cleanHonorificPrefix = (honorific: string | null | undefined): string => {
  if (!honorific) return "";
  const trimmed = honorific.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s*\([^)]*\)/g, "").trim();
};

export const HONORIFIC_OPTION_ITEMS: PatientPrefixItem[] = [
  { value: "Mr.", label: "Mr." },
  { value: "Mrs.", label: "Mrs." },
  { value: "Ms.", label: "Ms." },
  { value: "Miss", label: "Miss" },
  { value: "Master", label: "Master" },
  { value: "Baby", label: "Baby" },
  { value: "Baby of", label: "Baby of (B/O)" },
  { value: "B/O", label: "B/O (Baby of)" },
  { value: "S/O", label: "S/O (Son of)" },
  { value: "D/O", label: "D/O (Daughter of)" },
  { value: "W/O", label: "W/O (Wife of)" },
  { value: "H/O", label: "H/O (Husband of)" },
  { value: "C/O", label: "C/O (Care of)" },
  { value: "F/O", label: "F/O (Father of)" },
  { value: "M/O", label: "M/O (Mother of)" },
  { value: "L/O", label: "L/O (Legal Guardian of)" },
  { value: "G/O", label: "G/O (Guardian of)" },
  { value: "K/O", label: "K/O (Kin of)" },
  { value: "R/O", label: "R/O (Resident of)" },
  { value: "A/O", label: "A/O (Address of / At)" },
  { value: "P/O", label: "P/O (Parent of)" },
  { value: "U/O", label: "U/O (Under the Care of)" },
  { value: "T/O", label: "T/O (Twin of)" },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." }
];

export const HONORIFIC_OPTIONS = HONORIFIC_OPTION_ITEMS.map(i => i.value);

export const PATIENT_PREFIX_LIST: PatientPrefixItem[] = [
  { value: "Mr", label: "MR" },
  { value: "Mrs", label: "MRS" },
  { value: "Ms", label: "MS" },
  { value: "Miss", label: "MISS" },
  { value: "Dr", label: "DR" },
  { value: "Master", label: "MASTER" },
  { value: "Baby", label: "BABY" },
  { value: "Baby of", label: "BABY OF (B/O)" },
  { value: "B/O", label: "B/O (Baby of)" },
  { value: "S/O", label: "S/O (Son of)" },
  { value: "D/O", label: "D/O (Daughter of)" },
  { value: "W/O", label: "W/O (Wife of)" },
  { value: "H/O", label: "H/O (Husband of)" },
  { value: "C/O", label: "C/O (Care of)" },
  { value: "F/O", label: "F/O (Father of)" },
  { value: "M/O", label: "M/O (Mother of)" },
  { value: "L/O", label: "L/O (Legal Guardian of)" },
  { value: "G/O", label: "G/O (Guardian of)" },
  { value: "K/O", label: "K/O (Kin of)" },
  { value: "R/O", label: "R/O (Resident of)" },
  { value: "A/O", label: "A/O (Address of / At)" },
  { value: "P/O", label: "P/O (Parent of)" },
  { value: "U/O", label: "U/O (Under the Care of)" },
  { value: "T/O", label: "T/O (Twin of)" },
  { value: "Prof", label: "PROF" },
];

/**
 * Retrieves custom honorifics saved for a specific hospital
 */
export const getHospitalCustomHonorifics = (hospitalId?: string | null): string[] => {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const activeId = hospitalId || window.localStorage.getItem("activeHospitalId") || "default";
    const raw = window.localStorage.getItem(`custom_honorifics_${activeId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Saves a new custom honorific for a specific hospital
 */
export const addHospitalCustomHonorific = (newHonorific: string, hospitalId?: string | null): string[] => {
  if (typeof window === "undefined" || !window.localStorage || !newHonorific.trim()) return [];
  try {
    const activeId = hospitalId || window.localStorage.getItem("activeHospitalId") || "default";
    const key = `custom_honorifics_${activeId}`;
    const existing = getHospitalCustomHonorifics(activeId);
    const cleaned = cleanHonorificPrefix(newHonorific.trim());
    if (cleaned && !existing.some(h => h.toLowerCase() === cleaned.toLowerCase())) {
      const updated = [...existing, cleaned];
      window.localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    }
    return existing;
  } catch {
    return [];
  }
};

/**
 * Returns structured honorific items (with helper labels) including hospital custom honorifics
 */
export const getHospitalHonorificItems = (hospitalId?: string | null): PatientPrefixItem[] => {
  const custom = getHospitalCustomHonorifics(hospitalId);
  const customItems: PatientPrefixItem[] = custom.map(c => ({ value: c, label: c }));
  return [...HONORIFIC_OPTION_ITEMS, ...customItems];
};

/**
 * Returns honorific option string values with any hospital custom honorifics included
 */
export const getHospitalHonorificOptions = (hospitalId?: string | null): string[] => {
  const custom = getHospitalCustomHonorifics(hospitalId);
  return [...HONORIFIC_OPTIONS, ...custom];
};

/**
 * Cleans patient names by removing embedded titles/prefixes
 */
export const cleanPatientName = (name: string | null | undefined, fallback: string = "Unnamed Patient"): string => {
  const sanitized = sanitizePatientName(name, fallback);
  let cleaned = sanitized.trim();
  
  while (/^(mr|mrs|ms|miss|mx|dr|prof|prof\.\s*dr|shri|smt|kumari|sister|father|rev|late|capt|col|maj|adv|er|hon|master|baby\s+of(\s*\(b\/o\))?|baby|b\/o|s\/o(\s*\([^)]*\))?|d\/o(\s*\([^)]*\))?|w\/o(\s*\([^)]*\))?|h\/o(\s*\([^)]*\))?|c\/o(\s*\([^)]*\))?|f\/o(\s*\([^)]*\))?|m\/o(\s*\([^)]*\))?|l\/o(\s*\([^)]*\))?|g\/o(\s*\([^)]*\))?|k\/o(\s*\([^)]*\))?|r\/o(\s*\([^)]*\))?|a\/o(\s*\([^)]*\))?|p\/o(\s*\([^)]*\))?|u\/o(\s*\([^)]*\))?|t\/o(\s*\([^)]*\))?)\.?\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(mr|mrs|ms|miss|mx|dr|prof|prof\.\s*dr|shri|smt|kumari|sister|father|rev|late|capt|col|maj|adv|er|hon|master|baby\s+of(\s*\(b\/o\))?|baby|b\/o|s\/o(\s*\([^)]*\))?|d\/o(\s*\([^)]*\))?|w\/o(\s*\([^)]*\))?|h\/o(\s*\([^)]*\))?|c\/o(\s*\([^)]*\))?|f\/o(\s*\([^)]*\))?|m\/o(\s*\([^)]*\))?|l\/o(\s*\([^)]*\))?|g\/o(\s*\([^)]*\))?|k\/o(\s*\([^)]*\))?|r\/o(\s*\([^)]*\))?|a\/o(\s*\([^)]*\))?|p\/o(\s*\([^)]*\))?|u\/o(\s*\([^)]*\))?|t\/o(\s*\([^)]*\))?)\.?\s+/i, "").trim();
  }
  
  return cleaned || fallback;
};

/**
 * Normalizes an honorific string to standard medical format with proper punctuation.
 */
export const normalizeHonorific = (honorific: string | null | undefined): string => {
  if (!honorific) return "";
  const trimmed = honorific.trim();
  if (!trimmed) return "";

  const cleanPrefix = trimmed.replace(/\s*\([^)]*\)/g, "").trim();
  let up = cleanPrefix.toUpperCase().replace(/\.$/, "");

  if (["MR", "MRS", "MS", "DR", "PROF"].includes(up)) {
    return `${cleanPrefix.replace(/\.$/, "")}.`;
  }
  if (up === "MISS") return "Miss";
  if (up === "MASTER") return "Master";
  if (up === "BABY") return "Baby";
  if (up === "BABY OF" || up === "BABY OF (B/O)") return "Baby of";
  if (up === "B/O") return "B/O";
  if (up === "LATE") return "Late";

  if (["S/O", "D/O", "W/O", "H/O", "C/O", "F/O", "M/O", "B/O", "L/O", "G/O", "K/O", "R/O", "A/O", "P/O", "U/O", "T/O"].includes(up)) {
    return up;
  }

  return cleanPrefix;
};

/**
 * Formats patient names with honorific prefix if available.
 */
export const formatPatientNameWithPrefix = (
  name: string | null | undefined,
  honorific: string | null | undefined,
  uppercase: boolean = true,
  includeHonorific: boolean = true
): string => {
  const cleaned = cleanPatientName(name, "Unnamed Patient");

  if (!includeHonorific) {
    return uppercase ? cleaned.toUpperCase() : cleaned;
  }

  let normHonorific = normalizeHonorific(honorific);

  if (!normHonorific && name) {
    const trimmedName = name.trim();
    const match = trimmedName.match(/^(baby\s+of(\s*\(b\/o\))?|baby|b\/o|mr|mrs|ms|miss|master|dr|prof)\.?\s+/i);
    if (match) {
      normHonorific = normalizeHonorific(match[1]);
    }
  }

  if (normHonorific) {
    if (uppercase) {
      const upHonorific = normHonorific.toUpperCase();
      return `${upHonorific} ${cleaned.toUpperCase()}`.trim();
    }
    return `${normHonorific} ${cleaned}`.trim();
  }

  return uppercase ? cleaned.toUpperCase() : cleaned;
};

export const GUARDIAN_RELATIONS = [
  "Father",
  "Mother",
  "Husband",
  "Wife",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Grandfather",
  "Grandmother",
  "Grandson",
  "Granddaughter",
  "Uncle",
  "Aunt",
  "Nephew",
  "Niece",
  "Cousin",
  "Father-in-law",
  "Mother-in-law",
  "Son-in-law",
  "Daughter-in-law",
  "Brother-in-law",
  "Sister-in-law",
  "Relative",
  "Friend",
  "Neighbour",
  "Caregiver",
  "Guardian",
  "Colleague / Employer",
  "Self",
  "Other"
] as const;
