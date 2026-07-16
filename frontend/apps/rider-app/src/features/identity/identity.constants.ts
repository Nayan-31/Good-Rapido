import type { IdentityDocumentCatalogItem, IdentityDocumentType, IdentityOptions, IdentityStatus } from "./identity.types";

export const RIDER_REQUIRED_DOCUMENT_TYPES: IdentityDocumentType[] = ["government_id", "profile_photo"];

export const IDENTITY_DOCUMENT_CATALOG: IdentityDocumentCatalogItem[] = [
  {
    type: "government_id",
    label: "Government ID",
    requiredForRoles: ["rider", "passenger", "driver", "admin", "ops"]
  },
  {
    type: "driving_license",
    label: "Driving license",
    requiredForRoles: ["driver"]
  },
  {
    type: "pan_card",
    label: "PAN card",
    requiredForRoles: []
  },
  {
    type: "profile_photo",
    label: "Profile photo",
    requiredForRoles: ["rider", "passenger", "driver"]
  },
  {
    type: "address_proof",
    label: "Address proof",
    requiredForRoles: []
  }
];

export const FALLBACK_IDENTITY_OPTIONS: IdentityOptions = {
  requiredDocumentsByRole: {
    rider: RIDER_REQUIRED_DOCUMENT_TYPES,
    passenger: RIDER_REQUIRED_DOCUMENT_TYPES,
    driver: ["government_id", "driving_license", "profile_photo"],
    admin: ["government_id"],
    ops: ["government_id"]
  },
  documentTypeCatalog: IDENTITY_DOCUMENT_CATALOG
};

export const IDENTITY_STATUS_LABELS: Record<IdentityStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  verified: "Verified",
  rejected: "Rejected"
};

export const IDENTITY_STATUS_TONES: Record<IdentityStatus, "neutral" | "trust" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  submitted: "warning",
  verified: "success",
  rejected: "danger"
};
