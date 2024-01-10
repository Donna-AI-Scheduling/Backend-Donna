
/*
const express = require("express");
const app = express();
const cors = require('cors');
app.use(express.json());
app.use(cors());

app.get("/", (req, res)=> {
    const name = req.query.user;
    res.send(name + "!");
});

app.listen(4000, ()=>{
    console.log("sever started at 4000");
});


const calendar = require('./googleCalendar');

app.get('/events', async (req, res) => {
    try {
        let response = await calendar.events.list({
            calendarId: 'primary', // or the specific calendar ID
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });
        res.json(response.data.items);
    } catch (error) {
        res.status(500).send(error);
    }
});

*/



const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const mysql = require('mysql');

const app = express();
app.use(bodyParser.json());

// Configure Google Calendar API credentials
const credentials = require('./credentials.json');
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Configure MySQL database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'your_database'
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

// Authenticate with Google Calendar API
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

// Handle OAuth2 callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    res.redirect('/import');
  } catch (error) {
    console.error('Error authenticating with Google:', error);
    res.status(500).send('Error authenticating with Google');
  }
});

// Import calendar events into the database
app.get('/import', async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;
    for (const event of events) {
      const { id, summary, start, end } = event;
      const sql = 'INSERT INTO events (id, summary, start, end) VALUES (?, ?, ?, ?)';
      db.query(sql, [id, summary, start.dateTime, end.dateTime], (err) => {
        if (err) {
          console.error('Error inserting event into database:', err);
        }
      });
    }

    res.send('Calendar events imported successfully');
  } catch (error) {
    console.error('Error importing calendar events:', error);
    res.status(500).send('Error importing calendar events');
  }
});

// Retrieve imported events from the database
app.get('/events', (req, res) => {
  const sql = 'SELECT * FROM events';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error retrieving events from database:', err);
      res.status(500).send('Error retrieving events from database');
    } else {
      res.json(results);
    }
  });
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

