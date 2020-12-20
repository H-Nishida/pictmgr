const express = require('express')
const serveIndex = require('serve-index');
const session = require('express-session')
const passwordProtected = require('express-password-protect')
const path = require('path')
const app = express()
const port = 3000
const PHOTO_SRC_DIR = "/Volumes/disk1/photos"
const MAIN_PAGE = "/static/viewer.html"
const config = {
    username: "admin",
    password: "feif9f8ug33"
}

app.use(passwordProtected(config))
app.post('/', (req, res) => { res.sendStatus(200)})
app.use('/static', express.static(path.join(__dirname, 'frontend', 'public')))
app.get('/', function (req, res) {res.redirect(MAIN_PAGE)})
app.use('/photos', express.static(PHOTO_SRC_DIR))
app.use('/photos', serveIndex(PHOTO_SRC_DIR, {'icons': true})); 
app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})


