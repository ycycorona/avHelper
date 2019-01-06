const promisify = require('util').promisify
const fs = require('fs')

const renamePro = promisify(fs.rename)

renamePro('./test/test-rename.txt', './test/1.js')
  .then(() => {
    console.log('success')
  })
  .catch(err => {
    console.log(err)
  })
