export const formatPrice = (value) => `$${value.toLocaleString()}`;

export const formatPriceCompact = (value) => {
  if (value >= 1000000) {
    const rounded = Math.round((value / 1000000) * 10) / 10;
    return `$${rounded}m`;
  }
  if (value >= 1000) {
    const rounded = Math.round(value / 1000);
    return `$${rounded}k`;
  }
  return `$${value}`;
};

export const formatFilterTitle = (min, max, homeTypes, beds, baths, priceMax) => {
  const maxLabel = max >= priceMax ? '$10M+' : formatPriceCompact(max);
  const typeLabel = Array.isArray(homeTypes) && homeTypes.length ? ` · ${homeTypes.length} types` : '';
  const bedsLabel = beds !== null ? ` · ${beds}+ bd` : '';
  const bathsLabel = baths !== null ? ` · ${baths}+ ba` : '';
  return `${formatPriceCompact(min)} - ${maxLabel}${typeLabel}${bedsLabel}${bathsLabel}`;
};
