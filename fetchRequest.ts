const removeAllItem = () => {
    localStorage.clear()
    sessionStorage.clear()
}

export interface EachRequestCustomOptions {
    /*【默认：false】 是否开启取消进行中的重复请求(舍弃旧的,舍弃时报error), 默认为 false，默认判断依据为url，method, params，data相同为重复*/
    repeat_request_cancel: boolean

    /*【默认：true】是否开启loading层效果,首先需要传loading实例进来*/
    loading: boolean

    /* 【默认：true】是否展示接口错误信息，首先需要传message实例进来*/
    error_message_show: boolean

    /* 【默认：true】直接使用接口的报错信息，尝试获取接口错误信息失败则根据err code尝试使用通用错误处理，先要开启error_message_show*/
    use_api_error_info: boolean

    //【默认：false】针对repeat_request_cancel为true时，忽略判断逻辑中的params和data
    repeat_ignore_params: boolean

    //【默认：false】针对repeat_request_cancel为true时，直接忽略默认判断逻辑，使用该参数作为key区分是否重复
    repeat_danger_key: string

    //【默认：false】当error_message_show为true，但又不想展示repeat_request_cancel的错误提示时
    repeat_error_ignore: boolean

    //【默认：false】不需要token
    withoutToken: boolean
}

type Method =
    | 'get'
    | 'GET'
    | 'delete'
    | 'DELETE'
    | 'head'
    | 'HEAD'
    | 'options'
    | 'OPTIONS'
    | 'post'
    | 'POST'
    | 'put'
    | 'PUT'
    | 'patch'
    | 'PATCH'
    | 'purge'
    | 'PURGE'
    | 'link'
    | 'LINK'
    | 'unlink'
    | 'UNLINK'

export type keyConfig = {
    url: string
    method: Method
    params?: string
    data?: string
}

/**
 * @description: 生成唯一的每个请求的唯一key
 */
function getPendingKey(config: keyConfig, noParams = false, dangerCancelKey?: string) {
    const {url, method, params, data} = config
    if (dangerCancelKey) {
        return dangerCancelKey
    }
    if (noParams) return [url, method].join('&')
    else return [url, method, params, data].join('&')
}

export interface FetchConfig {
    url: string
    method: Method
    data?: Record<string, any>
    params?: Record<string, string | number | undefined>

    [key: string]: any
}

export const newFetchRequest = ({
                                    baseUrl,
                                    timeout = 60 * 1000,
                                    loginUrl,
                                    refreshTokenUrl,
                                    withoutTokenUrls = [],
                                    getToken,
                                    handleMessage = null,
                                    loadingFunction = null,
                                    extraConfig = {
                                        loginNeedToken: false,
                                        refreshTokenNeedToken: true
                                    }
                                }: {
    baseUrl: string
    timeout?: number
    loginUrl: string
    refreshTokenUrl: {
        fetchConfig: FetchConfig
        setToken: (res: any) => void
    }
    withoutTokenUrls?: Array<string>
    getToken: () => string
    handleMessage: null | {
        success?: (msg: string) => void
        error?: (msg: string) => void
    }
    loadingFunction?: null | {
        start?: () => void
        finish?: () => void
        error?: () => void
    }
    extraConfig?: {
        loginNeedToken: false
        refreshTokenNeedToken: true
    }
}) => {
    const resetLoadingTool = (instance: { start?: () => void; finish?: () => void; error?: () => void }) => {
        loadingFunction = instance
    }

    const resetMessageTool = (instance: { success?: (msg: string) => void; error?: (msg: string) => void }) => {
        handleMessage = instance
    }

    const pendingMap: Map<string, (reason: string) => void> = new Map()
    const LoadingInstance = {
        _count: 0
    }
    const pendingArrMap: Map<string, Array<() => void>> = new Map()

    const noTokenUrls = [...withoutTokenUrls]
    if (!extraConfig.loginNeedToken) {
        noTokenUrls.push(loginUrl)
    }
    if (!extraConfig.refreshTokenNeedToken) {
        noTokenUrls.push(refreshTokenUrl.fetchConfig.url as string)
    }

    async function mainFetch(fetchConfig: FetchConfig, customOptions?: Partial<EachRequestCustomOptions>, isJson = true, count = 0): Promise<any> {
        const controller = new AbortController()

        const myOptions: EachRequestCustomOptions = Object.assign(
            {
                repeat_request_cancel: false,
                loading: true,
                error_message_show: true,
                use_api_error_info: true,
                repeat_ignore_params: false,
                repeat_danger_key: false,
                repeat_error_ignore: false,
                withoutToken: false
            },
            customOptions
        )

        const token = getToken()

        try {
            const url = fetchConfig.url.startsWith('http') ? fetchConfig.url : `${baseUrl}${fetchConfig.url}`
            const config: {
                signal: AbortSignal
                method: Method
                headers: {
                    Authorization?: string
                    'Content-Type'?: string
                }
                body?: string
            } = {
                signal: controller.signal,
                method: fetchConfig.method, // *GET, POST, PUT, DELETE, etc.
                headers: {}
            }
            // 自动携带token
            if (token && !noTokenUrls.some((noUrl) => url.includes(noUrl)) && !myOptions.withoutToken) {
                config.headers['Authorization'] = `Bearer ${token}`
            }
            if (isJson && fetchConfig.data) {
                config.headers['Content-Type'] = 'application/json'
                config.body = JSON.stringify(fetchConfig.data)
            }

            let urlParams = ''
            let finalUrl = url

            if (fetchConfig.params) {
                const filterParams = JSON.parse(JSON.stringify(fetchConfig.params))
                urlParams = new URLSearchParams(Object.entries(filterParams)).toString()
                finalUrl = `${url}?${urlParams}`
            }

            const pendingKey = getPendingKey(
                {
                    url: url,
                    method: fetchConfig.method,
                    params: urlParams,
                    data: config.body
                },
                myOptions.repeat_ignore_params,
                myOptions.repeat_danger_key
            )
            const cancelRequest = (reason: string) => controller.abort(reason)
            if (!pendingMap.has(pendingKey)) {
                pendingMap.set(pendingKey, cancelRequest)
            } else {
                if (myOptions.repeat_request_cancel) {
                    const doCancel = pendingMap.get(pendingKey)
                    if (doCancel) {
                        doCancel('重复的请求')
                        pendingMap.delete(pendingKey)
                    }
                }
            }

            // 创建loading实例
            if (myOptions.loading) {
                LoadingInstance._count++
                if (LoadingInstance._count === 1 && loadingFunction) {
                    loadingFunction.start && loadingFunction.start()
                }
            }

            const cancelTimer = setTimeout(() => {
                cancelRequest('请求超时！')
                pendingMap.delete(pendingKey)
            }, timeout)
            const response = await fetch(finalUrl, config)
            clearTimeout(cancelTimer)
            pendingMap.delete(pendingKey)

            if (response.ok) {
                if (myOptions.loading) {
                    if (LoadingInstance._count > 0) LoadingInstance._count--
                    if (loadingFunction && LoadingInstance._count === 0) {
                        loadingFunction.finish && loadingFunction.finish()
                    }
                }

                try {
                    return await response.json()
                } catch {
                    return
                }
            } else {
                if (url.includes(refreshTokenUrl.fetchConfig.url)) {
                    console.log('登录失效')
                    removeAllItem()
                    window.location.href = `${window.location.origin}/login?time=${new Date().getTime()}`
                    if (handleMessage) handleMessage.error && handleMessage.error('登录失效')
                    return
                } else if (response.status === 401 && count < 3) {
                    const onceAgainRequest = () => mainFetch(fetchConfig, customOptions, isJson, count + 1)
                    const nowToken = getToken()
                    if (nowToken && nowToken !== token) {
                        return onceAgainRequest()
                    }
                    const arr = pendingArrMap.get(token)
                    if (arr) {
                        return new Promise((resolve) => {
                            arr.push(() => {
                                resolve(onceAgainRequest())
                            })
                        })
                    } else {
                        pendingArrMap.set(token, [])
                        return mainFetch(refreshTokenUrl.fetchConfig)
                            .then((res) => {
                                refreshTokenUrl.setToken(res)
                                const oldArr = pendingArrMap.get(token)
                                oldArr?.forEach((cb) => {
                                    cb()
                                })
                                pendingArrMap.delete(token)
                                return onceAgainRequest()
                            })
                            .catch(() => {
                                if (handleMessage) {
                                    handleMessage.error && handleMessage.error('登录失效')
                                }
                                removeAllItem()
                                window.location.href = `${window.location.origin}/login`
                            })
                    }
                } else {
                    if (myOptions.loading) {
                        if (LoadingInstance._count > 0) LoadingInstance._count--
                        if (loadingFunction && LoadingInstance._count === 0) {
                            loadingFunction.error && loadingFunction.error()
                        }
                    }

                    const msg = myOptions.error_message_show && (await httpErrorStatusHandle(response, myOptions.use_api_error_info)) // 处理错误状态码
                    if (msg && handleMessage && handleMessage.error) {
                        handleMessage.error(msg)
                    }
                    return Promise.reject(response) // 错误继续返回给到具体页面
                }
            }
        } catch (error: any) {
            const msg = controller.signal.reason

            const finalMsg = msg || '请求失败，请检查网络'
            if (handleMessage) handleMessage.error && handleMessage.error(finalMsg)

            return Promise.reject('请求失败')
        }
    }

    return {
        mainFetch,
        resetLoadingTool,
        resetMessageTool
    }
}

/**
 * @description: 处理异常
 * @param response
 * @param useApiError
 * @return string
 */
export async function httpErrorStatusHandle(response: Response, useApiError?: boolean) {
    let msg = ''
    if (response.status) {
        switch (response.status) {
            case 302:
                msg = '接口重定向了！'
                break
            case 400:
                msg = '参数不正确！'
                break
            case 401:
                msg = '您未登录，或者登录已经超时，请先登录！'
                removeAllItem()
                window.location.href = `${window.location.origin}/login?time=${new Date().getTime()}`
                break
            case 403:
                msg = '您没有权限操作！'
                break
            case 404:
                msg = '对象不存在'
                break
            case 408:
                msg = '请求超时！'
                break
            case 409:
                msg = '系统已存在相同数据！'
                break
            case 500:
                msg = '服务器内部错误！'
                break
            case 501:
                msg = '服务未实现！'
                break
            case 502:
                msg = '网关错误！'
                break
            case 503:
                msg = '服务不可用！'
                break
            case 504:
                msg = '服务暂时无法访问，请稍后再试！'
                break
            case 505:
                msg = 'HTTP版本不受支持！'
                break
            default:
                msg = '异常问题，请联系管理员！'
        }
    }
    if (useApiError) {
        try {
            const error = await response.json()
            if (error.message) {
                msg = error.message
            } else if (error.error) {
                msg = error.error
            } else if (error.detail) {
                msg = error.detail
            }
        } catch (e) {
            console.log(e)
        }
    }
    return msg
}

export type FetchRequest = ReturnType<typeof newFetchRequest>
