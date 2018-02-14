#!/usr/bin/env node
'use strict'
process.title = 'hubdated'

const hubdated = require('..')
const fs = require('fs')
const { homedir } = require('os')

//
// args
//

let token = process.env.TOKEN
const org = process.argv[2]
const filter = (process.argv[3] || '').split(',').filter(Boolean)

if (!token) {
  try {
    token = fs.readFileSync(`${homedir()}/.hubdated`, 'utf8')
  } catch (_) {}
}

if (!token || !org) {
  console.error('Usage: TOKEN=xxx hubdated ORG [FILTER]')
  process.exit(1)
}

//
// go
//

hubdated({
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
