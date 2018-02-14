'use strict'

const got = require('gh-got')
const semver = require('semver')
const semverDiff = require('semver-diff')
const assert = require('assert')

//
// helper fns
//

const unique = (el, i, arr) => arr.indexOf(el) === i

const ghIterator = (url, token) => {
  let page = 1
  let ended = false
  let buf = []
  return async () => {
    if (!buf.length && !ended) {
      const { body, headers: { link } } = await got(`${url}?page=${page}`, {
        token
      })
      buf = body
      if (link) {
        const match = /\?page=([^>])>; rel="next"/.exec(link)
        if (match) [, page] = match
        else ended = true
      } else {
        ended = true
      }
    }
    return buf.shift()
  }
}

const getAllDependencies = pkg =>
  Object.values(pkg.dependencies || {})
    .concat(Object.values(pkg.devDependencies || {}))
    .concat(Object.values(pkg.peerDependencies || {}))
    .concat(Object.values(pkg.optionalDependencies || {}))
    .filter(unique)

const parseGitHubDependencies = org => dep => {
  const match = new RegExp(`^(?:github:)?${org}/([^/]+)#v(.+)$`).exec(dep)
  if (!match) return
  return { repo: match[1], tag: match[2] }
}

const printResults = out => {
  console.log(`# ${out.repo}`)
  console.log(``)
  for (const diff of ['major', 'minor', 'patch', 'other']) {
    if (out[diff].length) {
      console.log(`## ${diff}`)
      console.log(``)
      for (const dep of out[diff]) {
        console.log(`- [ ] ${dep.repo}: ${dep.from} ~> ${dep.to}`)
      }
      console.log(``)
    }
  }
}

const packageJSONCache = {}

const getPackageJSON = async (org, repo, token) => {
  if (packageJSONCache[repo]) return packageJSONCache[repo]
  const res = await got(`repos/${org}/${repo}/contents/package.json`, { token })
  const { body: { content, encoding } } = res
  const buf = Buffer.from(content, encoding)
  const pkg = JSON.parse(buf.toString())
  packageJSONCache[repo] = pkg
  return pkg
}

//
// main
//

const hubdated = async ({ token, org, filter = [], each = () => {} }) => {
  assert(token, '.token required')
  assert(org, '.org required')

  console.log(``)
  let code = 0

  let repo
  const read = ghIterator(`orgs/${org}/repos`, token)
  while ((repo = await read())) {
    let pkg
    try {
      pkg = await getPackageJSON(org, repo.name, token)
    } catch (_) {
      continue
    }
    const deps = getAllDependencies(pkg)
      .map(parseGitHubDependencies(org))
      .filter(Boolean)
    const out = {
      dated: false,
      repo: repo.full_name,
      major: [],
      minor: [],
      patch: [],
      other: []
    }
    for (const dep of deps) {
      if (filter.length && !filter.find(f => dep.repo.includes(f))) {
        continue
      }
      const { version: latest } = await getPackageJSON(org, dep.repo, token)
      if (semver.gt(latest, dep.tag)) {
        const diff = semverDiff(dep.tag, latest)
        const bucket = out[diff] || out.other
        bucket.push({ repo: dep.repo, from: dep.tag, to: latest })
        out.dated = true
        code = 1
      }
    }
    if (out.dated) {
      printResults(out)
      each({
        repo: out.repo,
        deps: out.major
          .concat(out.minor)
          .concat(out.patch)
          .concat(out.other)
      })
    }
  }
  if (code === 0) {
    console.log(
      `  All ${
        filter.length ? 'selected ' : ''
      }dependencies up to date. Great job!`
    )
    console.log(``)
  }
  return code
}

module.exports = hubdated
