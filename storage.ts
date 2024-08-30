export const TOKEN = 'token'

/**
 * @description: 存储数据
 * @param {string} key
 * @param {object | string | number} value
 */
export const setItem = (key: string, value: object | string | number) => {
  value = JSON.stringify(value)
  localStorage.setItem(key, value)
}

/**
 * @description: 获取数据
 * @param {string} key
 * @return {*}
 */
export const getItem = (key: string): object | string | number | null => {
  const data = localStorage.getItem(key)
  if (data) {
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }
  return data
}

/**
 * @description: 删除指定数据
 * @param {string} key
 */
export const removeItem = (key: string) => {
  localStorage.removeItem(key)
}

/**
 * @description: 清空缓存
 */
export const removeAllItem = () => {
  localStorage.clear()
}
