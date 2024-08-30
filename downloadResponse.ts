export default (data: Record<string, any>, apiName = '接口') => {
  const link = document.createElement('a')
  link.download = `${apiName}.json`

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })

  link.href = URL.createObjectURL(blob)

  link.innerText = apiName
  link.style.position = 'absolute'
  link.style.top = '50%'
  link.style.zIndex = '99999'

  let done = false

  document.body.appendChild(link)
  link.addEventListener('click', () => {
    setTimeout(() => {
      link.remove()
      URL.revokeObjectURL(link.href)
      done = true
    }, 800)
  })

  setTimeout(() => {
    if (done) return
    link.remove()
    URL.revokeObjectURL(link.href)
  }, 60 * 1000)
}
