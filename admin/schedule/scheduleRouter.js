const express = require('express')
const schRouter = express.Router()
const path = require('path')

// CONFIG
const admin = require('../config')

// MODELS for mongoose
const { Student, Schedule } = require('../../users/userModel')
const { ScheduleBlocked } = require('./schTemplateModel')
// headers to pass
const spotsArray = ['08:00', '08:45', '09:30', '10:15', '11:00', '12:30', '13:15', '14:00', '14:45', '15:30', '16:15']
const daysOfWeek = ['Mon', 'Tue', 'Wen', 'Thu', 'Fri', 'Sat', 'Sun']


// @GET /schedule
schRouter.get('/', async(req, res) => {
    const locations = Object.values(admin.LOCATION).filter(location => { 
        if(location != admin.LOCATION.All && location != admin.LOCATION.Unset) { 
            return location 
        }
    })
    res.render(path.join(__dirname+'/schedule-center.ejs'), { locations })
})


// TOOL Midleware
async function getCalendarData(req, schType) {
    const date = req.query.date ? new Date(req.query.date) : new Date()

    const calendarTransmission = req.query.calendarTransmission || "AUTO"
    const calendarLocation = req.query.calendarLocation || admin.LOCATION.Tacoma
    // calendar term
    const startDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + 1, 0, 0, 0))
    const endDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + 8, 0, 0, 0))

    const filter = { 
        location: calendarLocation,
        status: "unblock",
        graduate: "no",
    }

    const scheduleBlocked = await ScheduleBlocked.findOne({
        schType,
        schTransmission: calendarTransmission,
        schLocation: calendarLocation
    })
    const blockedArray = scheduleBlocked ? scheduleBlocked.schBlockedDays : []
        
    const students = await Student.find(filter).select('key').populate([
        { 
            path: "user",
            select: "dataCollection",
            populate: {
                path: "dataCollection",
                select: "firstName lastName",
            },
        },
        { path: 'schedule' }
    ])

    // selecting appointments for this period
    const scheduledAppointments = []
    students.forEach(student => {
        if(student.schedule) {
            student.schedule.appointments.forEach(appointment => {
                if(appointment.appDate >= startDate && appointment.appDate <= endDate) {
                    scheduledAppointments.push({
                        appDate: appointment.appDate,
                        appType: appointment.appType,
                        appTransmission: appointment.appTransmission,
                        appLocation: appointment.appLocation,
                        studentNameKey: `${student.user.dataCollection.firstName} ${student.user.dataCollection.lastName} ${student.key}`,
                        studentId: student._id,
                        scheduleId: student.schedule._id,
                        appointmentId: appointment._id,
                    })
                }
            })
        }
    })
    
    return { 
        students, scheduledAppointments,
        startDate, spotsArray, daysOfWeek,
        calendarTransmission, calendarLocation,
        blockedArray, schType
    }
}


// @GET /schedule/backing
// schedule, query ?date="2022-02-24"&calendarTransmission="AUTO"&calendarLocation="Tacoma, WA"
schRouter.get('/backing1', async(req, res) => {
    const dataObj = await getCalendarData(req, "backing1")
    res.render(path.join(__dirname+'/schedule-calendar.ejs'), dataObj)
})
schRouter.get('/backing2', async(req, res) => {
    const dataObj = await getCalendarData(req, "backing2")
    res.render(path.join(__dirname+'/schedule-calendar.ejs'), dataObj)
})
schRouter.get('/backing3', async(req, res) => {
    const dataObj = await getCalendarData(req, "backing3")
    res.render(path.join(__dirname+'/schedule-calendar.ejs'), dataObj)
})
schRouter.get('/city', async(req, res) => {
    const dataObj = await getCalendarData(req, "city")
    res.render(path.join(__dirname+'/schedule-calendar.ejs'), dataObj)
})


// @PUT /schedule
schRouter.put('/', async(req, res) => {
    const { action } = req.body
    try {
        // delete scheduled action
        if (action === "DELETE SCHEDULED") {
            const { studentId, scheduleId, appointmentId, viewStartDate } = req.body
            if (!studentId) { return res.status(400).json({ issue: "Bad student Id" }) }
            if (!scheduleId) { return res.status(400).json({ issue: "Bad schedule Id" }) }
            if (!appointmentId) { return res.status(400).json({ issue: "Bad appointment Id" }) }
            const schedule = await Schedule.findById(scheduleId)
            if (!schedule) { return res.status(404).json({ issue: `Didn't find schedule with Id ${schedule}` }) } 
    
            const newAppointments = schedule.appointments.filter(appointment => {
                if (appointment._id != appointmentId) {
                    return appointment
                }
            })
    
            schedule.appointments = newAppointments
            await schedule.save()
            return res.status(200).end()
        }
        // add to the schedule
        if (action === "ADD TO SCHEDULE") {
            const { studentId, date, type, transmission, location } = req.body
            if (studentId && date && type && transmission && location ) {
                // extracting date and timestamp
                const dateStr = date.split('@')[0]
                const timeStr = date.split('@')[1].split(":")
                const h = parseInt(timeStr[0]) < 10 ? `0${parseInt(timeStr[0])}` : timeStr[0]
                const m = parseInt(timeStr[1]) < 10 ? `0${parseInt(timeStr[1])}` : timeStr[1]
                // creating date value in UTC Z
                const spotData = new Date(`${dateStr}T${h}:${m}Z`)

                const student = await Student.findById(studentId).populate("schedule")
                if (student.schedule) {
                    // check if scheduled appointment exist, if not - add
                    await Schedule.findByIdAndUpdate(
                        student.schedule,
                        { $push: { 
                            appointments: {
                                appDate: spotData,
                                appType: type,
                                appTransmission: transmission,
                                appLocation: location,
                            }
                        }},
                    )
                } else {
                    const schedule = await new Schedule({
                        student: student._id,
                        appointments: [{
                            appDate: spotData,
                            appType: type,
                            appTransmission: transmission,
                            appLocation: location,
                        }]
                    }).save()
                    student.schedule = schedule._id
                    await student.save()
                }
                return res.status(200).end()
            } else { return res.status(400).json({ issue: "Not enough data to save" }) }
        }
        if (action === "BLOCK SCHEDULE CELL") {
            const { column, row, type, transmission, location } = req.body
            if (column && row && type && transmission && location ) {
                const scheduleBlocked = await ScheduleBlocked.findOne({ type, transmission, location })
                if (!scheduleBlocked) {
                    await new ScheduleBlocked({
                        schType: type,
                        schTransmission: transmission,
                        schLocation: location,
                        schBlockedDays: [`${column}:${row}`]      //  "col:row"
                    }).save()
                } else {
                    const cellCoord = `${column}:${row}`
                    if (!scheduleBlocked.schBlockedDays.includes(cellCoord)) {
                        scheduleBlocked.schBlockedDays.push(cellCoord)
                        await scheduleBlocked.save()
                    }
                }
            }
        }
        if (action === "UNBLOCK SCHEDULE CELL") {
            const { column, row, type, transmission, location } = req.body
            if (column && row && type && transmission && location ) {
                const scheduleBlocked = await ScheduleBlocked.findOne({ type, transmission, location })
                if (scheduleBlocked) {
                    if (scheduleBlocked.schBlockedDays) {
                        const newSchBlockedDays = scheduleBlocked.schBlockedDays.filter(schBlockedDay => {
                            if (schBlockedDay != `${column}:${row}`) {
                                return schBlockedDay
                            }
                        })
                        scheduleBlocked.schBlockedDays = newSchBlockedDays
                        await scheduleBlocked.save()
                    }
                }
            }
        }

    } catch(e) {
        return res.status(500).json({ issue: e.message })
    }

    return res.status(400).json({ issue: "Action not found" })

})


module.exports = schRouter