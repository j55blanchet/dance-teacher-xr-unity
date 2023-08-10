

export function replaceJSONForStringifyDisplay(key: any, value: any) {

  // If the value is a map, convert it to an object
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  // Limit decimals to 2 for floats
  if (value?.toFixed) {
    return parseFloat(value.toFixed(2));
  }

  return value;
}