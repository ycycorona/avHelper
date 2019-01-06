const debug = require('debug')('index')
const path = require('path')
const rd = require('rd')
const FileArrange = require('./src/module/file-arrange.js')
const infoGetterFactory = require('./src/module/info-getter.js')

// 用户配置
let rawFileList = [] // 原始的文件列表
const failFetchVideoInfoList = []
let videoInfoCount = 0
const srcDir = 'J:\\xxx\\xxx'
//const outDir = 'F:\\downloads\\检验通过\\test-out'
const baseUrl = 'https://www.javbus.com/'
const whiteHostList = ['www.javbus.com']
// puppeteer配置
const chromeOptions = {
  ignoreHTTPSErrors: true,
  headless: true,
  args: ['--proxy-server=socks5://127.0.0.1:10099'],
  defaultViewport: {
    width: 1920,
    height: 1080
  }
}

main()
  .then((data) => {

  })
  .catch(e => {
    debug(e)
  })
  .then(() => {
    //process.exit(0)
  })


async function main() {
  rawFileList = await getRawFileList(srcDir)
  const fileArrange = new FileArrange(srcDir, rawFileList)
  console.log(fileArrange.filteredFileList)
  debug(`从${srcDir}解析成功${fileArrange.filteredFileList.length}个文件`)
  debug(`extNoAvIdFileList`, fileArrange.extNoAvIdFileList)
  debug(`extNoAvIdFileList`, fileArrange.extNoAvIdFileList)
  debug(`extRepeatVideoFileList`, fileArrange.extRepeatVideoFileList)
  debug(`extIgnoreDir`, fileArrange.extIgnoreDir)
  //return
  debug('初始化浏览器')
  const infoGetter = await infoGetterFactory(baseUrl, whiteHostList, fileArrange.filteredFileList, chromeOptions)

  debug('开始获取影片信息')
  for (const rawFileInfo of fileArrange.filteredFileList) {
    const videoInfo = await infoGetter.getVideoInfoByAvId(rawFileInfo.rawAvId)
    rawFileInfo.videoInfo = null
    if (videoInfo) {
      videoInfoCount ++
      rawFileInfo.videoInfo = videoInfo
    } else {
      failFetchVideoInfoList.push(rawFileInfo.rawAvId)
    }
  }
  debug('影片信息', fileArrange.filteredFileList)

  debug('开始下载封面图片')
  for (const fileInfo of fileArrange.filteredFileList) {
    if (fileInfo.videoInfo) {
      await infoGetter.saveCover(fileInfo)
    }
  }

  debug('开始修改视频名')
  for (const fileInfo of fileArrange.filteredFileList) {
    if (fileInfo.videoInfo) {
      const rawPath = fileInfo.rawFilePath
      const newPath = path.join(fileInfo.rawFileDir, fileInfo.videoInfo.title+fileInfo.ext)
      await fileArrange.rename(rawPath, newPath)
    }
  }

  debug(`videoInfoCount:${videoInfoCount}`) // 成功获取到信息的影片数量
  debug(`failFetchVideoInfoList:${failFetchVideoInfoList}`) // 失败的影片列表

  await infoGetter.closeBrowser() // 关闭浏览器

}

/**
 * 获取原始的文件列表
 * @param srcDir
 * @returns {Promise<any>}
 */
function getRawFileList(srcDir) {
  return new Promise((resolve, reject) => {
    rd.readFile(srcDir, function (err, files) {
      if (err) {debug(err)}
      resolve(files || [])
    })
  })
}


