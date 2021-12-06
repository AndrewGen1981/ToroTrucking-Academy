const mongoose = require('mongoose')

const form1 = new mongoose.Schema({
    created: { type: Date, default: new Date },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },

    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },

    email: { type: String, lowercase: true, required: true },
    phone: { type: String, required: true },
    DOB: { type: Date, required: true },
    SSN: { type: String, required: true },

    race: { type: String, required: true },
    hispanic: { type: String, required: true },
    disabled: { type: String, required: true },
    veteran: { type: String, required: true },
    sex: { type: String, required: true },

    grade: { type: String, required: true }
}, {
    collection: 'data-collection-forms'
})



function capitalizeText(text) {
    if (!text) { return text }
    return text.charAt(0).toUpperCase() + text.toLowerCase().slice(1)
}



function getForm1Object(body, userEmail) {
    
    if (!userEmail || !body) { return false }

    return {
        firstName: capitalizeText(body['first-name']),
        lastName: capitalizeText(body['last-name']),
        middleName: capitalizeText(body['mid-name']),
        
        street: body.street.toUpperCase(),
        city: body.city.toUpperCase(),
        state: body.state,
        zip: body.zip,
        
        email: userEmail,

        phone: body.phone,
        DOB: body.DOB,
        SSN: body.SSN,
        
        race: body.race != "Other" ? body.race : body.otherRaceChoice,
        hispanic: body.hispanic,
        disabled: body.disabled,
        veteran: body.veteran,
        sex: body.sex,
        
        grade: body.grade,

        updatedAdmin: String,
        updatedDate: Date
    }
}



module.exports = { 
    dataCollectionForm: mongoose.model('form1', form1),
    getForm1Object
}