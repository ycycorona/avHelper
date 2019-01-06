module.exports = (instance) => {
  instance.interceptors.response.use((res) => {
    const { data } = res
    // todo: 可通过data做一些判断
    return res
  }, (error) => {
    return Promise.reject(error)
  })
}
