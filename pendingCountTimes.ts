// const pendingCountTimes = (count = 3) => {
//   const generator: Array<unknown> = []

//   const generatorOne = (...args: unknown[]) => {}

//   return {}
// }
class AutoPendingRetry {
  static pendingMap = new WeakMap<symbol, Array<() => unknown>>()
  #count: number
  #syl: symbol
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
    this.#syl = Symbol()
  }

  async generatorOne(fn: () => unknown) {
    const arr = AutoPendingRetry.pendingMap.get(this.#syl) ?? []

    let res
    try {
      res = await fn()
      if (this.needPending?.(res)) {
        const { promise, resolve } = Promise.withResolvers()
        arr.push(() => resolve(fn()))
        res = promise
      }
    } catch (e) {
      console.log(e)
      if (this._errNeedRetry) {
        const { promise, resolve } = Promise.withResolvers()
        arr.push(() => resolve(fn()))
        res = promise
      }
    }
    if (!AutoPendingRetry.pendingMap.has(this.#syl)) {
      AutoPendingRetry.pendingMap.set(this.#syl, arr)
    }
    return res
  }


  doRetry(freshRes:unknown,handleFun:(freshRes:unknown,oldFun:()=>void,count:number)=>void){
    const arr = AutoPendingRetry.pendingMap.get(this.#syl) ?? []

  
    arr.forEach(
        item=>{
            const newFun = handleFun(freshRes,item,)

        }
    )
  }

}

new AutoPendingRetry()
