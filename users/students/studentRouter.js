// Handles all admin/students routes
// used in ADMIN.JS

const express = require('express')
const studentRouter = express.Router()
const path = require('path')

// CONFIG
const admin = require('../../admin/config')

// MODELS for mongoose
const { User, Student, StudentCONFIG, tools } = require('../userModel')
const { Tuition } = require('../tuition/tuitionModel')
const chart = require('../../admin/adminProfileCharts')


// @Middleware
function ifCanRead (req, res, next) {
    // check Admin's Auth - if can READ
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'read')) {
        return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "read" })
    } else { next() }
}
function ifCanWrite (req, res, next) {
    // check Admin's Auth - if can WRITE
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "write" })
    } else { next() }
}
function ifCanReadOrInstructor (req, res, next) {
    // check Admin's Auth - if INSTRUCTOR
    const adminId = req.session.userId

    if (admin.checkAdminsAuth(adminId, 'read')) { return next() }
    if (admin.checkAdminsAuth(adminId, 'instructor')) { return next() }

    return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "read or instructor" })
}


// @Students ROUTES

// tool to get students for INs
    async function getStudentsForINs(date, location) {
        const studentPopulated = 'key TTT clocks location'
        const userPopulated = 'dataCollection'
        const dataCollPopulated = 'firstName lastName middleName' 
        const scoringPopulated = 'scoringsInCab scoringsOutCab scoringsBacking scoringsCity'

        const filter = location === admin.LOCATION.All ? { status: 'unblock' } : { status: 'unblock', location }

        let students

        try {
            students = await Student.find(filter).select(studentPopulated).populate([
                {
                    path: 'user', select: userPopulated,
                    populate: { path: 'dataCollection', select: dataCollPopulated }
                },
                {
                    path: 'scoring', select: scoringPopulated
                }
            ]).sort({"location" : 1, "key": 1})
        } catch(e) {
            console.log(`Error on getting students fot INs list: ${e.message}`)
            return []
        }

        let inStudents = []
        const today = tools.getDatePrefix(date).toString()

        students.map(student => {
            let todayClocks = student.clocks.filter(clock => { return clock.key == today })
            if (todayClocks.length) {
                student.clocks = todayClocks
                inStudents.push(student)
            }
        })

        return inStudents
    }
// 


// INs route is a root one
studentRouter.get('/', ifCanReadOrInstructor, async (req, res) => {
    const adminProfile = admin.findAdminById(req.session.userId)
    const inStudents = await getStudentsForINs(new Date(), adminProfile.location)
    res.render(path.join(__dirname+'/INs.ejs'), { inStudents, today: true })
})

// INs route for not today's date
studentRouter.post('/', ifCanReadOrInstructor, async (req, res) => {
    const { clockedAsOf } = req.body
    if (!clockedAsOf) {
        // date to retrieve not passed, just redirecting to ordinary GET INs
        return res.status(400).redirect('/admin/student')
    }

    const date = `${clockedAsOf}T00:00:00-08:00`
    const adminProfile = admin.findAdminById(req.session.userId)
    const inStudents = await getStudentsForINs(new Date(date), adminProfile.location)
    const today = tools.getDatePrefix(new Date(date)).toString() === tools.getDatePrefix(new Date()).toString()

    res.render(path.join(__dirname+'/INs.ejs'), { inStudents, today, date })
})



// Student List populate constants
const studentPopulated = 'key email TTT created status location'
const userPopulated = 'token payments'
const studentListPopulate = [
    {
        path: 'user', select: userPopulated,
        populate: { path: 'dataCollection', select: 'firstName lastName middleName street city state zip phone DOB SSN' }
    },
    {
        path: 'user', select: userPopulated, 
        populate: { path: 'agreement', select: 'program class transmission visiting tuitionCost regisrFee supplyFee otherFee payment thirdPartyList schoolSignDate schoolSignRep updatedAdmin updatedDate' }
    },
    {   path: 'tuition', select: 'isAllowed avLessonsRate'  },
    {   path: 'scoring', select: 'isAllowed scoringsInCab scoringsOutCab scoringsBacking scoringsCity'  }
]


// @GET admin/student/list
studentRouter.get('/list', ifCanReadOrInstructor, async(req, res) => {
    // get admin
    const adminProfile = admin.findAdminById(req.session.userId)
    // filter to find Students due to LOCATION: All - can see All, else - only assigned to location + UNSET
    const defaulLocationFilter = adminProfile.location === admin.LOCATION.All ? {} : { location: [adminProfile.location, admin.LOCATION.Unset] }

    // location can be passed in a query
    const requestedLocation = req.query.location
    let requestedLocationFilter = {}    // All as default
    if (requestedLocation) {
        if (requestedLocation != admin.LOCATION.All) {  // if not All, then specify
            requestedLocationFilter = { location: requestedLocation }
        }
    }

    // 'shownLocation' is a parament to set locations selected property to what was realy shown
    const shownLocation = requestedLocation ? requestedLocation : adminProfile.location
   
    const filter = requestedLocation ? requestedLocationFilter : defaulLocationFilter
    const students = await Student.find(filter).select(studentPopulated).populate(studentListPopulate)
    res.render(path.join(__dirname+'/student-list.ejs'), { students, adminProfile, shownLocation, locations: admin.LOCATION })
})

// for showing a shorter Student List variants, for exapmle when click on admin-profile-chart-columns
studentRouter.get('/shortlist', ifCanReadOrInstructor, async(req, res) => {
    const year = req.query.year
    const month = req.query.month
    const location = req.query.location
    if(year && month && location) {
        // TOOL: leading zero
        function leadingZero(n) { return n < 10 ? `0${n}` : `${n}` }
        // calculating period for request
        const n1 = chart.monthNames.indexOf(month) + 1
        const n2 = (n1 + 1) % 12
        // receiving start-year and end-year
        const startYear = parseInt(year)
        const endYear = startYear + Math.trunc((n1 + 1) / 12)
        // receiving start-date and end-date
        const startDate = `${startYear}-${leadingZero(n1)}-01T00:00:00Z`
        const endDate = `${endYear}-${leadingZero(n2)}-01T00:00:00Z`
        // defining admin and searching Students
        const adminProfile = admin.findAdminById(req.session.userId)
        if (adminProfile.location === admin.LOCATION.All || location === admin.LOCATION.Unset || location === adminProfile.location) {
            const students = await Student.find(
                {
                    created: { $gte: startDate, $lte: endDate },
                    location
                }
            ).select(studentPopulated).populate(studentListPopulate)
            return res.render(path.join(__dirname+'/student-list.ejs'), { students, adminProfile, shownLocation: adminProfile.location, locations: admin.LOCATION })
        }
    }
    res.redirect('/admin/profile')
})



// @POST admin/student/new/id
studentRouter.post('/new/:id', ifCanWrite, async(req, res) => {
    // auth is good
    const userId = req.params.id    // receiving user _id from posting form
    
    try {
        const user = await User.findById(userId)    // finds a user with given _id
        if (!user) { return res.status(404).send(`Cannot find user with id: ${userId}`) }

        // Only 1 student can be assigned to 1 user, let's check maybe there is already Student with given user._id
        const existingStudent = await Student.findOne({ user: userId })
        if (existingStudent) { return res.status(500).send(`This user is a student alredy, key is ${existingStudent.key}`) }

        // working with Student-List cofigurations - receiving 
        const studentConfigurations = await StudentCONFIG.findOne({ configType: 'student-list' })
        const lastStudentKey = studentConfigurations.lastStudentKey + 1
        await StudentCONFIG.updateOne({ configType: 'student-list' }, { lastStudentKey })

        // creating a new Student
        const student = await new Student({
            key: lastStudentKey,
            email: user.email,
            user: userId
        }).save()
        
        // saving backlink in a User model on new Student
        user.student = student._id
        await user.save()

        // creating new Tuition record for this Student
        const tuition = await new Tuition({
            key: lastStudentKey,
            email: user.email,
            student_id_string: student._id
        }).save()
        // saving ref in Student for its lessons
        student.tuition = tuition._id
        await student.save()

    } catch(e) {
        return res.status(500).send(`Issue when saving a new sudent: ${e.message}`)
    }

    res.status(200).redirect('/admin/user-area')     // ok, redirecting to users area
})



// Updates Location
studentRouter.post('/update-location', ifCanWrite, async(req, res) => {
    const {userId, studentId, location} = req.body
    if (!userId || !studentId || !location) {
        return res.status(404).send(`Location updating isssue: ${userId}, ${studentId}, ${location}`)
    }
    try {
        const student = await Student.findById(studentId)
        if (!student) {
            return res.status(404).send(`Cannot find student with ID: ${studentId}`)
        }
        if (student.location != location) {
            student.location = location
            await student.save()
        }
        res.redirect(`/admin/user/${userId}?activatetab=4`)
    } catch(e) {
        return res.status(500).send(`Location updating isssue: ${e.message}`)
    }
})


// Updates Learning Center Access
studentRouter.get("/allow-tuition/:id", ifCanWrite, async(req, res) => {    // Allows tuition for an existing Student
    // auth is good
    const studentId = req.params.id    // receiving student _id from client-side
    const student = await Student.findById(studentId).select(["key", "email", "user", "tuition"])

    if (studentId && student) {
        try {
            let tuition = await Tuition.findOne({ student_id_string: studentId })
            // doing the next NOT depending if student has a tuition record already or not. Because records can be not mutually referred
            // double check if there is not tuition record for this student
            if (tuition) {     //  if there is a tuition record for this student
                student.tuition = tuition._id
            } else {    //  if there is NO tuition record for this student
                // creating new Tuition record for this Student
                tuition = await new Tuition({
                    key: student.key,
                    email: student.email,
                    student_id_string: student._id
                }).save()
                // saving ref in Student for its lessons
                student.tuition = tuition._id
            }
            await student.save()
            return res.status(200).redirect(`/admin/user/${student.user}?activatetab=4`)
        } catch(e) {
            return res.status(500).send(`Server issue: ${e.message}`)
        }
    }
    return res.status(400).send(`Cannot find Student with id: ${studentId}`)
})


studentRouter.get("/change-tuition-access/:id", ifCanWrite, async(req, res) => { // Forbids tuition for an existing Student
    // auth is good
    const studentId = req.params.id    // receiving student _id from client-side
    const action = req.query.action
    const student = await Student.findById(studentId).select(["user", "tuition"])
    
    if (student) {
        if (student.tuition) {
            const tuition = await Tuition.findById(student.tuition).select("isAllowed")
            if (tuition) {
                if (action === 'enable') { tuition.isAllowed = true }
                if (action === 'disable') { tuition.isAllowed = false }
                if (action === 'enable' || action === 'disable') {
                    try {
                        await tuition.save()
                        return res.status(200).redirect(`/admin/user/${student.user}?activatetab=4`)
                    } catch(e) {
                        return res.status(500).send(`Cannot save tuition record: ${e.message}`)
                    }
                }
            }
            return res.status(404).end()
        }
    }
    return res.status(400).send(`Cannot find Student with id: ${studentId}`)
})


// @POST admin/student/print-bulk-qr
studentRouter.post('/print-bulk-qr', ifCanRead, (req, res) => {
    // BULK QRs printing
    let { qrsToPrint, qrsNamesToPrint, qrsKeysToPrint, qrsClassesToPrint } = req.body

    if(!Array.isArray(qrsToPrint)) { 
        qrsToPrint = [qrsToPrint]
        qrsNamesToPrint = [qrsNamesToPrint]
        qrsKeysToPrint = [qrsKeysToPrint]
        qrsClassesToPrint = [qrsClassesToPrint]
    }

    res.render(path.join(__dirname+'/qr_bulk-print.ejs'), { qrsToPrint, qrsNamesToPrint, qrsKeysToPrint, qrsClassesToPrint })
})


// @GET admin/student/skills-test
// ?TTT=100
studentRouter.get('/skills-test', ifCanRead, async (req, res) => {
    const minTTT = req.query.TTT || 100
    try {
        const students = await Student
            .where("TTT").gte(parseFloat(minTTT))
            .where("status").equals("unblock")
            .select("key TTT created location")
            .populate([
                { 
                    path: "user", populate: {
                        path: "dataCollection", select: "firstName lastName middleName DOB phone"
                    }
                },
                { 
                    path: "user", populate: {
                        path: "application", select: "vehicle-license"
                    }
                },
                { 
                    path: "user", select: "balance payments", populate: {
                        path: "agreement", select: "class transmission tuitionCost regisrFee supplyFee otherFee"
                    }
                },
                { path: "tuition", select: "avLessonsRate" },
                { path: "scoring", select: "scoringsInCab scoringsOutCab scoringsBacking scoringsCity" }
        ]).sort({location: 1, TTT: -1})
        res.status(200).render(path.join(__dirname+"/skills-test.ejs"), { students, minTTT })
    } catch(e) {
        res.status(500).send(`Server issue: ${e.message}`)
    }
})



module.exports = studentRouter