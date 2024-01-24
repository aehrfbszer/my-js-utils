import { useCallback, useMemo, useState } from 'react'

/**
 * 适配的是Ant Design。
 * 传参建议：
 * initPage建议定义在react的 function component之外，
 * doRequest建议使用useCallback包裹。
 * 
 * @param initPage
 * @param doRequest
 */
export const usePageChange = (
  initPage: { current: number; total: number; pageSize?: number; showSizeChanger?: boolean },
  doRequest: (page: number, pageSize: number) => Promise<Awaited<number>>
) => {
  const tempPageSize = useRef(initPage.pageSize ?? 10)
  const [pagination, setPagination] = useState({ ...initPage, showSizeChanger: !!initPage.showSizeChanger, pageSize: initPage.pageSize ?? 10 })
  useEffect(() => {
    tempPageSize.current = pagination.pageSize
  }, [pagination.pageSize])

  const handleChange = useCallback(
    (newPage: number, newPageSize?: number) => {
      let current = newPage
      const pageSize = newPageSize ?? tempPageSize.current
      if (pageSize !== tempPageSize.current) {
        current = initPage.current
      }
      doRequest(current, pageSize)
        .then((total) => {
          setPagination((prevState) => ({
            ...prevState,
            pageSize,
            current,
            total
          }))
        })
        .catch((e) => {
          console.log(e, '翻页失败')
        })
    },
    [doRequest, initPage]
  )

  const resetPageAndTriggerRequest = useCallback(() => handleChange(initPage.current, initPage.pageSize), [handleChange, initPage])

  return {
    pagination: {
      ...pagination,
      onChange: handleChange
    },
    handleChange,
    resetPageAndTriggerRequest
  }
}
export type autoPageType = ReturnType<typeof usePageChange>
export type paginationType = Pick<autoPageType, 'pagination'>
export type handleChangeType = Pick<autoPageType, 'handleChange'>
export type resetPageAndTriggerRequestType = Pick<autoPageType, 'resetPageAndTriggerRequest'>
