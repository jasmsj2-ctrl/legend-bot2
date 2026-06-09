const {
Client,
GatewayIntentBits,
PermissionsBitField,
EmbedBuilder,
ActivityType
} = require('discord.js');

const { QuickDB } = require('quick.db');
const db = new QuickDB();

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

const prefix = '!';

client.once('ready', () => {


console.log(`${client.user.tag} جاهز`);

const statuses = [
    { name: 'by y1f_', type: ActivityType.Playing },
    { name: 'made for notify only', type: ActivityType.Playing }
];

let index = 0;

client.user.setActivity(statuses[0].name, {
    type: statuses[0].type
});

setInterval(() => {

    index = (index + 1) % statuses.length;

    client.user.setActivity(statuses[index].name, {
        type: statuses[index].type
    });

}, 5000);


});

client.on('messageCreate', async (message) => {


if (message.author.bot) return;
if (!message.guild) return;
if (!message.content.startsWith(prefix)) return;

if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return;

const args = message.content.slice(prefix.length).trim().split(/ +/);
const command = args.shift().toLowerCase();

let data = await db.get(`notify_${message.guild.id}`) || {
    enabled: false,
    channels: [],
    message: 'لا يوجد رسالة',
    deleteTime: 15
};

if (command === 'setchannel') {

    const channels = message.mentions.channels.map(c => c.id);

    if (!channels.length) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                .setTitle('❌ خطأ')
                .setDescription('!setchannel #welcome #rules')
            ]
        });
    }

    data.channels = channels;

    await db.set(`notify_${message.guild.id}`, data);

    return message.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('✅ تم الحفظ')
            .setDescription(`تم حفظ ${channels.length} روم`)
        ]
    });
}

if (command === 'addchannel') {

    const channel = message.mentions.channels.first();

    if (!channel) return;

    if (!data.channels.includes(channel.id)) {
        data.channels.push(channel.id);
    }

    await db.set(`notify_${message.guild.id}`, data);

    return message.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('✅ تمت الإضافة')
            .setDescription(`${channel}`)
        ]
    });
}

if (command === 'removechannel') {

    const channel = message.mentions.channels.first();

    if (!channel) return;

    data.channels = data.channels.filter(
        id => id !== channel.id
    );

    await db.set(`notify_${message.guild.id}`, data);

    return message.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('✅ تم الحذف')
            .setDescription(`${channel}`)
        ]
    });
}

if (command === 'setmessage') {

    const text = args.join(' ');

    if (!text) return;

    data.message = text;

    await db.set(`notify_${message.guild.id}`, data);

    return message.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('✅ تم تحديث الرسالة')
        ]
    });
}

if (command === 'setdelete') {

    const seconds = Number(args[0]);

    if (!seconds || seconds < 1 || seconds > 300) return;

    data.deleteTime = seconds;

    await db.set(`notify_${message.guild.id}`, data);

    return message.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('✅ تم تحديث مدة الحذف')
            .setDescription(`${seconds} ثانية`)
        ]
    });
}

if (command === 'enable') {

    data.enabled = true;

    await db.set(`notify_${message.guild.id}`, data);

    return message.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('🟢 تم التفعيل')
        ]
    });
}

if (command === 'disable') {

    data.enabled = false;

    await db.set(`notify_${message.guild.id}`, data);

    return message.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('🔴 تم التعطيل')
        ]
    });
}

    if (command === 'settings') {

        return message.reply({
            embeds: [
                new EmbedBuilder()
                .setTitle('⚙️ إعدادات البوت')
                .addFields(
                    {
                        name: 'الحالة',
                        value: data.enabled ? '🟢 يعمل' : '🔴 متوقف عن العمل'
                    },
                    {
                        name: 'الرومات',
                        value: data.channels?.length
                            ? data.channels.map(id => `<#${id}>`).join('\n')
                            : 'غير محدد'
                    },
                    {
                        name: 'مدة الحذف',
                        value: `${data.deleteTime} ثانية`
                    },
                    {
                        name: 'الرسالة',
                        value: data.message
                    }
                )
            ]
        });
    }


});

client.on('guildMemberAdd', async (member) => {

    const data = await db.get(`notify_${member.guild.id}`);

    if (!data) return;
    if (!data.enabled) return;
    if (!data.channels?.length) return;

    for (const channelId of data.channels) {

        const channel = member.guild.channels.cache.get(channelId);

        if (!channel) continue;

        const msg = await channel.send(
            `${member} ${data.message}`
        );

        setTimeout(() => {
            msg.delete().catch(() => {});
        }, data.deleteTime * 1000);
    }
});

client.login(process.env.TOKEN);
