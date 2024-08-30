import { ComputedRef, Ref, ref, computed, reactive } from 'vue'

export const useReactiveNaive = <T extends Record<string, unknown>>(obj: T) => {
  const rawObj = {
    ...obj
  }
  const innerValue = ref(obj)

  const naiveObj: {
    [key in keyof T]: Ref<(typeof obj)[key] | null>
  } = {}

  Object.keys(obj).forEach((key: keyof T) => {
    naiveObj[key] = computed({
      get: () => (typeof innerValue.value[key] === 'number' ? innerValue.value[key] : innerValue.value[key] || null),
      set: (val) => {
        innerValue.value[key] = val
      }
    })
  })

  const getterValue: {
    [key in keyof T]: ComputedRef<(typeof obj)[key] | undefined>
  } = {}

  const reactiveValue = reactive(naiveObj)

  Object.keys(obj).forEach((key: keyof T) => {
    getterValue[key] = computed(() => reactiveValue[key] ?? undefined)
  })

  const jsonObj = reactive(getterValue)

  const resetValue = () => {
    Object.keys(obj).forEach((key: keyof T) => {
      reactiveValue[key] = rawObj[key]
    })
  }

  return { reactiveValue, jsonObj, resetValue }
}
