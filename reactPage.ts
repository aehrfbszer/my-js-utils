// @ts-types="npm:@types/react"
import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginationProps } from "antd/es/pagination/Pagination";

type MorePageOptionType = Omit<
  PaginationProps,
  "current" | "total" | "pageSize" | "onChange"
>;

export type initPageType = {
  current: number;
  total: number;
  pageSize?: number;
  morePageOptions?: true | MorePageOptionType;
};

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
  initPage: initPageType,
  doRequest: (page: number, pageSize: number) => Promise<Awaited<number>>,
) => {
  const tempPageSize = useRef(initPage.pageSize ?? 10);
  const [pagination, setPagination] = useState({
    current: initPage.current,
    total: initPage.total,
    pageSize: initPage.pageSize ?? 10,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tempPageSize.current = pagination.pageSize;
  }, [pagination.pageSize]);

  const handleChange = useCallback(
    (newPage: number, newPageSize?: number) => {
      let current = newPage;
      const pageSize = newPageSize ?? tempPageSize.current;
      if (pageSize !== tempPageSize.current) {
        current = initPage.current;
      }
      setLoading(true);
      doRequest(current, pageSize)
        .then((total) => {
          setPagination((prevState) => ({
            ...prevState,
            pageSize,
            current,
            total,
          }));
        })
        .catch((e) => {
          console.log(e, "翻页失败");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [doRequest, initPage],
  );

  const resetPageAndTriggerRequest = useCallback(
    () => handleChange(initPage.current, initPage.pageSize),
    [handleChange, initPage],
  );

  let morePagination: MorePageOptionType = {};

  if (initPage.morePageOptions) {
    if (initPage.morePageOptions === true) {
      morePagination = {
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total: number) => `共 ${total} 条数据`,
        pageSizeOptions: [10, 20, 30, 40],
      };
    } else {
      morePagination = initPage.morePageOptions;
    }
  }

  return {
    pagination: {
      ...pagination,
      ...morePagination,
      onChange: handleChange,
    },
    handleChange,
    resetPageAndTriggerRequest,
    loading,
  };
};
export type autoPageType = ReturnType<typeof usePageChange>;
export type paginationType = Pick<autoPageType, "pagination">;
export type handleChangeType = Pick<autoPageType, "handleChange">;
export type resetPageAndTriggerRequestType = Pick<
  autoPageType,
  "resetPageAndTriggerRequest"
>;
