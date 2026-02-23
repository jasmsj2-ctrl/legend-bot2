const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

const mongoose = require("mongoose");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

mongoose.connect(process.env.MONGO_URI);

// ===== Database =====
const userSchema = new mongoose.Schema({
  userId: String,
  money: { type: Number, default: 2000 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  lastDaily: { type: Number, default: 0 },
  warnings: { type: Number, default: 0 }
});
const User = mongoose.model("User", userSchema);

// ===== READY =====
client.once("ready", async () => {
  console.log(`${client.user.tag} Online 🔥`);

  const commands = [

    // Economy
    new SlashCommandBuilder().setName("balance").setDescription("عرض فلوسك"),
    new SlashCommandBuilder().setName("daily").setDescription("مكافأة يومية"),

    // Ticket
    new SlashCommandBuilder().setName("ticket").setDescription("فتح تذكرة دعم"),

    // Admin
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("تحذير عضو")
      .addUserOption(o=>o.setName("user").setDescription("العضو").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
      .setName("warnings")
      .setDescription("عرض تحذيرات عضو")
      .addUserOption(o=>o.setName("user").setDescription("العضو").setRequired(true)),

    new SlashCommandBuilder()
      .setName("timeout")
      .setDescription("إعطاء تايم أوت")
      .addUserOption(o=>o.setName("user").setDescription("العضو").setRequired(true))
      .addIntegerOption(o=>o.setName("minutes").setDescription("بالدقائق").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("طرد عضو")
      .addUserOption(o=>o.setName("user").setDescription("العضو").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("حظر عضو")
      .addUserOption(o=>o.setName("user").setDescription("العضو").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("Commands Registered ✅");
});

// ===== XP SYSTEM =====
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  let data = await User.findOne({ userId: message.author.id });
  if (!data) data = await User.create({ userId: message.author.id });

  data.xp += 10;
  if (data.xp >= data.level * 300) {
    data.level++;
    message.channel.send(`🎉 ${message.author} وصل للمستوى ${data.level}`);
  }
  await data.save();
});

// ===== INTERACTIONS =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // ===== BUTTON CLOSE =====
  if (interaction.isButton()) {
    if (interaction.customId === "close_ticket") {
      await interaction.reply("🔒 سيتم حذف التذكرة بعد 5 ثواني...");
      setTimeout(()=>interaction.channel.delete(),5000);
    }
  }

  // ===== USER DATA =====
  let data = await User.findOne({ userId: interaction.user.id });
  if (!data) data = await User.create({ userId: interaction.user.id });

  // ===== ECONOMY =====
  if (interaction.commandName === "balance")
    return interaction.reply(`💰 فلوسك: ${data.money} | 🎖 لفلك: ${data.level}`);

  if (interaction.commandName === "daily") {
    if (Date.now() - data.lastDaily < 86400000)
      return interaction.reply({content:"⏳ تعال بعد 24 ساعة",ephemeral:true});
    data.money += 2000;
    data.lastDaily = Date.now();
    await data.save();
    return interaction.reply("🎁 استلمت 2000$!");
  }

  // ===== TICKET =====
  if (interaction.commandName === "ticket") {

    const embed = new EmbedBuilder()
      .setTitle("🎫 تذكرة دعم")
      .setDescription("يرجى كتابة مشكلتك وسيتم الرد عليك قريبًا.")
      .setColor("GREY")
      .setFooter({ text: "Legend System" })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("إغلاق التذكرة")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(button);

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: process.env.TICKET_CATEGORY,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: process.env.SUPPORT_ROLE, allow: [PermissionFlagsBits.ViewChannel] }
      ]
    });

    await channel.send({
      content:`<@&${process.env.SUPPORT_ROLE}>`,
      embeds:[embed],
      components:[row]
    });

    return interaction.reply({content:"✅ تم فتح التذكرة",ephemeral:true});
  }

  // ===== ADMIN SYSTEM =====
  const target = interaction.options?.getUser("user");

  if (interaction.commandName === "warn") {
    let userData = await User.findOne({ userId: target.id });
    if (!userData) userData = await User.create({ userId: target.id });
    userData.warnings += 1;
    await userData.save();
    return interaction.reply(`⚠️ تم تحذير ${target} | التحذيرات: ${userData.warnings}`);
  }

  if (interaction.commandName === "warnings") {
    let userData = await User.findOne({ userId: target.id });
    if (!userData) return interaction.reply("لا يوجد تحذيرات");
    return interaction.reply(`📜 تحذيرات ${target}: ${userData.warnings}`);
  }

  if (interaction.commandName === "timeout") {
    const minutes = interaction.options.getInteger("minutes");
    const member = await interaction.guild.members.fetch(target.id);
    await member.timeout(minutes * 60000);
    return interaction.reply(`🔇 تم إعطاء ${target} تايم أوت ${minutes} دقيقة`);
  }

  if (interaction.commandName === "kick") {
    const member = await interaction.guild.members.fetch(target.id);
    await member.kick();
    return interaction.reply(`👢 تم طرد ${target}`);
  }

  if (interaction.commandName === "ban") {
    const member = await interaction.guild.members.fetch(target.id);
    await member.ban();
    return interaction.reply(`🔨 تم حظر ${target}`);
  }
});

client.login(process.env.TOKEN);
