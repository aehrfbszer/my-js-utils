import { reactive, ref } from 'vue'

/**
 * 适配的是Naive UI。
 * 自动化切换分页请求接口行为，
 * 使用方法是把pagination绑定到data table的pagination，
 * 或者直接v-bind绑到pagination组件。
 * 
 * @param initPage
 * @param initPageSize
 * @param call
 */
export const usePage = (initPage = 1, initPageSize = 10, call: (page: number, pageSize: number) => Promise<number>) => {
    const page = ref(initPage)
    const pageSize = ref(initPageSize)
    const itemCount = ref(0)
    const loading = ref(false)

    const pagination = reactive({
        page,
        pageSize,
        itemCount,
        onUpdatePage: (newPage: number) => {
            handleChange(newPage)
        },
        onUpdatePageSize: (newPageSize: number) => {
            handleChange(initPage, newPageSize)
        },
        prefix: () => {
            return `共 ${itemCount.value} 条数据`
        },
        showSizePicker: true,
        showQuickJumper: true,
        pageSizes: [10, 20, 30, 40]
    })

    const handleChange = (newPage: number, newPageSize?: number) => {
        let latestPage = newPage
        const latestPageSize = newPageSize ?? pageSize.value
        if (latestPageSize !== pageSize.value) {
            latestPage = initPage
        }
        loading.value = true
        call(latestPage, latestPageSize)
            .then((total) => {
                page.value = latestPage
                pageSize.value = latestPageSize
                itemCount.value = total
            })
            .catch((e) => {
                console.log(e, '翻页失败')
            }).finally(
                () => {
                    loading.value = false
                }
            )
    }

    const resetPageAndTriggerRequest = () => {
        handleChange(initPage, initPageSize)
    }

    return {
        resetPageAndTriggerRequest,
        pagination,
        handleChange,
        loading
    }
}
