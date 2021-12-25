// @TUITION Center

// Handles all user/tuition routes
// used in userRouter.JS with DEFAUL authentication

const express = require('express')
const tuitionRouter = express.Router()
const path = require('path')

// MODELS for mongoose
const { Tuition } = require('./tuitionModel')

const fs = require('fs')

// YouTube Lessons
const listOfLessons = [
    // first 10
    "PpFhqMl8uH8",    "LaChnXdNWug",
    "1vv4ovcc4nI",    "8YT_fbC4YKM",
    "VbsTb_EQ6a4",    "Uh9Sm-3jyN8",
    "-rMifxK7W6U",    "1mni_COEQfg",
    "PGRC3JBi6_k",    "RysouiVzvl4",
    // 11-20
    "OvUrTesyTUI",    "bMd5R18WWDs",
    "HaQ1CMXb9qY",    "mlqemX2v1Gc",
    "30ejX843HfI",    "guGK9h3u6G0",
    "9qCpGGMhU0A",    "v11pYxt5wFk",
    "2kyPEhTJiz8",    "fzwLgmRNHS8",
]


// user/tuition
tuitionRouter.get('/', (req, res) => {
    res.render(path.join(__dirname+'/tuition-center.ejs'), { listOfLessons })
})


tuitionRouter.post('/', (req, res) => {
    
    const video = req.body.video    // video id is being passed in body

    const testFileName = listOfLessons.indexOf(video) + 1   // try to find id in vidoe IDs array
    if (testFileName) {
        const testFilePath = testFileName < 10 ? `0${testFileName}.json` : `${testFileName}.json`   //  adding '0' to filename ans extention
        fs.readFile(path.join(__dirname+`/tuition-tests/${testFilePath}`), (err, data) => {     // adding folder to a path
            if (err) {
                res.status(500).send(`Cannot open test file ${testFilePath}`)       //  show error msg if needed
            } else {
                const videoData = JSON.parse(data)
                videoData.questions.map(que => {    // shufling answers options inside question
                    if (!que.fixedOrder) {      // if not fixed order is required
                        que.answers = que.answers.sort(() => Math.random() - 0.5);   // shuffeling answers
                    }
                })

                res.render(path.join(__dirname+'/tuition-player.ejs'), { 
                    videoData,
                    video
                })
            }
        })
    }
})


module.exports = tuitionRouter