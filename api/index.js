import dotenv from "dotenv";
import express  from "express";
import { google } from "googleapis";
import axios from "axios";



dotenv.config({});
const app = express();
const PORT = 3000;
var var_arr = ["Refresh browser"];

const calendar = google.calendar({
    version: "v3",
    auth: process.env.GOOGLE_API_KEY,
});
const scopes = ["https://www.googleapis.com/auth/calendar"];

const auth2Client =  new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);

app.get('/', (req, res) => {
    res.send('GET request to the homepage')
  })

app.get("/google", (req, res)=>{

    const authUrl = auth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
      });

      res.redirect(authUrl);
});

app.get("/google/redirect", async (req, res)=> {
    const code = req.query.code; 
    const { tokens } = await auth2Client.getToken(code);
    auth2Client.setCredentials(tokens);

    res.send({
        msg: "You have succesfully logged in",
    });
});


app.get("/axios", async(req,res)=>{

    res.send(axios.get("https://www.googleapis.com/calendar/v3/calendars/primary/events"));
});


app.get("/list_events", async (req,res) =>{
    //listEvents(auth2Client);
    //res.send(var_arr);
    
    try {
        const calendar2 = google.calendar({ version: 'v3', auth: auth2Client });
        const response = await calendar2.events.list({
            calendarId: 'primary', // or a specific calendar ID
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
            showDeleted: true,
        });

        const events = response.data.items;
        res.json(events);
    } catch (error) {
        console.error('The API returned an error: ' + error);
        res.status(500).send(error.message);
    }
    
      });

      


async function listEvents(auth) {
        const calendar = google.calendar({version: 'v3', auth});
        const res = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
        });
        console.log(res.data);
        const events = res.data.items;
        if (!events || events.length === 0) {
          console.log('No upcoming events found.');
          return;
        }
        console.log('Upcoming 10 events:');
        events.map((event, i) => {
            var_arr.push(event);
          const start = event.start.dateTime || event.start.date;
          console.log(`${start} - ${event.summary}`);
        });
}

app.listen(PORT, ()=>{
    console.log("Server started on port", PORT);
});

