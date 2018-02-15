#!/usr/bin/env node
'use strict'
process.title = 'hubdated'

const hubdated = require('..')
const fs = require('fs')
const { homedir } = require('os')
const { promisify } = require('util')
const prompt = require('prompt')
const promptGet = promisify(prompt.get)

//
// args
//

let token;
const org = process.argv[2]
const filter = (process.argv[3] || '').split(',').filter(Boolean)

try {
  token = fs.readFileSync(`${homedir()}/.hubdated`, 'utf8')
} catch (_) {}

if (!org) {
  console.error('Usage: hubdated ORG [FILTER]')
  process.exit(1)
}

if (!token) {
  promptGet({
    name: 'token',
    description: `github.com token`,
    required: true,
    hidden: true
  }).then(input => {
    getDated(input.token)
  })
}

//
// go
//
const getDated = (token) => {
  return hubdated({
    token,
    org,
    filter
    // each: console.log
  })
    .then(code => process.exit(code))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })

}

