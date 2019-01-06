const axios = require('../src/module/request')
const fs = require('fs')
axios({
  method: 'get',
  url: `https://pics.javbus.com/cover/3qr9_b.jp`,
  responseType: 'stream'
})
  .then(function(response) {
    const rs = response.data
    const ws = fs.createWriteStream('./1.jpg')
    rs.pipe(ws)
  })
  .catch((err) => {
    console.log(err.message, err.request._headers)
  })
