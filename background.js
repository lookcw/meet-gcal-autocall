chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: 'index.html' });
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if ('name' in alarm && alarm.name.startsWith("https://meet.google.com")) {
    chrome.tabs.create({ url: alarm.name })
    playSound();
    alert('You have a meeting starting now!'); 
  }
})

chrome.alarms.onAlarm.addListener(function (alarm) {
  if ('name' in alarm && alarm.name === "addNextAlarm") {
    addNextAlarm()
  }
});

chrome.alarms.create("addNextAlarm",{periodInMinutes: 1 })


function addNextAlarm() {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {

        let todayFormatted = new Date().toISOString();
        let tomorrowFormatted = addDays(new Date(), 1).toISOString();
        let httpParams = getEventListParams(todayFormatted, tomorrowFormatted)
        let init = getInit(token)

        chrome.identity.getProfileUserInfo(function (info) {
            fetch(getEventListRequestUrl(info.email, httpParams), init)
                .then((response) => response.json())
                .then(function (eventData) {
                    if ('items' in eventData) {
                        datesAndUrls = eventData.items.map(getTimeAndMeetingUrl)
                            .filter(isMeetingToJoin)
                            .filter(isBeforeMeetingStart);
                        if (datesAndUrls.length > 0) {
                            const alarmTime = new Date(datesAndUrls[0]['time']);
                          chrome.alarms.create(datesAndUrls[0]['url'], { when: alarmTime.getTime() });
                            }
                    }
                });
        });
    });
}

function getInit(token) {
    return {
        method: 'GET',
        async: true,
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
        },
        'contentType': 'json'
    };
}

function getEventListParams(todayFormatted, tomorrowFormatted) {
    return {
        'timeMin': todayFormatted,
        'timeMax': tomorrowFormatted,
        'orderBy': 'startTime',
        'singleEvents': true
    }
}


function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

isBeforeMeetingStart = (conferenceItem) => {
    now = new Date()
    return new Date(conferenceItem.time) > now
}

function getEventListRequestUrl(calendarId, params) {
    return `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`
        + '?'
        + new URLSearchParams(params).toString();
}

function isMeetingToJoin(calendarEvent) {
    return Object.keys(calendarEvent).length !== 0;
}


const getTimeAndMeetingUrl = (event) => {
    return 'start' in event && 'hangoutLink' in event ?
        {
            time: event.start.dateTime,
            url: event.hangoutLink
        }
        :
        {}
}

const playSound = () => {
    let url = chrome.runtime.getURL('audio.html');
    url += '?volume=0.5&src=assets/audio/call.mp3&length=20000';

    chrome.tabs.create({
        url: url,
    })

}