export const validators = {
  required: (label = "This field") => (val) => {
    const str = val === null || val === undefined ? "" : String(val).trim();
    return str.length > 0 ? "" : `${label} is required.`;
  },
  minLength: (min, label = "Value") => (val) => {
    const str = String(val || "").trim();
    return str.length >= min ? "" : `${label} must be at least ${min} characters.`;
  },
  email: (label = "Email") => (val) => {
    const str = String(val || "").trim();
    if (!str) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str) ? "" : `Enter a valid ${label.toLowerCase()} address.`;
  },
  sku: () => (val) => {
    const str = String(val || "").trim();
    if (!str) return "";
    return /^[A-Za-z0-9_-]{3,40}$/.test(str)
      ? ""
      : "SKU must be 3-40 characters (letters, numbers, '-' or '_').";
  },
  positiveNumber: (label = "Value", { allowZero = false } = {}) => (val) => {
    const num = Number(val);
    if (Number.isNaN(num)) return `${label} must be a valid number.`;
    if (allowZero ? num < 0 : num <= 0) {
      return allowZero ? `${label} cannot be negative.` : `${label} must be greater than 0.`;
    }
    return "";
  },
  dateAfter: (otherFieldKey, otherLabel = "start date") => (val, allValues) => {
    if (!val || !allValues?.[otherFieldKey]) return "";
    return String(val) >= String(allValues[otherFieldKey])
      ? ""
      : `Must be on or after ${otherLabel}.`;
  },
};

export function validateField(value, rules = [], allValues = {}) {
  for (const rule of rules) {
    const msg = rule(value, allValues);
    if (msg) return msg;
  }
  return "";
}

export function validateForm(values, schema) {
  const errors = {};
  let isValid = true;
  for (const [field, rules] of Object.entries(schema)) {
    const err = validateField(values[field], rules, values);
    if (err) {
      errors[field] = err;
      isValid = false;
    }
  }
  return { isValid, errors };
}
