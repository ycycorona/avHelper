const fs = require('fs')
const path = require('path')
const url = require('url')
const promisify = require('util').promisify
const cheerio = require('cheerio')

let docStr

fs.readFile('./test/JS-051.html', (err, data) => {
  if (err) throw err;
  docStr = data
  const $ = cheerio.load(docStr)
  const infoDom = $('div.info').children()
  const infoObj = {}
  infoDom.each(function(index, ele) {
    const headerDom = $(this).find('span[class=header]')
    const headerText = headerDom.text()
    console.log(headerText)
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
          genreDom.each(function(index, ele) {
            infoObj.genres.push($(this).text())
          })
        }
        break
      default:
        break
    }
  })
  console.log(infoObj)
})



