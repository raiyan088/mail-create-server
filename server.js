const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const puppeteer = require('puppeteer-extra')
const express = require('express')
const axios = require('axios')
const fs = require('fs')


let mPrevLog = ''
let mStart = 0
let mLoginFailed = false
let mLogStart = false
let mArrowUp = true
let browser = null
let page = null
let mPrevCookie = {}
let SERVER = ''

let startTime = new Date().toUTCString()

let BASE_URL = Buffer.from('aHR0cHM6Ly9kYXRhYmFzZTA4OC1kZWZhdWx0LXJ0ZGIuZmlyZWJhc2Vpby5jb20vcmFpeWFuMDg4L2dtYWlsLw==', 'base64').toString('ascii')

let loginUrl = 'https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fcolab.research.google.com%2Fdrive%2F15-JjAPthL3BxKJbvONVkQmGUxox-328G&ec=GAZAqQM&ifkv=AVQVeywxh6y4_WIE0MDR0rgdX-zq-dVw_5JlyI40eMGfPdYPrn0ax8ghA0BlXIfYbZNrWur_L03t&passive=true&flowName=GlifWebSignIn&flowEntry=ServiceLogin&dsh=S-1677059645%3A1698307841046563&theme=glif'

const app = express()

puppeteer.use(StealthPlugin())

process.argv.slice(2).forEach(function (data, index) {
    try {
        if (data.length == 1) {
            SERVER = 'gmail_0'+data
        } else {
            SERVER = 'gmail_'+data
        }
        readCookies()
    } catch (error) {
        console.log(error)
    }
})

app.listen(process.env.PORT || 3000, ()=>{
    console.log('Listening on port 3000...')
})

async function readCookies() {
    let response = await getAxios(BASE_URL+'server/'+SERVER+'.json')

    try {
        startBrowser(response.data)
    } catch (error) {
        console.log(error)
    }
}

async function startBrowser(data) {
    try {
        mStart = new Date().getTime()+3600000

        console.log('Start:', mStart)

        browser = await puppeteer.launch({
            //executablePath: 'C:\\Users\\Hp 11 GENERATION\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
            //headless: false,
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-skip-list',
                '--disable-dev-shm-usage'
            ]
        })
    
        page = (await browser.pages())[0]

        page.on('console', msg => {
            try {
                if(msg.text().startsWith('Failed to load resource')) {
                    mLoginFailed = true
                }
            } catch (error) {}
        })
    
        page.on('dialog', async dialog => dialog.type() == "beforeunload" && dialog.accept())
        
        console.log('Browser Start')

        if (data['cookies']) {
            let cookies = []
            let temp = JSON.parse(fs.readFileSync('./cookies.json'))

            temp.forEach(function (value) {
                if (value.name == 'SSID') {
                    value.value = data['cookies']['SSID']
                    mPrevCookie[value.name] = value.value
                } else if (value.name == 'SAPISID') {
                    value.value = data['cookies']['SAPISID']
                    mPrevCookie[value.name] = value.value
                } else if (value.name == 'SID') {
                    value.value = data['cookies']['SID']
                    mPrevCookie[value.name] = value.value
                } else if (value.name == '__Secure-1PSID') {
                    value.value = data['cookies']['1PSID']
                    mPrevCookie['1PSID'] = value.value
                } else if (value.name == 'HSID') {
                    value.value = data['cookies']['HSID']
                    mPrevCookie[value.name] = value.value
                }
                cookies.push(value)
            })

            await page.setCookie(...cookies)
            await page.goto('https://colab.research.google.com/drive/15-JjAPthL3BxKJbvONVkQmGUxox-328G', { waitUntil: 'load', timeout: 0 })
        } else {
            mLoginFailed = true
        }

        if (mLoginFailed) {
            console.log('Gmail Not Login')
            await logInGmail(data['data'])
        }
        
        await waitForSelector('colab-connect-button')

        console.log('Load Success')

        let hasConnected = await checkConnected()

        if (hasConnected) {
            console.log('--------RDP already Used--------')
            await waitForDisconnected()
            console.log('--------RDP Disconnected Success--------')
        }

        await page.keyboard.down('Control')
        await page.keyboard.press('Enter')
        await page.keyboard.up('Control')
        await waitForSelector('mwc-dialog[class="wide"]')
        await delay(1000)
        await page.keyboard.press('Tab')
        await delay(200)
        await page.keyboard.press('Tab')
        await delay(200)
        await page.keyboard.press('Enter')
        await checkConnected()

        console.log('--------RDP Connected Success--------')

        while (true) {
            mPrevLog = ''
            mLogStart = false
            await delay(10000)
            await waitForFinish()
            console.log('--------RDP Process Completed--------')
            await delay(5000)
            await waitForDisconnected()
            await delay(2000)
            console.log('--------RDP Disconnected Success--------')
            await page.goto('https://colab.research.google.com/drive/15-JjAPthL3BxKJbvONVkQmGUxox-328G', { waitUntil: 'load', timeout: 0 })
            await waitForSelector('colab-connect-button')
            await delay(2000)
            await saveCookies()
            mArrowUp = true
            await page.keyboard.down('Control')
            await page.keyboard.press('Enter')
            await page.keyboard.up('Control')
            await waitForSelector('mwc-dialog[class="wide"]')
            await delay(1000)
            await page.keyboard.press('Tab')
            await delay(200)
            await page.keyboard.press('Tab')
            await delay(200)
            await page.keyboard.press('Enter')
            await checkConnected()
            console.log('--------RDP Connected Success--------')
        }
    } catch (error) {
        console.log(error)
    }
}

async function logInGmail(data) {

    try {
        await page.goto(loginUrl, { waitUntil: 'load', timeout: 0 })
        await delay(500)
        await page.waitForSelector('#identifierId')
        await page.type('#identifierId', data['user'])
        await page.waitForSelector('#identifierNext')
        await page.click('#identifierNext')

        let status = await waitForLoginStatus()
        if (status == 1) {
            await delay(2000)
            await page.waitForSelector('input[type="password"]')
            await page.type('input[type="password"]', data['pass'])
            await page.waitForSelector('#passwordNext')
            await page.click('#passwordNext')

            let status = await waitForLoginSuccess(false)

            if (status == 4) {
                await delay(2000)
                await page.click('div[data-challengetype="12"]')
                status = await waitForLoginSuccess(true)
                if (status == 5) {
                    await page.type('#knowledge-preregistered-email-response', data['recovery']+'@gmail.com')
                    await delay(500)
                    await page.click('button[class="VfPpkd-LgbsSe VfPpkd-LgbsSe-OWXEXe-k8QpJ VfPpkd-LgbsSe-OWXEXe-dgl2Hf nCP5yc AjY5Oe DuMIQc LQeN7 qIypjc TrZEUc lw1w4b"]')
                    await delay(2000)
                    status = await waitForLoginSuccess(false)
                }
            }
            
            if (status == 1) {
                console.log('Login Success')
                await delay(5000)
                await saveCookies()
            } else {
                console.log('Password Status:', status)

                console.log('\n')
                console.log('----------PROCESS EXIT----------')
                process.exit(0)
            }
        } else {
            console.log('Login Status:', status)

            console.log('\n')
            console.log('----------PROCESS EXIT----------')
            process.exit(0)
        }
    } catch (error) {
        console.log(error)

        console.log('\n')
        console.log('----------PROCESS EXIT----------')
        process.exit(0)
    }
}

async function waitForLoginStatus() {
    let status = 0
    let timeout = 0
    while (true) {
        timeout++
        if (timeout >= 50) {
            status = 0
            break
        }
        await delay(500)

        try {
            let pageUrl = await page.evaluate(() => window.location.href)
            
            if (pageUrl) {
                if (pageUrl.startsWith('https://accounts.google.com/v3/signin/identifier')) {
                    let captcha = await page.waitForRequest(req => req.url())
                    if (captcha.url().startsWith('https://accounts.google.com/Captcha')) {
                        status = 9
                        break
                    }

                } else if (pageUrl.startsWith('https://accounts.google.com/v3/signin/challenge/pwd') || pageUrl.startsWith('https://accounts.google.com/signin/v2/challenge/pwd')) {
                    status = 1
                    break
                } else if (pageUrl.startsWith('https://accounts.google.com/v3/signin/rejected')) {
                    status = 2
                    break
                } else if (pageUrl.startsWith('https://accounts.google.com/v3/signin/challenge/dp')) {
                    status = 3
                    break
                } else if (pageUrl.startsWith('https://accounts.google.com/signin/v2/challenge/selection')) {
                    status = 4
                    break
                } else if(pageUrl.startsWith('https://accounts.google.com/signin/v2/challenge/pk/presend')) {
                    status = 5
                    break
                }
            }
        } catch (error) {
            break
        }
    }
    return status
}

async function waitForLoginSuccess(selection) {
    let status = 0

    while (true) {

        await delay(2000)

        try {
            let pageUrl = await page.evaluate(() => window.location.href)
            
            if (pageUrl.startsWith('https://myaccount.google.com/') || pageUrl.startsWith('https://colab.research.google.com/')) {
                status = 1
                break
            } else if (pageUrl.startsWith('https://gds.google.com/web/chip')) {
                status = 1
                break
            } else if (pageUrl.startsWith('https://accounts.google.com/') && pageUrl.includes('challenge') && pageUrl.includes('pwd')) {
                let wrong = await page.evaluate(() => {
                    let root = document.querySelector('div[class="OyEIQ uSvLId"] > div')
                    if (root) {
                        return true
                    }
                    return false
                })

                if (wrong) {
                    status = 2
                    break
                }
            } else if (pageUrl.startsWith('https://accounts.google.com/') && pageUrl.includes('challenge') && pageUrl.includes('ipp') && pageUrl.includes('collec')) {
                status = 3
                break
            }  else if (pageUrl.startsWith('https://accounts.google.com/') && pageUrl.includes('challenge') && pageUrl.includes('selection')) {
                status = 4
                break
            }  else if (selection) {
                if (pageUrl.startsWith('https://accounts.google.com/') && pageUrl.includes('challenge') && pageUrl.includes('kpe')) {
                    let data = await page.evaluate(() => {
                        let root = document.querySelector('#knowledge-preregistered-email-response') 
                        if (root) {
                            return true
                        }
                        return false
                    })
    
                    if (data) {
                        status = 5
                        break
                    }
                }
            } else {
                try {
                    let OSID = 0
                    let cookies = await page.cookies()
    
                    for (let i = 0; i < cookies.length; i++) {
                        if (cookies[i]['name'] == 'SSID') {
                            OSID++
                        } else if (cookies[i]['name'] == 'HSID') {
                            OSID++
                        } else if (cookies[i]['name'] == 'APISID') {
                            OSID++
                        }
                    }
    
                    if (OSID == 3) {
                        status = 1
                        break
                    }
                } catch (error) {}
            }
        } catch (error) {}
    }

    return status
}

async function waitForFinish() {
    let time = 0
    while (true) {
        await delay(3000)
        time += 3
        try {
            let check = await page.evaluate(() => {
                let root = document.querySelector('[aria-label="Run cell"]')
                if (root) {
                    let status = root.shadowRoot.querySelector('#status')
                    if (status) {
                        return true
                    }
                }
                return false
            })

            if (check) {
                break
            } else {
                if (time >= 60) {
                    time = 0
                    if(mArrowUp) {
                        mArrowUp = false
                        await page.keyboard.press('ArrowDown')
                    } else {
                        mArrowUp = true
                        await page.keyboard.press('ArrowUp')
                    }
                }
                
                let data = await page.evaluate(() => {
                    let root = document.querySelector('colab-static-output-renderer')
                    if (root) {
                        return root.innerText
                    }
                    return null
                })

                if (data) {
                    if (data.includes('------------START GMAIL CREATE PROCESS------------')) {
                        mLogStart = true
                    }
                    
                    if (mLogStart) {
                        let log = data.replace(mPrevLog, '').trimStart().trimEnd()
                        if (log.length > 5) {
                            console.log(log)
                        }
                        mPrevLog = data
                    }
                }
            }
        } catch (error) {}
    }
}

async function waitForDisconnected() {
    await page.click('#runtime-menu-button')
    for (var j = 0; j < 9; j++) {
        await delay(50)
        await page.keyboard.press('ArrowDown')
    }
    await delay(420)
    await page.keyboard.down('Control')
    await page.keyboard.press('Enter')
    await page.keyboard.up('Control')
    await waitForSelector('mwc-dialog[class="yes-no-dialog"]')
    await delay(500)
    await page.keyboard.press('Enter')
    await delay(2000)
}

async function saveCookies() {
    let cookies = await page.cookies()
        
    let mSend = {}

    for (let i = 0; i < cookies.length; i++) {
        let name = cookies[i]['name']
        if (name == 'SID' || name == 'SSID' || name == 'HSID' || name == 'SAPISID') {
            mSend[name] = cookies[i]['value']
        } else if (name == '__Secure-1PSID') {
            mSend['1PSID'] = cookies[i]['value']
        }
    }

    await putAxios(BASE_URL+'server/'+SERVER+'/cookies.json', JSON.stringify(mSend), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
}

async function checkConnected() {
    let timeout = 0
    let connected = false

    while (true) {
        await delay(1000)
        const value = await page.evaluate(() => {
            let colab = document.querySelector('colab-connect-button')
            if(colab) {
                let display = colab.shadowRoot.querySelector('#connect-button-resource-display')
                if (display) {
                    let ram = display.querySelector('.ram')
                    if (ram) {
                        return ram.shadowRoot.querySelector('.label').innerText
                    }
                } else {
                    let connect = colab.shadowRoot.querySelector('#connect')
                    if (connect) {
                        return connect.innerText
                    }
                }
            }
            return null
        })

        if (value) {
            timeout++

            if (value != 'Connect') {
                connected = true
                break
            }
        }

        if (timeout >= 5) {
            break
        }
    }

    if (connected) {
        while (true) {
            await delay(3000)
            const value = await page.evaluate(() => {
                let colab = document.querySelector('colab-connect-button')
                if(colab) {
                    let display = colab.shadowRoot.querySelector('#connect-button-resource-display')
                    if (display) {
                        let ram = display.querySelector('.ram')
                        if (ram) {
                            let output = ram.shadowRoot.querySelector('.label').innerText
                            if(output) {
                                return 'RAM'
                            }
                        }
                    } else {
                        let connect = colab.shadowRoot.querySelector('#connect')
                        if (connect) {
                            return connect.innerText
                        }
                    }
                }
                return null
            })
    
            if (value && (value == 'Busy' || value == 'RAM')) {
                break
            } else {
                let waiting = await page.evaluate(() => {
                    let root = document.querySelector('colab-status-bar')
                    if (root) {
                        let status = root.shadowRoot.querySelector('div[class="connect-status"]')
                        if (status) {
                            if (status.innerText.includes('Waiting to finish the current execution')) {
                                return true
                            }
                        }
                    }
                    return false
                })

                if (waiting) {
                    let data = await page.evaluate(() => {
                        let root = document.querySelector('colab-static-output-renderer')
                        if (root) {
                            return root.innerText
                        }
                        return null
                    })
    
                    if (data) {
                        if (data.includes('------------START GMAIL CREATE PROCESS------------')) {
                            mLogStart = true
                        }
                        
                        if (mLogStart) {
                            let log = data.replace(mPrevLog, '').trimStart().trimEnd()
                            if (log.length > 5) {
                                console.log(log)
                            }
                            mPrevLog = data
                        }
                    }
                }
            }
        }    
    }

    return connected
}


async function waitForSelector(element) {
    while (true) {
        await delay(1000)
        try {
            let data = await exists(element)
            if (data) {
                break
            }
        } catch (error) {}
    }
}


async function exists(evement) {
    return await page.evaluate((evement) => {
        let root = document.querySelector(evement)
        if (root) {
            return true
        }
        return false
    }, evement)
}

async function getAxios(url) {
    let loop = 0
    let responce = null
    while (true) {
        try {
            responce = await axios.get(url, {
                timeout: 10000
            })
            break
        } catch (error) {
            loop++
            console.log('Responce Error: '+loop)

            if (loop >= 5) {
                break
            } else {
                await delay(3000)
            }
        }
    }
    return responce
}


async function putAxios(url, body, data) {
    let loop = 0
    let responce = null
    while (true) {
        try {
            data.timeout = 10000
            responce = await axios.put(url, body, data)
            break
        } catch (error) {
            loop++
            console.log('Responce Error: '+loop)

            if (loop >= 5) {
                break
            } else {
                await delay(3000)
            }
        }
    }
    return responce
}

function delay(time) {
    return new Promise(function(resolve) {
        setTimeout(resolve, time)
    })
}


app.get('/', async function (req, res) {
    res.end(startTime)
})
