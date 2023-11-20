import type {AxiosRequestConfig, Canceler} from 'axios'
import axios from 'axios'

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

/**
 * @description: 生成唯一的每个请求的唯一key
 */
function getPendingKey(config: AxiosRequestConfig, noParams = false, dangerCancelKey?: string) {
    const {url, method, params, data} = config
    if (dangerCancelKey) {
        return dangerCancelKey
    }
    if (noParams) return [url, method].join('&')
    else return [url, method, params, data].join('&')
}

export const newAxiosRequest = ({
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
        axiosConfig: AxiosRequestConfig
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

    const pendingMap: Map<string, Canceler> = new Map()
    const LoadingInstance = {
        _count: 0
    }
    const pendingArrMap: Map<string, Array<() => void>> = new Map()

    const noTokenUrls = [...withoutTokenUrls]
    if (!extraConfig.loginNeedToken) {
        noTokenUrls.push(loginUrl)
    }
    if (!extraConfig.refreshTokenNeedToken) {
        noTokenUrls.push(refreshTokenUrl.axiosConfig.url as string)
    }

    function mainAxios(axiosConfig: AxiosRequestConfig, customOptions?: Partial<EachRequestCustomOptions>, count = 0): Promise<any> {
        const service = axios.create({
            baseURL: baseUrl, // 设置统一的请求前缀
            timeout // 设置统一的超时时长
        })

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

        // 请求拦截
        service.interceptors.request.use(
            (config) => {
                const pendingKey = getPendingKey(config, myOptions.repeat_ignore_params, myOptions.repeat_danger_key)
                if (!pendingMap.has(pendingKey)) {
                    config.cancelToken =
                        config.cancelToken ||
                        new axios.CancelToken((cancel) => {
                            if (!pendingMap.has(pendingKey)) {
                                pendingMap.set(pendingKey, cancel)
                            }
                        })
                } else {
                    if (myOptions.repeat_request_cancel) {
                        const doCancel = pendingMap.get(pendingKey)
                        if (doCancel) {
                            doCancel('重复的请求')
                        }
                        pendingMap.delete(pendingKey)
                    }
                }
                // 创建loading实例
                if (myOptions.loading) {
                    LoadingInstance._count++
                    if (LoadingInstance._count === 1 && loadingFunction) {
                        loadingFunction.start && loadingFunction.start()
                    }
                }

                // 自动携带token
                if (token && !noTokenUrls.some((noUrl) => config.url?.includes(noUrl)) && !myOptions.withoutToken) {
                    config.headers['Authorization'] = `Bearer ${token}`
                }

                return config
            },
            (error) => {
                return Promise.reject(error)
            }
        )

        // 响应拦截
        service.interceptors.response.use(
            (response) => {
                const pendingKey = getPendingKey(response.config, myOptions.repeat_ignore_params, myOptions.repeat_danger_key)
                pendingMap.delete(pendingKey)
                if (myOptions.loading) {
                    if (LoadingInstance._count > 0) LoadingInstance._count--
                    if (loadingFunction && LoadingInstance._count === 0) {
                        loadingFunction.finish && loadingFunction.finish()
                    }
                }
                return response.data
            },
            (error) => {
                const pendingKey = getPendingKey(error.config, myOptions.repeat_ignore_params, myOptions.repeat_danger_key)
                pendingMap.delete(pendingKey)
                if (myOptions.loading) {
                    if (LoadingInstance._count > 0) LoadingInstance._count--
                    if (loadingFunction && LoadingInstance._count === 0) {
                        loadingFunction.error && loadingFunction.error()
                    }
                }

                if (error.config.url.includes(refreshTokenUrl.axiosConfig.url)) {
                    if (handleMessage) {
                        handleMessage.error && handleMessage.error('登录失效')
                    }
                    removeAllItem()
                    window.location.href = `${window.location.origin}/login`
                } else if (error.response.status === 401 && count < 3) {

                    const onceAgainRequest = () => mainAxios(axiosConfig, customOptions, count + 1)

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
                        return mainAxios(refreshTokenUrl.axiosConfig)
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
                    // 处理错误状态码
                    if (myOptions.error_message_show) {
                        if (axios.isCancel(error) && myOptions.repeat_error_ignore) {
                            const msg = httpErrorStatusHandle(error)
                            if (msg && handleMessage?.error) {
                                handleMessage.error(msg)
                            }
                        } else {
                            const msg = httpErrorStatusHandle(error, myOptions.use_api_error_info)
                            if (msg && handleMessage?.error) {
                                handleMessage.error(msg)
                            }
                        }
                    }
                    return Promise.reject(error) // 错误继续返回给到具体页面
                }
            }
        )
        return service(axiosConfig)
    }

    return {
        mainAxios,
        resetLoadingTool,
        resetMessageTool
    }
}

/**
 * @description: 处理异常
 * @param {any} error
 * @param useApiError
 * @return string
 */
function httpErrorStatusHandle(error: any, useApiError?: boolean): string {
    // 处理被取消的请求
    if (axios.isCancel(error)) {
        return '重复的请求'
    }
    let message = ''
    if (error && error.response) {
        switch (error.response.status) {
            case 302:
                message = '接口重定向了！'
                break
            case 400:
                message = '参数不正确！'
                break
            case 401:
                message = '您未登录，或者登录已经超时，请先登录！'
                break
            case 403:
                message = '您没有权限操作！'
                break
            case 404:
                message = '对象不存在'
                break
            case 408:
                message = '请求超时！'
                break
            case 409:
                message = '系统已存在相同数据！'
                break
            case 500:
                message = '服务器内部错误！'
                break
            case 501:
                message = '服务未实现！'
                break
            case 502:
                message = '网关错误！'
                break
            case 503:
                message = '服务不可用！'
                break
            case 504:
                message = '服务暂时无法访问，请稍后再试！'
                break
            case 505:
                message = 'HTTP版本不受支持！'
                break
            default:
                message = '异常问题，请联系管理员！'
        }
    }
    if (error.message && error.message.includes('timeout')) {
        message = '网络请求超时！'
    }
    if (error.message && error.message.includes('Network')) {
        message = window.navigator.onLine ? '服务端异常！' : '您断网了！'
    }
    if (useApiError) {
        if (error.response.data?.detail) {
            message = error.response.data.detail
            try {
                if (typeof error.response.data.detail === 'string') {
                    const errInfo = JSON.parse(error.response.data.detail)
                    if (errInfo.message) {
                        message = errInfo.message
                    }
                } else {
                    const errInfo = error.response.data.detail
                    if (errInfo.message) {
                        message = errInfo.message
                    }
                }
            } catch {
                message = error.response.data.detail
            }
        } else if (error.response.data?.error) {
            message = error.response.data?.error
        } else if (error.response.data?.message) {
            message = error.response.data?.message
        } else if (typeof error.response.data === 'string' && error.response.data.length) {
            message = error.response.data
        }
    }
    return message
}

export type AxiosRequest = ReturnType<typeof newAxiosRequest>
