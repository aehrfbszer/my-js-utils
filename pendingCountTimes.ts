type pendingTuple = [fn: () => unknown, resolve: (value: unknown) => void, tryCount: number]

// 感觉写的不行，好像也没有任何用处
export class AutoPendingRetry {
  static pendingMap = new WeakMap<AutoPendingRetry, Array<pendingTuple>>()
  #count: number
  #pendingArr: Array<pendingTuple>
  needPending?: (res: unknown) => boolean
  _errNeedRetry = false
  constructor(count = 3, retryWhen?: (res: unknown) => boolean, errNeedRetry = false) {
    const initError = new Error('constructor param need postive number or no param')
    if (typeof count !== 'number') {
      throw initError
    }
    if (count < 0) {
      throw initError
    }
    this.#count = count
    this.needPending = retryWhen
    this._errNeedRetry = errNeedRetry
    this.#pendingArr = []
    AutoPendingRetry.pendingMap.set(this, this.#pendingArr)
  }

  async generatorOne(
    fn: () => unknown,
    options: {
      isFreshContext: boolean
      extraHandleIfFresh?: (data: unknown) => boolean
    } = {
      isFreshContext: true,
    },
    tryTimes = 0
  ) {
    let res

    const putRetry = () => {
      const { promise, resolve } = Promise.withResolvers()
      this.#pendingArr.push([fn, resolve, tryTimes + 1])

      res = promise
    }

    try {
      res = await fn()

      if (options.extraHandleIfFresh?.(res) ?? options.isFreshContext) this.doRetry(res)

      if (this.needPending?.(res)) {
        putRetry()
      }
    } catch (e) {
      console.log(e)
      if (this._errNeedRetry) {
        putRetry()
      }
    }
    return res
  }

  doRetry(
    newContext: unknown,
    handleFun: (context: unknown, t: pendingTuple) => void = (_, tuple) => {
      const [fn, resolve, count] = tuple
      if (this.#count > count) {
        resolve(this.generatorOne(fn, { isFreshContext: false }, count))
      }
    }
  ) {
    const arr = this.#pendingArr
    this.#pendingArr = []

    arr.forEach((item) => {
      handleFun(newContext, item)
    })
  }
}
