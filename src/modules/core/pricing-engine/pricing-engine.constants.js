export const PRICING_ENGINE_DEFAULT_SERVICE_ZONE = 'default';

export const PRICING_ENGINE_RULE_SOURCES = Object.freeze({
    ACTIVE_RULE: 'active_rule',
    DEFAULT_RULE: 'default_rule',
    BASELINE: 'baseline'
});

export const PRICING_ENGINE_DEFAULT_SURGE_RULES = Object.freeze({
    morningPeakMultiplier: 1.18,
    eveningPeakMultiplier: 1.32,
    lateNightMultiplier: 1.12,
    maxSurgeMultiplier: 1.8
});

export const PRICING_ENGINE_QUOTE_TYPES = Object.freeze({
    SINGLE: 'single',
    COMPARISON: 'comparison'
});
