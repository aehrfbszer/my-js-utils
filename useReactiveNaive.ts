import { computed, ComputedRef, reactive, Ref, ref } from "vue";

// make naive ui great again(但是说实话，没啥用)
export const useReactiveNaive = <T extends Record<string, unknown>>(obj: T) => {
  const rawObj = {
    ...obj,
  };
  const innerValue = ref(obj);

  type ObjForNaive = {
    [key in keyof T]: Ref<T[key] | null>;
  };

  // naive ui不识别空字符，只识别null，赋值为null才会更新页面，置空，所以写naiveObj
  const naiveObj: ObjForNaive = {} as ObjForNaive;
  (Object.keys(obj) as (keyof T)[]).forEach((key) => {
    naiveObj[key] = computed({
      get: () =>
        typeof innerValue.value[key] === "number"
          ? innerValue.value[key]
          : innerValue.value[key] || null,
      set: (val) => {
        innerValue.value[key] = val;
      },
    });
  });

  type GetterValueType = {
    [key in keyof T]: ComputedRef<(typeof obj)[key] | undefined>;
  };

  const getterValue: GetterValueType = {} as GetterValueType;

  const reactiveValue = reactive(naiveObj);
  (Object.keys(obj) as (keyof T)[]).forEach((key) => {
    getterValue[key] = computed(() => naiveObj[key].value ?? undefined);
  });

  // 过滤空字符，null，这两种会转为undefined，在接口中会自然过滤掉undefined字段
  const jsonObj = reactive(getterValue);

  // 忘了这个干嘛的
  const resetValue = () => {
    Object.keys(obj).forEach((key: keyof T) => {
      reactiveValue[key] = rawObj[key];
    });
  };

  return { reactiveValue, jsonObj, resetValue };
};
