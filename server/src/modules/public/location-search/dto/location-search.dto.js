export const toLocationSearchDto = ({
    query,
    provider,
    suggestions,
    fallbackReason = null
}) => ({
    query,
    provider,
    fallbackReason,
    suggestions: suggestions.map((suggestion) => ({
        id: suggestion.id,
        address: suggestion.address,
        context: suggestion.context,
        latitude: formatCoordinate(suggestion.latitude),
        longitude: formatCoordinate(suggestion.longitude),
        provider: suggestion.provider
    }))
});

export const toLocationSuggestionDto = (suggestion) => ({
    id: suggestion.id,
    address: suggestion.address,
    context: suggestion.context,
    latitude: formatCoordinate(suggestion.latitude),
    longitude: formatCoordinate(suggestion.longitude),
    provider: suggestion.provider
});

const formatCoordinate = (value) => {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return String(value);
    }

    return numericValue.toFixed(6).replace(/\.?0+$/, '');
};
