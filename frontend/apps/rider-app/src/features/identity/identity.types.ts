export type IdentityStatus = "draft" | "submitted" | "verified" | "rejected";

export type IdentityDocumentStatus = "uploaded" | "approved" | "rejected";

export type IdentitySubjectRole = "rider" | "passenger" | "driver" | "admin" | "ops";

export type IdentityDocumentType =
  | "government_id"
  | "driving_license"
  | "pan_card"
  | "profile_photo"
  | "address_proof";

export interface IdentityDocumentCatalogItem {
  type: IdentityDocumentType;
  label: string;
  requiredForRoles: IdentitySubjectRole[];
}

export interface IdentityOptions {
  requiredDocumentsByRole: Record<IdentitySubjectRole, IdentityDocumentType[]>;
  documentTypeCatalog: IdentityDocumentCatalogItem[];
}

export interface IdentityDocument {
  type: IdentityDocumentType;
  status: IdentityDocumentStatus;
  documentNumber: string | null;
  holderName: string | null;
  fileUrl: string | null;
  backFileUrl: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  notes: string | null;
}

export interface IdentityVerification {
  id: string | null;
  subject: {
    scope: "public" | "private" | null;
    role: IdentitySubjectRole | null;
    id: string | null;
  };
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: IdentityStatus;
  documents: IdentityDocument[];
  completion: {
    requiredTypes: IdentityDocumentType[];
    uploadedRequiredTypes: IdentityDocumentType[];
    missingRequiredTypes: IdentityDocumentType[];
    isComplete: boolean;
  };
  guidance: {
    canEdit: boolean;
    canSubmit: boolean;
    needsReview: boolean;
    nextAction: string;
  };
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface IdentityDocumentForm {
  type: IdentityDocumentType;
  documentNumber: string;
  holderName: string;
  fileUrl: string;
  backFileUrl: string;
  issuedAt: string;
  expiresAt: string;
  notes: string;
}

export interface IdentityFormErrors {
  documents?: string;
  byDocumentIndex: Record<number, Partial<Record<keyof IdentityDocumentForm, string>>>;
}
