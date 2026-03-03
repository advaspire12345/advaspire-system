// Program-related constants
// These are safe to use in both client and server components

export const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "mandarin", label: "Mandarin" },
  { value: "thai", label: "Thai" },
  { value: "malay", label: "Malay" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
] as const;

export const PROGRAM_TYPE_OPTIONS = [
  { value: "course", label: "Course" },
  { value: "workshop", label: "Workshop" },
  { value: "bootcamp", label: "Bootcamp" },
  { value: "certification", label: "Certification" },
] as const;

export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;
