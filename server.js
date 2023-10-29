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
        console.log(SERVER);
    } catch (error) {
        console.log(error)
    }
})

app.listen(process.env.PORT || 3000, ()=>{
    console.log('Listening on port 3000...')
})


app.get('/', async function (req, res) {
    res.end(startTime)
})
