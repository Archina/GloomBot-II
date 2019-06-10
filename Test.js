IRC = require('irc-framework')

const fs = require('fs')

const commands = {
    ban: (channel, banmask) => `/mode #${channel} +b ${banmask}`,
    unban: (channel, banmask) => `/mode #${channel} -b ${banmask}`
}


// Definitions

const fileName = 'tomato.json'

function getQueuedBois() {
	if(fs.existsSync(fileName)){
		return JSON.parse(fs.readFileSync(fileName))
	}
	return []
}

function setQueuedBois(data) {
	fs.writeFileSync(fileName, JSON.stringify(data))
}

function queueUnban(name, minutes) {
	let queuedBois = getQueuedBois();
	queuedBois = [
		...queuedBois,
		{
            target: name,
			expiration: new Date(Date.now() + minutes*60000).toISOString()
		}
	]
	setQueuedBois(queuedBois)
}

function handleQueued(handler) {
	let queuedBois = getQueuedBois()
	let oldBois = []
	let boisToUnban = []
	queuedBois.forEach(x => {
		if(x.expiration < (new Date()).toISOString()) {
			boisToUnban.push(x)
		} else {
			oldBois.push(x)
		}
	})
    console.warn(`Removing ${boisToUnban.length} entries from queuedBois`)
    boisToUnban.forEach(boi => {
        handler(boi)
    })
	setQueuedBois(oldBois)
}

// Actual Bot

var bot = new IRC.Client();
bot.connect({
    host: 'irc.rizon.net',
    port: 6667,
    nick: 'Spargurtbot'
});

//Every 5 minutes
setInterval(() => {
    handleQueued()
}, boi => {
    bot.unban(boi.target)
}, 60000 * 5)
 
bot.on('message', function(event) {
  	if (event.message.indexOf('hello') === 0) {
  		  event.reply('Hi!');
  	}
  	
  	if (event.message.match(/^!join /)) {
  	    var to_join = event.message.split(' ');
  		event.reply('Joining ' + to_join[1] + '..');
  		bot.join(to_join[1]);
      }
      
    if (event.message.match(/^!timeout ([1-9]\d*) (\w+)/)) {
        let args = event.message.match(/^!timeout ([1-9]\d*) (\w+)/);
        const timeFrame = args[1];
        const target = args[2];
        // use names to identify who is who https://stackoverflow.com/questions/8188599/detect-if-irc-user-is-a-voice-or-higher-c-irc-bot
        // event.nick holds who issued the command. the issuer has to be higher in rang than the target
        console.warn(event); //event.target holds the channel with preceeding hash
        // bot.whois(target, input => {
        //     console.warn(input);
        //     event.reply(`Banning ${target}(*@${input.hostname}) for ${timeFrame} minutes...`);
        //     setTimeout(() => {
        //         event.reply(`Lifting ban for ${target}(*@${input.hostname})`);
        //     }, timeFrame*1000*60);
        // });
        //removeListener name callback
        bot.on('userlist', event => {
            console.warn(event.users.map(x => x.modes))
            //bot.ban(target)
            queueUnban(target, timeFrame*1000*60)
        })
        bot.raw('NAMES', event.target);
    }
});
 
// Or a quicker to match messages...
bot.matchMessage(/^hi/, function(event) {
    event.reply('hello there!');
});