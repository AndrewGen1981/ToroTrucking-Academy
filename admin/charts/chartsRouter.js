const express = require("express")
const admin = require('../config')
const path = require('path')

const charts = require("../adminProfileCharts")

const chartsRouter = express.Router()



chartsRouter.get('/AR', async (req, res) => {
    const chartData = await charts.accountsReceivableChart()
    if(chartData.result && chartData.data) {
        res.render(path.join(__dirname+'/accountsReceivable.ejs'), { locationsData: chartData.data })
    } else {
        res.status(404).send(chartData.message)
    }
})


module.exports = chartsRouter