import { FALLBACK_IDENTITY_OPTIONS, RIDER_REQUIRED_DOCUMENT_TYPES } from "./identity.constants";
import type {
  IdentityDocument,
  IdentityDocumentForm,
  IdentityDocumentType,
  IdentityFormErrors,
  IdentityOptions,
  IdentityVerification
} from "./identity.types";

export const createEmptyIdentityDocumentForm = (type: IdentityDocumentType): IdentityDocumentForm => ({
  type,
  documentNumber: "",
  holderName: "",
  fileUrl: "",
  backFileUrl: "",
  issuedAt: "",
  expiresAt: "",
  notes: ""
});

export const createInitialIdentityDocuments = () =>
  RIDER_REQUIRED_DOCUMENT_TYPES.map((type) => createEmptyIdentityDocumentForm(type));

export const mapDocumentsToForm = (documents: IdentityDocument[] = []) => {
  if (!documents.length) {
    return createInitialIdentityDocuments();
  }

  const formsByType = new Map(documents.map((document) => [document.type, mapDocumentToForm(document)]));
  const requiredForms = RIDER_REQUIRED_DOCUMENT_TYPES.map((type) => formsByType.get(type) ?? createEmptyIdentityDocumentForm(type));
  const optionalForms = documents
    .filter((document) => !RIDER_REQUIRED_DOCUMENT_TYPES.includes(document.type))
    .map(mapDocumentToForm);

  return [...requiredForms, ...optionalForms];
};

export const mapDocumentToForm = (document: IdentityDocument): IdentityDocumentForm => ({
  type: document.type,
  documentNumber: document.documentNumber ?? "",
  holderName: document.holderName ?? "",
  fileUrl: document.fileUrl ?? "",
  backFileUrl: document.backFileUrl ?? "",
  issuedAt: toInputDate(document.issuedAt),
  expiresAt: toInputDate(document.expiresAt),
  notes: document.notes ?? ""
});

export const buildIdentityPayload = (documents: IdentityDocumentForm[]) => ({
  documents: documents.map((document) => ({
    type: document.type,
    documentNumber: trimToUndefined(document.documentNumber),
    holderName: trimToUndefined(document.holderName),
    fileUrl: document.fileUrl.trim(),
    backFileUrl: trimToUndefined(document.backFileUrl),
    issuedAt: trimToUndefined(document.issuedAt),
    expiresAt: trimToUndefined(document.expiresAt),
    notes: trimToUndefined(document.notes)
  }))
});

export const validateIdentityDocuments = (documents: IdentityDocumentForm[]): IdentityFormErrors => {
  const errors: IdentityFormErrors = {
    byDocumentIndex: {}
  };
  const documentTypes = new Set<IdentityDocumentType>();

  documents.forEach((document, index) => {
    const documentErrors: Partial<Record<keyof IdentityDocumentForm, string>> = {};

    if (documentTypes.has(document.type)) {
      documentErrors.type = "Document type already added";
    }

    documentTypes.add(document.type);

    if (!document.fileUrl.trim()) {
      documentErrors.fileUrl = "File URL is required";
    } else if (!isValidUrl(document.fileUrl)) {
      documentErrors.fileUrl = "Enter a valid URL";
    }

    if (document.backFileUrl.trim() && !isValidUrl(document.backFileUrl)) {
      documentErrors.backFileUrl = "Enter a valid URL";
    }

    if (document.issuedAt && document.expiresAt && new Date(document.expiresAt) <= new Date(document.issuedAt)) {
      documentErrors.expiresAt = "Expiry must be after issue date";
    }

    if (Object.keys(documentErrors).length) {
      errors.byDocumentIndex[index] = documentErrors;
    }
  });

  const missingRequiredTypes = RIDER_REQUIRED_DOCUMENT_TYPES.filter((type) => !documentTypes.has(type));

  if (missingRequiredTypes.length) {
    errors.documents = `Missing required documents: ${missingRequiredTypes.map(formatIdentityDocumentType).join(", ")}`;
  }

  return errors;
};

export const hasIdentityFormErrors = (errors: IdentityFormErrors) =>
  Boolean(errors.documents) || Object.keys(errors.byDocumentIndex).length > 0;

export const getCatalogLabel = (type: IdentityDocumentType, options: IdentityOptions = FALLBACK_IDENTITY_OPTIONS) =>
  options.documentTypeCatalog.find((item) => item.type === type)?.label ?? formatIdentityDocumentType(type);

export const formatIdentityDocumentType = (type: IdentityDocumentType) =>
  type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const resolveCompletionPercent = (identity: IdentityVerification | null) => {
  const requiredCount = identity?.completion.requiredTypes.length || RIDER_REQUIRED_DOCUMENT_TYPES.length;
  const uploadedCount = identity?.completion.uploadedRequiredTypes.length ?? 0;

  if (!requiredCount) {
    return 100;
  }

  return Math.round((uploadedCount / requiredCount) * 100);
};

const trimToUndefined = (value: string) => {
  const trimmed = value.trim();

  return trimmed || undefined;
};

const toInputDate = (value: string | null) => {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
};

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch (_err) {
    return false;
  }
};
