// @ADMIN configuration file
// contains credentials & a list of authorities


// LIST of Authorities
const AUTH = {
    viewOnly: 1,
    editor:   2,
    admin:    3
}

const canREADset = [AUTH.viewOnly, AUTH.editor, AUTH.admin]
const canWRITEset = [AUTH.editor, AUTH.admin]
const canSHAREset = [AUTH.admin]

// LIST of Auth names
const AUTHNAMES = [ 'viewOnly', 'editor', 'admin' ]


// Array of admins
const PROFILES = [
    { id: "BigG0001", name: "BigG Admin", title: "admin", email: "alphafleetacc@gmail.com", location: 'SEATTLE', password: process.env.BIGG0001_PASS, auth: AUTH.admin },
    { id: "Mike0001", name: "Mike Svoboda", title:'admin', email: "newsoundcdl@gmail.com", location: 'TEST', password: process.env.MIKE0001_PASS, auth: AUTH.editor },

    { id: "Ryan0001", name: "Ryan Kling", title:'president', email: "ryan@torocdl.com", location: 'PACIFIC', password: process.env.RYAN0001_PASS, auth: AUTH.editor },
    { id: "Aziz0001", name: "Aziz", title:'manager', email: "Azo2008@gmail.com", location: 'PACIFIC', password: process.env.AZIZ0001_PASS, auth: AUTH.editor },

    { id: "Mariana0001", name: "Mariana Bulgaru", title:'manager', email: "nwcdlschool@gmail.com", location: 'PACIFIC', password: process.env.MARIANA0001_PASS, auth: AUTH.editor },
    { id: "Salazar0001", name: "Michelle Salazar", title:'manager', email: "tacoma@torocdl.com", location: 'PACIFIC', password: process.env.SALAZAR0001_PASS, auth: AUTH.editor },

    { id: "Littleton0001", name: "Robert Littleton", title:'manager', email: "robert@torocdl.com", location: 'KENT', password: process.env.LITTLETON0001_PASS, auth: AUTH.editor }
]


// Variants of issues
const ISSUES = {
    wrongIDPASS: "Wrong admin's ID or PASSWORD provided"
}

function findAdminById(id) {
    return PROFILES.find(admin => admin.id.toUpperCase() === id.toUpperCase())
}

function checkAdminsAuth(id, auth) {
    const admin = findAdminById(id)
    if (!admin) { return false }

    if (auth === 'read') {
        return canREADset.includes(admin.auth)
    } else {
        if (auth === 'write') {
            return canWRITEset.includes(admin.auth)
        } else {
            if (auth === 'share') {
                return canSHAREset.includes(admin.auth)
            }   // share
        }   // write
    }   // read

    return false    // all other requests
}


// INIT
PROFILES.map(profile => {
    profile.authString = AUTHNAMES[profile.auth - 1]
})

module.exports = {
    PROFILES,
    ISSUES,
    findAdminById,
    checkAdminsAuth
}