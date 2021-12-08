const mongoose = require('mongoose')

// Bringing Models to setup backlinks on other models
// this approach makes search faster
const { dataCollectionForm } = require('./applicants/form1Model')     // FORM1 Model
const { applicationForm } = require('./applicants/form2Model')     // FORM2 Model
const { agreementForm } = require('./applicants/form3Model')     // FORM3 Model


// @HOW TO USE:
// const appl = await User.findOne({ email: req.session.userId })
//     .populate('dataCollection')
//     .populate('application')
//     .populate('agreement')
//     .populate('student')


// @UserSchema for mongoose
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, lowercase: true, required: true },
    password: { type: String, required: true },
    created: { type: Date, default: new Date },
    lastSESS: { type: Date, default: new Date },
    token: { type: String, default: "not sent" },

    // @Applicant part, refrences on FORMS
    dataCollection: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: dataCollectionForm
    },
    application: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: applicationForm
    },
    agreement: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: agreementForm
    },
    student: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Student'
    },

    // @Student part, refrence on STUDENT record ans StudentKey
    key: { type: Number, default: 0 }
}, {
    collection: 'users'
})



// __CONFIG collection is user for configurations
const configSchema = new mongoose.Schema({
    configType: { type: String, required: true },
    lastStudentKey: Number      // autoINC pre.save
}, {
    collection: "__CONFIG"
})


const studentSchema = new mongoose.Schema({
    key: { type: Number, required: true },
    email: { type: String, required: true },
    created: { type: Date, default: new Date() },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'userSchema'
    },

    TTT: { type: Number, default: 0 },
    clocks: [ { type: mongoose.SchemaTypes.ObjectId, ref: 'clocksSchema' } ]
}, {
    collection: "Student List"
})


// Schema for Clocks
const clocksSchema = new mongoose.Schema({
    student: { type: mongoose.SchemaTypes.ObjectId, ref: 'Student' },
    clocks: [ Date ],       // array of Date-Times
    lon: [ Number ],        // array of logntitudes
    lat: [ Number ],        // array of latitudes
    loc: [ String ],        // array of locations

    next: { type: mongoose.SchemaTypes.ObjectId, ref: 'clocksSchema' }
}, {
    collection: "Clocks"
})



module.exports = { 
    User: mongoose.model('userSchema', userSchema),
    Student: mongoose.model('Student', studentSchema),
    StudentCONFIG: mongoose.model('StudentCONFIG', configSchema),
    Clocks: mongoose.model('clocksSchema', clocksSchema),
}

