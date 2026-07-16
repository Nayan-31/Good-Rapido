import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { FALLBACK_IDENTITY_OPTIONS } from "./identity.constants";
import { identityService } from "./identity.service";
import type { IdentityDocumentForm, IdentityFormErrors, IdentityOptions, IdentityVerification } from "./identity.types";
import {
  createEmptyIdentityDocumentForm,
  hasIdentityFormErrors,
  mapDocumentsToForm,
  validateIdentityDocuments
} from "./identity.utils";

export function useIdentityFlow() {
  const [identity, setIdentity] = useState<IdentityVerification | null>(null);
  const [options, setOptions] = useState<IdentityOptions>(FALLBACK_IDENTITY_OPTIONS);
  const [documents, setDocuments] = useState<IdentityDocumentForm[]>([]);
  const [errors, setErrors] = useState<IdentityFormErrors>({ byDocumentIndex: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadIdentity = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [optionsResponse, identityResponse] = await Promise.all([
        identityService.getOptions(),
        identityService.getMe()
      ]);
      const nextOptions = optionsResponse.data?.options ?? FALLBACK_IDENTITY_OPTIONS;
      const nextIdentity = identityResponse.data?.identity ?? null;

      setOptions(nextOptions);
      setIdentity(nextIdentity);
      setDocuments(mapDocumentsToForm(nextIdentity?.documents ?? []));
    } catch (error) {
      setOptions(FALLBACK_IDENTITY_OPTIONS);
      setDocuments((currentDocuments) => currentDocuments.length ? currentDocuments : mapDocumentsToForm([]));
      setLoadError(resolveErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIdentity();
  }, [loadIdentity]);

  const canEdit = identity?.guidance.canEdit ?? true;
  const canSubmit = identity?.guidance.canSubmit ?? false;

  const updateDocument = useCallback((index: number, patch: Partial<IdentityDocumentForm>) => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document, currentIndex) =>
        currentIndex === index
          ? {
              ...document,
              ...patch
            }
          : document
      )
    );
  }, []);

  const addDocument = useCallback(() => {
    const usedTypes = new Set(documents.map((document) => document.type));
    const nextCatalogItem = options.documentTypeCatalog.find((item) => !usedTypes.has(item.type));

    if (nextCatalogItem) {
      setDocuments((currentDocuments) => [...currentDocuments, createEmptyIdentityDocumentForm(nextCatalogItem.type)]);
    }
  }, [documents, options.documentTypeCatalog]);

  const removeDocument = useCallback((index: number) => {
    setDocuments((currentDocuments) => currentDocuments.filter((_document, currentIndex) => currentIndex !== index));
  }, []);

  const saveDocuments = useCallback(async () => {
    const nextErrors = validateIdentityDocuments(documents);
    setErrors(nextErrors);
    setMessage(null);

    if (hasIdentityFormErrors(nextErrors)) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await identityService.saveDocuments(documents);
      const nextIdentity = response.data?.identity ?? null;

      setIdentity(nextIdentity);
      setDocuments(nextIdentity ? mapDocumentsToForm(nextIdentity.documents) : documents);
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [documents]);

  const submitIdentity = useCallback(async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await identityService.submit();
      const nextIdentity = response.data?.identity ?? null;

      setIdentity(nextIdentity);
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const hasOptionalDocumentSlots = useMemo(() => {
    const usedTypes = new Set(documents.map((document) => document.type));

    return options.documentTypeCatalog.some((item) => !usedTypes.has(item.type));
  }, [documents, options.documentTypeCatalog]);

  return {
    identity,
    options,
    documents,
    errors,
    isLoading,
    isSaving,
    isSubmitting,
    message,
    loadError,
    canEdit,
    canSubmit,
    hasOptionalDocumentSlots,
    updateDocument,
    addDocument,
    removeDocument,
    saveDocuments,
    submitIdentity,
    reload: loadIdentity
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Identity request failed";
};
