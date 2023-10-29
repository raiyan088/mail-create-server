const puppeteer = require('puppeteer')
const express = require('express')
const axios = require('axios')
const fs = require('fs')



let startTime = new Date().toUTCString()


const app = express()


process.argv.slice(2).forEach(function (data, index) {
    try {
        let SERVER = ''
        if (data.length == 1) {
            SERVER = 'gmail_0'+data
        } else {
            SERVER = 'gmail_'+data
        }
        console.log(SERVER)
    } catch (error) {
        console.log(error)
    }
})


app.listen(process.env.PORT || 3000, ()=>{
    console.log('Listening on port 3000...')
})

startBrowser()

async function startBrowser() {
    try {
        let browser = await puppeteer.launch({
            headless: true,
            //headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-skip-list',
                '--disable-dev-shm-usage'
            ]
        })
    
        let page = (await browser.pages())[0]
    
        page.on('dialog', async dialog => dialog.type() == "beforeunload" && dialog.accept())
        
        console.log('Browser Start')
    } catch (error) {
        console.log(error)
    }
}

app.get('/', async function (req, res) {
    res.end(startTime)
})
