import type { ApiPayload, ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  PricingDashboard,
  PricingRule,
  PricingRuleList,
  PricingSimulation,
  SurgeDashboard,
  SurgeOptions,
  SurgeRule,
  SurgeRuleList,
  SurgeSimulation,
  PricingOptions
} from "./pricing.types";

type PricingOptionsResponse = ApiResponse<{ options: PricingOptions }>;
type PricingDashboardResponse = ApiResponse<{ dashboard: PricingDashboard }>;
type PricingRulesResponse = ApiResponse<{ pricing: PricingRuleList }>;
type PricingRuleResponse = ApiResponse<{ rule: PricingRule }>;
type PricingSimulationResponse = ApiResponse<PricingSimulation>;

type SurgeOptionsResponse = ApiResponse<{ options: SurgeOptions }>;
type SurgeDashboardResponse = ApiResponse<{ dashboard: SurgeDashboard }>;
type SurgeRulesResponse = ApiResponse<{ surge: SurgeRuleList }>;
type SurgeRuleResponse = ApiResponse<{ rule: SurgeRule }>;
type SurgeSimulationResponse = ApiResponse<SurgeSimulation>;

export const pricingOpsService = {
  async loadPricing() {
    const [optionsResponse, dashboardResponse, rulesResponse] = await Promise.all([
      apiClient.private.pricing.getOptions() as Promise<PricingOptionsResponse>,
      apiClient.private.pricing.getDashboard() as Promise<PricingDashboardResponse>,
      apiClient.private.pricing.listRules({ limit: 50 }) as Promise<PricingRulesResponse>
    ]);

    return {
      options: optionsResponse.data?.options,
      dashboard: dashboardResponse.data?.dashboard,
      rules: rulesResponse.data?.pricing
    };
  },

  async loadSurge() {
    const [optionsResponse, dashboardResponse, rulesResponse] = await Promise.all([
      apiClient.private.surge.getOptions() as Promise<SurgeOptionsResponse>,
      apiClient.private.surge.getDashboard() as Promise<SurgeDashboardResponse>,
      apiClient.private.surge.listRules({ limit: 50 }) as Promise<SurgeRulesResponse>
    ]);

    return {
      options: optionsResponse.data?.options,
      dashboard: dashboardResponse.data?.dashboard,
      rules: rulesResponse.data?.surge
    };
  },

  async getPricingRule(ruleId: string) {
    const response = await apiClient.private.pricing.getRule(ruleId) as PricingRuleResponse;

    return response.data?.rule;
  },

  async createPricingRule(payload: ApiPayload) {
    const response = await apiClient.private.pricing.createRule(payload) as PricingRuleResponse;

    return response.data?.rule;
  },

  async updatePricingRule(ruleId: string, payload: ApiPayload) {
    const response = await apiClient.private.pricing.updateRule(ruleId, payload) as PricingRuleResponse;

    return response.data?.rule;
  },

  async activatePricingRule(ruleId: string) {
    const response = await apiClient.private.pricing.activateRule(ruleId) as PricingRuleResponse;

    return response.data?.rule;
  },

  async archivePricingRule(ruleId: string) {
    const response = await apiClient.private.pricing.archiveRule(ruleId) as PricingRuleResponse;

    return response.data?.rule;
  },

  async simulatePricing(payload: ApiPayload) {
    const response = await apiClient.private.pricing.simulate(payload) as PricingSimulationResponse;

    return response.data;
  },

  async getSurgeRule(ruleId: string) {
    const response = await apiClient.private.surge.getRule(ruleId) as SurgeRuleResponse;

    return response.data?.rule;
  },

  async createSurgeRule(payload: ApiPayload) {
    const response = await apiClient.private.surge.createRule(payload) as SurgeRuleResponse;

    return response.data?.rule;
  },

  async updateSurgeRule(ruleId: string, payload: ApiPayload) {
    const response = await apiClient.private.surge.updateRule(ruleId, payload) as SurgeRuleResponse;

    return response.data?.rule;
  },

  async activateSurgeRule(ruleId: string) {
    const response = await apiClient.private.surge.activateRule(ruleId) as SurgeRuleResponse;

    return response.data?.rule;
  },

  async pauseSurgeRule(ruleId: string) {
    const response = await apiClient.private.surge.pauseRule(ruleId) as SurgeRuleResponse;

    return response.data?.rule;
  },

  async endSurgeRule(ruleId: string) {
    const response = await apiClient.private.surge.endRule(ruleId) as SurgeRuleResponse;

    return response.data?.rule;
  },

  async archiveSurgeRule(ruleId: string) {
    const response = await apiClient.private.surge.archiveRule(ruleId) as SurgeRuleResponse;

    return response.data?.rule;
  },

  async simulateSurge(payload: ApiPayload) {
    const response = await apiClient.private.surge.simulate(payload) as SurgeSimulationResponse;

    return response.data;
  }
};
