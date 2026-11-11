'use strict'

const config = {}
const DEVOPS_ENV = process.env.VUE_APP_DEVOPS_ENV || 'dev'
const env = require('./' + DEVOPS_ENV + '.js')

Object.assign(config, env)
module.exports = config
