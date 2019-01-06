const debug = require('debug')('FileArrange')
const regex = require('./regex')
const path = require('path')
const fs = require('fs')
const promisify = require('util').promisify
const renamePro = promisify(fs.rename)
module.exports = class FileArrange {
  constructor(srcDir, rawFileList = []) {
    this.srcDir = srcDir
    this.rawFileList = rawFileList
    this.extNoVideoFileList = [] // 不是视频文件的文件
    this.extNoAvIdFileList = []
    this.extRepeatVideoFileList = []
    this.extIgnoreDir = []
    this.filteredFileList = this.getFilteredFileList()

  }
  getFilteredFileList() {
    const repeatTestList = [] // 只存avId
    const resList = []
    this.rawFileList.forEach((filePath) => {
      const pathObj = path.parse(filePath)
      const fileName = pathObj.name // 文件名
      const ext = pathObj.ext // 文件扩展名
      const dir = pathObj.dir // 文件扩展名
      let rawAvId = null
      const ignoreDirRes = filePath.match(regex.ignoreDir)
      if (ignoreDirRes) {
        this.extIgnoreDir.push({
          rawFilePath: filePath, //处理前的文件路径
          rawFileName: fileName, // 处理前的文件名
          ext: ext
        })
        return
      } // 排除过滤文件夹内的文件
      const extMatchRes = ext.match(regex.videoFileExt)
      if (!extMatchRes) {
        this.extNoVideoFileList.push({
          rawFilePath: filePath, //处理前的文件路径
          rawFileName: fileName, // 处理前的文件名
          ext: ext
        })
        return
      } // 过滤非视频文件

      // 从文件名中取出番号 取出的番号 统一大写处理
      const matchRes_1 = fileName.match(regex.avReg_1)
      const matchRes_2 = fileName.match(regex.avReg_2)

      if (matchRes_1) {
        rawAvId = matchRes_1[0].toUpperCase()
      } else if (matchRes_2) {
        rawAvId = `${matchRes_2[1]}-${matchRes_2[2]}`.toUpperCase()
      }

      if (rawAvId) {
        // 检测是不是ab重复文件
        const repeatIndex = repeatTestList.findIndex((item) => {return rawAvId === item})
        if ( repeatIndex > -1) {
          // 发生重复 则不处理所有重名文件
          const repeatIndexInResList = resList.findIndex((item) => {return rawAvId === item.rawAvId})
          if (repeatIndexInResList > -1) {
            this.extRepeatVideoFileList.push({
              rawFilePath: resList[repeatIndexInResList].rawFilePath, //处理前的文件路径
              rawFileName: resList[repeatIndexInResList].rawFileName, // 处理前的文件名
              ext: resList[repeatIndexInResList].ext
            })
            // 删除已经加入最终列表的
            resList.splice(repeatIndexInResList, 1)

          }
          // 加入到重复列表
          this.extRepeatVideoFileList.push({
            rawFilePath: filePath, //处理前的文件路径
            rawFileName: fileName, // 处理前的文件名
            ext: ext
          })
        } else {
          repeatTestList.push(rawAvId)
          resList.push({
            rawAvId: rawAvId,
            rawFilePath: filePath, //处理前的文件路径
            rawFileName: fileName, // 处理前的文件名
            ext: ext,
            rawFileDir: dir
          })
        }
      } else {
        this.extNoAvIdFileList.push({
          rawFilePath: filePath, //处理前的文件路径
          rawFileName: fileName, // 处理前的文件名
          ext: ext
        })
      }
    })
    return resList
  }
  async rename(oldPath, newPath) {
    let flag = true
    debug('改名', oldPath, newPath)
    await renamePro(oldPath, newPath)
      .catch(err => {
        debug('重命名失败', err)
        flag = false
      })
    return flag
  }
}





