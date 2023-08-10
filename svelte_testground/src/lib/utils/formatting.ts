

export function replaceJSONForStringifyDisplay(key: any, value: any) {

  // If the value is a map, convert it to an object
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  return value;
}