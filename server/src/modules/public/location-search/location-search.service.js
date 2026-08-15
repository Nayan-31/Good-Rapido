import env from '../../../config/env.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    GOOGLE_AUTOCOMPLETE_FIELD_MASK,
    GOOGLE_PLACE_DETAILS_FIELD_MASK,
    KNOWN_LOCATIONS,
    LOCATION_SEARCH_FALLBACK_REASONS,
    LOCATION_SEARCH_PROVIDERS
} from './location-search.constants.js';
import {
    toLocationSearchDto,
    toLocationSuggestionDto
} from './dto/location-search.dto.js';

export default class LocationSearchService {
    constructor({
        apiKey = env.GOOGLE_MAPS_API_KEY,
        country = env.GOOGLE_MAPS_SEARCH_COUNTRY,
        autocompleteEndpoint = env.GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT,
        detailsEndpoint = env.GOOGLE_PLACES_DETAILS_ENDPOINT,
        fetcher = globalThis.fetch
    } = {}) {
        this.apiKey = apiKey;
        this.country = country;
        this.autocompleteEndpoint = autocompleteEndpoint;
        this.detailsEndpoint = detailsEndpoint;
        this.fetcher = fetcher;
    }

    search = async ({ query, limit, latitude, longitude, sessionToken }) => {
        const localSuggestions = searchKnownLocations(query, limit);

        if (!this.apiKey) {
            return this.buildSearchResponse({
                query,
                provider: LOCATION_SEARCH_PROVIDERS.LOCAL,
                suggestions: localSuggestions,
                fallbackReason: LOCATION_SEARCH_FALLBACK_REASONS.MISSING_PROVIDER_TOKEN
            });
        }

        try {
            const googleSuggestions = await this.searchGoogleAutocomplete({
                query,
                limit,
                latitude,
                longitude,
                sessionToken
            });

            if (!googleSuggestions.length) {
                return this.buildSearchResponse({
                    query,
                    provider: LOCATION_SEARCH_PROVIDERS.LOCAL,
                    suggestions: localSuggestions,
                    fallbackReason: LOCATION_SEARCH_FALLBACK_REASONS.NO_PROVIDER_RESULTS
                });
            }

            return this.buildSearchResponse({
                query,
                provider: LOCATION_SEARCH_PROVIDERS.GOOGLE,
                suggestions: googleSuggestions
            });
        } catch {
            return this.buildSearchResponse({
                query,
                provider: LOCATION_SEARCH_PROVIDERS.LOCAL,
                suggestions: localSuggestions,
                fallbackReason: LOCATION_SEARCH_FALLBACK_REASONS.PROVIDER_UNAVAILABLE
            });
        }
    };

    resolve = async ({ placeId, sessionToken }) => {
        if (!this.apiKey) {
            throw AppError.badRequest('Google Maps API key is not configured');
        }

        try {
            const location = await this.resolveGooglePlace({
                placeId,
                sessionToken
            });

            return buildSuccessResponse({
                message: 'Location resolved from Google Places',
                data: {
                    location: toLocationSuggestionDto(location)
                }
            });
        } catch {
            throw AppError.badRequest('Selected location could not be resolved');
        }
    };

    searchGoogleAutocomplete = async ({ query, limit, latitude, longitude, sessionToken }) => {
        const body = {
            input: query,
            includedRegionCodes: this.country ? [this.country] : undefined,
            sessionToken,
            locationBias: buildLocationBias(latitude, longitude)
        };

        const response = await this.fetcher(this.autocompleteEndpoint, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'X-Goog-Api-Key': this.apiKey,
                'X-Goog-FieldMask': GOOGLE_AUTOCOMPLETE_FIELD_MASK
            },
            body: JSON.stringify(stripUndefined(body))
        });

        if (!response.ok) {
            throw new Error('Google Places autocomplete failed');
        }

        const payload = await response.json();

        return normalizeGoogleAutocompleteSuggestions(payload.suggestions ?? [])
            .slice(0, limit);
    };

    resolveGooglePlace = async ({ placeId, sessionToken }) => {
        const url = new URL(`${this.detailsEndpoint}/${encodeURIComponent(placeId)}`);

        if (sessionToken) {
            url.searchParams.set('sessionToken', sessionToken);
        }

        const response = await this.fetcher(url.toString(), {
            headers: {
                accept: 'application/json',
                'X-Goog-Api-Key': this.apiKey,
                'X-Goog-FieldMask': GOOGLE_PLACE_DETAILS_FIELD_MASK
            }
        });

        if (!response.ok) {
            throw new Error('Google Place Details failed');
        }

        const payload = await response.json();
        const latitude = payload.location?.latitude;
        const longitude = payload.location?.longitude;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('Google Place Details did not include coordinates');
        }

        const address = payload.displayName?.text || payload.formattedAddress || 'Selected location';

        return {
            id: payload.id || placeId,
            address,
            context: buildAddressContext(payload.formattedAddress, address) || 'Google Places result',
            latitude,
            longitude,
            provider: LOCATION_SEARCH_PROVIDERS.GOOGLE
        };
    };

    buildSearchResponse = ({ query, provider, suggestions, fallbackReason = null }) => buildSuccessResponse({
        message: provider === LOCATION_SEARCH_PROVIDERS.GOOGLE
            ? 'Location suggestions loaded from Google Places'
            : 'Location suggestions loaded from local fallback',
        data: {
            locationSearch: toLocationSearchDto({
                query,
                provider,
                suggestions,
                fallbackReason
            })
        }
    });
}

const searchKnownLocations = (query, limit) => {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
        return [];
    }

    return KNOWN_LOCATIONS
        .filter((location) =>
            normalizeText(location.address).includes(normalizedQuery)
            || normalizeText(location.context).includes(normalizedQuery)
            || location.aliases.some((alias) => normalizeText(alias).includes(normalizedQuery))
        )
        .slice(0, limit)
        .map((location) => ({
            ...location,
            provider: LOCATION_SEARCH_PROVIDERS.LOCAL
        }));
};

const normalizeGoogleAutocompleteSuggestions = (suggestions) => suggestions
    .map((suggestion, index) => {
        const prediction = suggestion.placePrediction;

        if (!prediction?.placeId) {
            return null;
        }

        const mainText = prediction.structuredFormat?.mainText?.text;
        const secondaryText = prediction.structuredFormat?.secondaryText?.text;
        const fullText = prediction.text?.text;

        return {
            id: prediction.placeId,
            address: mainText || fullText || 'Selected location',
            context: secondaryText || buildAddressContext(fullText, mainText) || 'Google Places result',
            latitude: '',
            longitude: '',
            provider: LOCATION_SEARCH_PROVIDERS.GOOGLE,
            rank: index
        };
    })
    .filter(Boolean);

const buildLocationBias = (latitude, longitude) => {
    if (latitude === undefined || longitude === undefined) {
        return undefined;
    }

    return {
        circle: {
            center: {
                latitude,
                longitude
            },
            radius: 50000
        }
    };
};

const buildAddressContext = (fullAddress, address) => {
    if (!fullAddress || !address) {
        return '';
    }

    return String(fullAddress).replace(String(address), '').replace(/^,\s*/, '').trim();
};

const stripUndefined = (payload) => Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
);

const normalizeText = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
