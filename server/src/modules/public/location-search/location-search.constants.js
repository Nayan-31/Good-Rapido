export const LOCATION_SEARCH_PROVIDERS = {
    LOCAL: 'local',
    GOOGLE: 'google'
};

export const LOCATION_SEARCH_FALLBACK_REASONS = {
    MISSING_PROVIDER_TOKEN: 'missing_provider_token',
    PROVIDER_UNAVAILABLE: 'provider_unavailable',
    NO_PROVIDER_RESULTS: 'no_provider_results'
};

export const GOOGLE_AUTOCOMPLETE_FIELD_MASK = [
    'suggestions.placePrediction.placeId',
    'suggestions.placePrediction.text.text',
    'suggestions.placePrediction.structuredFormat.mainText.text',
    'suggestions.placePrediction.structuredFormat.secondaryText.text'
].join(',');

export const GOOGLE_PLACE_DETAILS_FIELD_MASK = [
    'id',
    'displayName',
    'formattedAddress',
    'location'
].join(',');

export const KNOWN_LOCATIONS = [
    {
        id: 'local_howrah_bridge',
        address: 'Howrah Bridge',
        context: 'Kolkata, West Bengal',
        latitude: 22.5851,
        longitude: 88.3468,
        aliases: ['howrah', 'howrah bridge']
    },
    {
        id: 'local_park_street',
        address: 'Park Street',
        context: 'Kolkata, West Bengal',
        latitude: 22.5546,
        longitude: 88.352,
        aliases: ['park street', 'parkstreet']
    },
    {
        id: 'local_muri',
        address: 'Muri',
        context: 'Ranchi district, Jharkhand',
        latitude: 23.3779,
        longitude: 85.8666,
        aliases: ['muri', 'muri junction', 'muri railway station']
    },
    {
        id: 'local_silli',
        address: 'Silli',
        context: 'Ranchi district, Jharkhand',
        latitude: 23.3518,
        longitude: 85.8282,
        aliases: ['silli', 'silli jharkhand']
    },
    {
        id: 'local_ranchi',
        address: 'Ranchi',
        context: 'Jharkhand',
        latitude: 23.3432,
        longitude: 85.3094,
        aliases: ['ranchi', 'ranchi jharkhand']
    },
    {
        id: 'local_connaught_place',
        address: 'Connaught Place',
        context: 'New Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
        aliases: ['connaught place', 'cp', 'new delhi']
    },
    {
        id: 'local_india_gate',
        address: 'India Gate',
        context: 'New Delhi',
        latitude: 28.6129,
        longitude: 77.2295,
        aliases: ['india gate']
    },
    {
        id: 'local_noida',
        address: 'Noida',
        context: 'Uttar Pradesh',
        latitude: 28.5355,
        longitude: 77.391,
        aliases: ['noida']
    },
    {
        id: 'local_mumbai',
        address: 'Mumbai',
        context: 'Maharashtra',
        latitude: 19.076,
        longitude: 72.8777,
        aliases: ['mumbai']
    }
];
