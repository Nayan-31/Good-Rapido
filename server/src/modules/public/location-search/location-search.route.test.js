import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    LOCATION_SEARCH_FALLBACK_REASONS,
    LOCATION_SEARCH_PROVIDERS
} from './location-search.constants.js';
import { createLocationSearchRouter } from './location-search.route.js';
import LocationSearchService from './location-search.service.js';

const BASE_PATH = '/api/v1/public/location-search';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createLocationSearchRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

describe('public location search routes', () => {
    let locationSearchService;
    let app;

    beforeEach(() => {
        locationSearchService = {
            search: jest.fn(),
            resolve: jest.fn()
        };
        app = createTestApp({ locationSearchService });
    });

    test('search returns location suggestions for a valid query', async () => {
        locationSearchService.search.mockResolvedValue(buildSuccessResponse({
            message: 'Location suggestions loaded from local fallback',
            data: {
                locationSearch: {
                    query: 'muri',
                    provider: LOCATION_SEARCH_PROVIDERS.LOCAL,
                    fallbackReason: LOCATION_SEARCH_FALLBACK_REASONS.MISSING_PROVIDER_TOKEN,
                    suggestions: [
                        {
                            id: 'local_muri',
                            address: 'Muri',
                            context: 'Ranchi district, Jharkhand',
                            latitude: '23.3779',
                            longitude: '85.8666',
                            provider: LOCATION_SEARCH_PROVIDERS.LOCAL
                        }
                    ]
                }
            }
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/search?query=muri&limit=3`
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.locationSearch.suggestions).toHaveLength(1);
        expect(locationSearchService.search).toHaveBeenCalledWith({
            query: 'muri',
            limit: 3
        });
    });

    test('search rejects very short queries', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/search?query=m`
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(locationSearchService.search).not.toHaveBeenCalled();
    });

    test('resolve returns a selected place with coordinates', async () => {
        locationSearchService.resolve.mockResolvedValue(buildSuccessResponse({
            message: 'Location resolved from Google Places',
            data: {
                location: {
                    id: 'ChIJ123',
                    address: 'MG Road',
                    context: 'Ranchi, Jharkhand, India',
                    latitude: '23.369',
                    longitude: '85.324',
                    provider: LOCATION_SEARCH_PROVIDERS.GOOGLE
                }
            }
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/places/ChIJ123?sessionToken=session-12345`
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.location.latitude).toBe('23.369');
        expect(locationSearchService.resolve).toHaveBeenCalledWith({
            placeId: 'ChIJ123',
            sessionToken: 'session-12345'
        });
    });
});

describe('public location search service', () => {
    test('uses local suggestions when Google Maps API key is missing', async () => {
        const service = new LocationSearchService({ apiKey: '' });
        const response = await service.search({ query: 'muri', limit: 5 });

        expect(response.body.data.locationSearch.provider).toBe(LOCATION_SEARCH_PROVIDERS.LOCAL);
        expect(response.body.data.locationSearch.fallbackReason).toBe(LOCATION_SEARCH_FALLBACK_REASONS.MISSING_PROVIDER_TOKEN);
        expect(response.body.data.locationSearch.suggestions[0]).toEqual(expect.objectContaining({
            address: 'Muri',
            latitude: '23.3779',
            longitude: '85.8666'
        }));
    });

    test('maps Google autocomplete predictions into app suggestions', async () => {
        const fetcher = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                suggestions: [
                    {
                        placePrediction: {
                            placeId: 'ChIJ123',
                            text: {
                                text: 'MG Road, Ranchi, Jharkhand, India'
                            },
                            structuredFormat: {
                                mainText: {
                                    text: 'MG Road'
                                },
                                secondaryText: {
                                    text: 'Ranchi, Jharkhand, India'
                                }
                            }
                        }
                    }
                ]
            })
        });
        const service = new LocationSearchService({
            apiKey: 'google-key',
            fetcher
        });

        const response = await service.search({
            query: 'mg road ranchi',
            limit: 5,
            sessionToken: 'session-12345'
        });

        expect(response.body.data.locationSearch.provider).toBe(LOCATION_SEARCH_PROVIDERS.GOOGLE);
        expect(response.body.data.locationSearch.suggestions[0]).toEqual(expect.objectContaining({
            id: 'ChIJ123',
            address: 'MG Road',
            context: 'Ranchi, Jharkhand, India',
            latitude: '',
            longitude: '',
            provider: LOCATION_SEARCH_PROVIDERS.GOOGLE
        }));
        expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            method: 'POST'
        }));
    });

    test('resolves Google place details into coordinates', async () => {
        const fetcher = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                id: 'ChIJ123',
                displayName: {
                    text: 'MG Road'
                },
                formattedAddress: 'MG Road, Ranchi, Jharkhand, India',
                location: {
                    latitude: 23.369,
                    longitude: 85.324
                }
            })
        });
        const service = new LocationSearchService({
            apiKey: 'google-key',
            fetcher
        });

        const response = await service.resolve({
            placeId: 'ChIJ123',
            sessionToken: 'session-12345'
        });

        expect(response.body.data.location).toEqual(expect.objectContaining({
            id: 'ChIJ123',
            address: 'MG Road',
            context: 'Ranchi, Jharkhand, India',
            latitude: '23.369',
            longitude: '85.324',
            provider: LOCATION_SEARCH_PROVIDERS.GOOGLE
        }));
    });
});
