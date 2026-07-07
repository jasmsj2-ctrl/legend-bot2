const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    ActivityType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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
        {
            name: 'by y1f_',
            type: ActivityType.Playing
        },
        {
            name: 'made for notify only',
            type: ActivityType.Playing
        }
    ];

    let index = 0;

    client.user.setActivity(
        statuses[0].name,
        {
            type: statuses[0].type
        }
    );

    setInterval(() => {

        index = (index + 1) % statuses.length;

        client.user.setActivity(
            statuses[index].name,
            {
                type: statuses[index].type
            }
        );

    }, 5000);

});
client.on('messageCreate', async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith(prefix)) return;

    if (!message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
    )) return;

    const args = message.content
        .slice(prefix.length)
        .trim()
        .split(/ +/);

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
                        value: data.enabled ? '🟢 يعمل' : '🔴 متوقف'
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

    if (command === 'panel') {

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('📢 ORIX NOTIFY PANEL')
        .setDescription('اختر الإعداد الذي تريد تعديله')
        .addFields(
            {
                name: '🟢 الحالة',
                value: data.enabled ? 'مفعل' : 'معطل',
                inline: true
            },
            {
                name: '📢 الرومات',
                value: `${data.channels.length}`,
                inline: true
            },
            {
                name: '🗑️ حذف الرسالة',
                value: `${data.deleteTime}s`,
                inline: true
            },
            {
                name: '💬 الرسالة',
                value: data.message
            }
        )
        .setFooter({
            text: 'ORIX Notify'
        });

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('notify_enable')
                .setLabel('تشغيل')
                .setEmoji('🟢')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('notify_disable')
                .setLabel('إيقاف')
                .setEmoji('🔴')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId('notify_settings')
                .setLabel('الإعدادات')
                .setEmoji('⚙️')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('notify_channels')
                .setLabel('الرومات')
                .setEmoji('📋')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('notify_addchannel')
                .setLabel('إضافة')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('notify_removechannel')
                .setLabel('حذف')
                .setEmoji('➖')
                .setStyle(ButtonStyle.Danger)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('notify_message')
                .setLabel('الرسالة')
                .setEmoji('💬')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('notify_time')
                .setLabel('مدة الحذف')
                .setEmoji('⏱️')
                .setStyle(ButtonStyle.Secondary)
        );

    return message.reply({
        embeds: [embed],
        components: [row1, row2, row3]
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

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isButton()) return;

    if (!interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
    )) {
        return interaction.reply({
            content: '❌ ليس لديك صلاحية',
            ephemeral: true
        });
    }

    let data = await db.get(`notify_${interaction.guild.id}`) || {
        enabled: false,
        channels: [],
        message: 'لا يوجد رسالة',
        deleteTime: 15
    };

    if (interaction.customId === 'notify_enable') {

        data.enabled = true;

        await db.set(`notify_${interaction.guild.id}`, data);

        return interaction.reply({
            content: '🟢 تم تشغيل النظام',
            ephemeral: true
        });
    }

    if (interaction.customId === 'notify_disable') {

        data.enabled = false;

        await db.set(`notify_${interaction.guild.id}`, data);

        return interaction.reply({
            content: '🔴 تم إيقاف النظام',
            ephemeral: true
        });
    }

    if (interaction.customId === 'notify_settings') {

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                .setTitle('⚙️ إعدادات البوت')
                .addFields(
                    {
                        name: 'الحالة',
                        value: data.enabled ? '🟢 يعمل' : '🔴 متوقف'
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
            ],
            ephemeral: true
        });
    }

    if (interaction.customId === 'notify_channels') {

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                .setTitle('📋 الرومات المحفوظة')
                .setDescription(
                    data.channels?.length
                        ? data.channels.map(id => `<#${id}>`).join('\n')
                        : 'لا يوجد رومات'
                )
            ],
            ephemeral: true
        });
    }

    if (interaction.customId === 'notify_addchannel') {

        return interaction.reply({
            content: 'استعمل مؤقتاً: !addchannel #الروم',
            ephemeral: true
        });
    }

    if (interaction.customId === 'notify_removechannel') {

        return interaction.reply({
            content: 'استعمل مؤقتاً: !removechannel #الروم',
            ephemeral: true
        });
    }

});

client.login(process.env.TOKEN);
