const path = require('path')
const config = require(path.join(process.cwd(), 'config.js'))
const interHandleError = require('./interceptors/handle-error.js')
module.exports = () => {
  const axios = require('axios');
  const axiosOpts = {}
  axiosOpts.headers = {
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
  }
  axiosOpts.timeout = 40000
  if (config.useProxy) {
    const ProxyAgent = require('proxy-agent');
    const proxyHost = config.proxyHost, proxyPort = config.proxyPort;
    const proxyProtocol = config.proxyProtocol
    const proxyOptions = `${proxyProtocol}://${proxyHost}:${proxyPort}`;
    axiosOpts.httpAgent = new ProxyAgent(proxyOptions);
    axiosOpts.httpsAgent = new ProxyAgent(proxyOptions);
  }
  const instance = axios.create(axiosOpts)
  interHandleError(instance)
  return instance;
}
