// Handles all admin/students routes
// used in ADMIN.JS

const express = require('express')
const studentRouter = express.Router()
const path = require('path')


// MODELS for mongoose
const { User, Student, StudentCONFIG } = require('../userModel')

// do I need this here?
// const { dataCollectionForm } = require('../applicants/form1Model')
// const { applicationForm } = require('../applicants/form2Model')
// const { agreementForm } = require('../applicants/form3Model')



// @Students ROUTES

studentRouter.get('/', (req, res) => {
    res.send('Student Data')
})


// @POST admin/student/new/id

studentRouter.post('/new/:id', async (req, res) => {
    // next code is for creating a new STUDENT

    const userId = req.params.id    // receiving user _id from posting form
    
    try {
        const user = await User.findById(userId)    // finds a usere with given _id

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
        
        // // saving backlink in a User model on new Student
        user.student = student
        await user.save()

    } catch(e) {
        return res.status(500).send(`Issue when saving a new sudent: ${e.message}`)
    }

    res.status(200).redirect('/admin/user-area')     // ok, redirecting to users area
})



module.exports = studentRouter