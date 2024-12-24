export const TOKEN = "token";

/**
 * @description: 存储数据
 * @param {string} key
 * @param {object | string | number} value
 */
export const setItem = (key: string, value: object | string | number) => {
  value = JSON.stringify(value);
  localStorage.setItem(key, value);
};

export function getStorageValue<T>(key: string, defaultValue: T) {
  // getting stored value

  const nil = defaultValue ?? null;

  const saved = localStorage.getItem(key);

  console.log("获取", saved, nil);

  if (saved === null) return nil;
  const initial = JSON.parse(saved);
  return initial ?? nil;
}

/**
 * @description: 删除指定数据
 * @param {string} key
 */
export const removeItem = (key: string) => {
  localStorage.removeItem(key);
};

/**
 * @description: 清空缓存
 */
export const removeAllItem = () => {
  localStorage.clear();
};
