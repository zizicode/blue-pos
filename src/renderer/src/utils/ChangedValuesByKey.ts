type HasKeyValue = { key: string; value: any } | Record<string, any>;

export function getChangedValuesFlexibleGeneric<T extends HasKeyValue>(
  arr1: T[] | Record<string, T[]>,
  arr2: T[] | Record<string, T[]>
): string[] {
  let flat1: T[] = Array.isArray(arr1) ? arr1 : Object.values(arr1).flat();
  let flat2: T[] = Array.isArray(arr2) ? arr2 : Object.values(arr2).flat();

  const map2 = Object.fromEntries(flat2.map(item => [item.key, item.value]));

  return flat1.filter(item => item.value !== map2[item.key]).map(item => item.key);
}
