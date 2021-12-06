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

    // @Student part, refrence on STUDENT record ans StudentKey
    key: { type: Number, default: 0 }
}, {
    collection: 'users'
})



module.exports = { 
    User: mongoose.model('userSchema', userSchema)
}

