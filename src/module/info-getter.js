const puppeteer = require('puppeteer');
const debug = require('debug')('info-getter')
const debug_getVideoInfoByAvId = require('debug')('info-getter:getVideoInfoByAvId')
const url = require('url')
const axios = require('./request')
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const filenamify = require('filenamify')
const dataList = []

class InfoGetter {
  constructor(baseUrl, whiteHostList, requestFileList, browser) {
    this.baseUrl = baseUrl
    this.whiteHostList = whiteHostList
    this.requestFileList = requestFileList
    this.browser = browser
  }

  parseHtmlGetInfo(docStr, avId) {
    try {
      const infoObj = {}
      const $ = cheerio.load(docStr)
      const containerDom = $('.container')
      infoObj.title = containerDom.find('h3').text()
      if (!infoObj.title) {throw new Error(`获取${avId}影片标题失败，获取停止！`)}
      infoObj.coverHref = containerDom.find('a.bigImage').attr('href') || ''
      const infoDom = $('div.info').children()
      infoDom.each(function (index, ele) {
        const headerDom = $(this).find('span[class=header]')
        const headerText = headerDom.text()
        switch (headerText) {
          case '識別碼:':
            infoObj.avId = headerDom.next().text()
            break
          case '發行日期:':
            infoObj.releaseDate = $(this).contents().filter((index, content) => {
              return content.nodeType === 3
            }).text().trim()
            break
          case '長度:':
            infoObj.length = $(this).contents().filter((index, content) => {
              return content.nodeType === 3
            }).text().trim().match(/\d+/)[0]
            break
          case '導演:':
            infoObj.director = headerDom.next().text().trim()
            break
          case '製作商:':
            infoObj.maker = headerDom.next().text().trim()
            break
          case '發行商:':
            infoObj.producer = headerDom.next().text().trim()
            break
          case '系列:':
            infoObj.series = headerDom.next().text().trim()
            break
          case '演員':
            infoObj.actressList = []
            const actressDom = $(this).next().next()
            actressDom.each(function (index, ele) {
              infoObj.actressList.push($(this).find('a').text())
            })
            break
          case '':
            if ($(this).hasClass('header') && $(this).text() === '類別:') {
              infoObj.genres = []
              const genreDom = $(this).next().children()
              genreDom.each(function (index, ele) {
                infoObj.genres.push($(this).text())
              })
            }
            break
          default:
            break
        }
      })
      infoObj.flag = true
      return infoObj
    } catch (e) {
      debug(e)
      return {
        flag : false,
      }
    }
  }
  async getVideoInfoByAvId(avId) {
    const page = await this.browser.newPage();
    await page.goto(`${this.baseUrl}${avId}`, {timeout: 20000, waitUntil: ['domcontentloaded']}).catch(e => {
      debug(e)
    })
    const pageDocStr = await page.mainFrame().content() // 获取目标页面的html,对静态页面直接本地操作解析比较好，如果是动态页面，则通过 page.evaluate在chrome内操作数据
/*    fs.writeFile(`./test/${avId}.html`, pageDocStr, (err) => {
      if (err) debug('写入html',err)
      console.log(`./test/${avId}.html 写入成功`);
    })*/
    const pageData = this.parseHtmlGetInfo(pageDocStr, avId)
    /*const pageData = await page.evaluate(() => {
      try {
        const containerDom = document.querySelector('.container')
        const divInfoDom = containerDom.querySelector('div.info')
        const coverHref = containerDom.querySelector('a.bigImage').href

        const newAvId = divInfoDom.children[0].children[1].innerText
        const producer = divInfoDom.children[5].children[1].innerText
        let series = ''
        try {
          series = divInfoDom.children[6].children[1].innerText
        } catch (e) {
          console.log('获取series失败', e)
        }

        const title = containerDom.querySelector('h3').innerText
        const actorDom = divInfoDom.lastElementChild.querySelector('.genre a')
        const actor = actorDom ? actorDom.innerText : '' //todo: 第一个演员
        return {
          flag : true,
          coverHref,
          title,
          newAvId,
          actor,
          producer,
          series
        }
      } catch (e) {
        return {
          flag : false,
          msg: e.message
        }
      }
    })*/
    await page.close()
    if (pageData.flag) {
      pageData.title = filenamify(pageData.title, {replacement: ' '}) // 剔除文件名中的非法字符
      return pageData
    } else {
      debug_getVideoInfoByAvId(pageData.msg)
      return null
    }
  }
  async saveCover(fileInfo) {
    const savePath = path.join(fileInfo.rawFileDir, fileInfo.videoInfo.title + '.jpg')
    const response = await axios({
      method: 'get',
      url: fileInfo.videoInfo.coverHref,
      responseType: 'stream'
    })
      .catch((err) => {
        if (err.request) {
          console.log(err.message, err.request._headers)
        } else {
          console.log(err)
        }
      })
    if (response) {
      // 一张张获取图片，失败或者保存成功后会resolve()
      await new Promise((resolve, reject) => {
        const resData = response.data
        const ws = fs.createWriteStream(savePath)
        resData.on('error', (error) => {
          debug(`保存失败`, error)
          resolve()
        })
        resData.on('end', () => {
          debug(`${savePath} 保存成功`)
          resolve()
        })
        resData.pipe(ws)
      })
    }
  }
  async closeBrowser() {
    await this.browser.close()
  }
}

module.exports = async (baseUrl, whiteHostList, requestFileList, chromeOptions) => {
  const browser = await puppeteer.launch(chromeOptions)
  // 关闭不相关的页面
  browser.on('targetcreated', async (target) => {
    const page = await target.page()
    if (page) {
      debug(`打开新页面${page.url()}`)
      let flag = false
      const host = url.parse(page.url()).host
      for (let i=0; i<whiteHostList.length; i++) {
        if (host.match(whiteHostList[i]) || host === 'blank') {
          flag = true
          break
        }
      }
      if (! flag) {
        page.close()
        debug(`关闭广告等弹出页面！`)
      }
    }
  })
  browser.on('targetchanged', async (target) => {
    debug(`页面地址改变 ${target.url()}`)
  })
  return new InfoGetter(baseUrl, whiteHostList, requestFileList, browser)
}
