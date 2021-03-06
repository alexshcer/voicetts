const { Client, Intents, Collection} = require('discord.js');
const fs = require('fs');
const Keyv = require('keyv');

const mIntents = new Intents(Intents.NON_PRIVILEGED);
mIntents.remove(['GUILD_MESSAGE_TYPING', 'DIRECT_MESSAGE_TYPING'])

const client = new Client({ ws: { intents: mIntents}});
client.commands = new Collection();
client.currUsers = [];
const keyv = new Keyv('sqlite://prefix.db')

const { token, defaultPrefix } = require('./config.json')

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.help.name, command);

    console.log(`Loaded ${file}`)
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({activity: { name: 'Ping me or type %help' }, status: 'online' })
});

client.on('message', async (message) => {
    if(message.author.bot) return;
    if(message.channel.type === 'dm') return;

    let prefix = await keyv.get(message.guild.id) || defaultPrefix;
    let mentionRegex = new RegExp(`^<@!?${client.user.id}>`, 'g')

    if(mentionRegex.test(message.content)) {
        prefix = message.content.match(mentionRegex)[0];
        let cmd = message.content.replace(prefix, '');
        if(cmd === '' || cmd === ' ') return client.commands.get('help').run(client, message, undefined);
    }
    if(!message.content.startsWith(prefix)) return;

    let args = message.content.slice(prefix.length).split(' ');
    let commandName = args.shift().toLowerCase();
    
    let command = client.commands.get(commandName)
    try {
        if(command) command.run(client, message, args)
    } catch(e) {
        console.log(e)
    }
    
})

client.on('voiceStateUpdate', (oldState, newState) => {
    let user = client.currUsers.find(user => user.guild === oldState.guild.id);
    if(!user) return;
    if(!newState.channel && newState.id === user.id) {
       return user.collector.stop();
    } else if(!newState.channel && newState.member.id === client.user.id && newState.guild.id === user.guild) {
        return user.collector.stop();
    }
})

client.login(token);