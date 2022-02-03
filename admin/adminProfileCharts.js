// get LOCATION from CONFIG
const { LOCATION } = require('./config')
const { User, Student } = require('../users/userModel')

// Constants for charts
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


async function newStudentsInvolvingChart(deltaMonth) {
    // preparing Start Date, deltaMonth is a period in month
    const date = new Date()
    // current Year and start Year
    const currentYear = date.getFullYear()
    const startYear = currentYear - Math.trunc(deltaMonth / 12)
    // current month and start Month
    const month = date.getMonth()
    const startMonth = month + 1 + deltaMonth % 12
    // leading zero
    const textStartDate = startMonth > 9 ? `${startYear}-${startMonth}-01T00:00:00+00:00` : `${startYear}-0${startMonth}-01T00:00:00+00:00`
    const startDate = new Date(textStartDate)       // all dates are in 0-timezone in Mongo
    // getting students due criterias 
    const students = await Student.where("created").gt(startDate).select("created location")
    // results to return
    let analyticsArray = []
    // initing: LOCATION to array and locationValues will be 0 array with the same length as LOCATION
    const locations = Object.values(LOCATION)
    // creating blank array with correct item names
    for (let i=0; i <= deltaMonth; i++){
        let index = (month + i) % 12     // aIndex can be greater than monthNames length
        let year = startYear + Math.trunc((month + i) / 12)
        analyticsArray.push({  // correct item names
            month: monthNames[index],
            year,
            newStudents: 0,
            locations,      // works like a pointer!!! if 1 element will change, each will change in entire array !!!
            locationValues: locations.map(l => {return 0})      // cannot !!! assign some constant here, IT WILL work like a POINTER!!!
        })
    }
    // filling in blank array with data
    students.map(student => {
        let created = new Date(student.created)
        let i = (created.getFullYear() - startYear)*12 + created.getMonth() + 1 - startMonth
        analyticsArray[i].newStudents += 1
        let loc = locations.indexOf(student.location)
        if (loc > -1) {
            analyticsArray[i].locationValues[loc] += 1
        }
    })
    return analyticsArray
}


module.exports = {
    newStudentsInvolvingChart,
    monthNames
}