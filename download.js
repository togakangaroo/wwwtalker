const Promise = require('bluebird')
const request = require('request')
Promise.promisifyAll(request)
const mkdir = Promise.promisify(require('mkdirp'))
const fs = require('fs')
const writeFile = Promise.promisify(fs.writeFile, {context: fs})
Promise.promisifyAll(fs)
const cheerio = require('cheerio')
const co = require('co')

const listSection = 'www-talk.1993q1'
const url = `http://1997.webhistory.org/www.lists/${listSection}/`
const destination = `${process.env.HOME}/wwwtalk/${listSection}`

co(function * () {
    yield mkdir(destination)
    const index = yield request.getAsync(url)
    yield writeFile(`${destination}/index.html`, index.body)

    const $ = cheerio.load(index.body)
    const urls = Array.from( $('li a[href]').map((_, el) => el.attribs.href) )
              .filter(x=> /html$/.test(x))
              .map(file => ({ baseUrl: url, file}))
    const urlIterator = urls[Symbol.iterator]()
    for(let i = 0; i < 10; ++i)
        startNextDownload(urlIterator)
}).then(null, err => console.error(err))

function startNextDownload(it) {
    const { done, value } = it.next()
    if(done) return
    const {baseUrl, file} = value
    const url = `${baseUrl}/${file}`
    const fileDestination = `${destination}/${file}`
    console.log(`download initiated of ${url}`)
    request(url).pipe(fs.createWriteStream(fileDestination))
        .on('finish', () => {
            console.log(`download complete of ${file} to '${fileDestination}'`)
            startNextDownload(it)
        })
}
