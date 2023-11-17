# my-js-utils

- vuePage：vue分页变化，自动请求接口 适配的框架是Naive UI
- reactPage：react分页变化，自动请求接口 适配的框架是Ant Design
- axiosRequest：封装axios，主要功能是：统一错误处理，message提示；请求进行中的loading效果；前端进行token刷新，控制多个并发的过期请求，只请求一次token刷新接口，并在token更新后恢复执行过期的所有请求
- fetchRequest：功能同axiosRequest，是封装浏览器原生的fetch请求
