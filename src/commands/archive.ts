import {
	//type BaseCommandInteraction,
	type Message,
	//MessageButton,
	//type MessageComponentInteraction,
	type TextBasedChannel,
	//type ThreadChannel,
	//type User,
	//type Snowflake,
  type Collection,
} from "discord.js";

import { SlashCommandBuilder } from "@discordjs/builders";
import { type CommandInteraction, GuildMember, Permissions, InteractionCollector, MessageEmbed } from "discord.js";
import { interactionReply, getMessage, getThreadAuthor } from "../helpers/messageHelpers";
import type { NeedleCommand } from "../types/needleCommand";
import { S3 } from 'aws-sdk';
import { PutObjectRequest } from "aws-sdk/clients/s3";
import { fakeUser, archiveThread } from './../helpers/utils';
import { fetchThread } from './tags';

export const command: NeedleCommand = {
	name: "archive",
	shortHelpDescription: "Archive thread to S3",
	longHelpDescription: "Archive thread to S3",

  async getSlashCommandBuilder() {
		return new SlashCommandBuilder()
			.setName("archive")
			.setDescription("Archive thread to S3")
			.toJSON();
	},

	async execute(interaction: CommandInteraction): Promise<void> {

		const member = interaction.member;
		if (!(member instanceof GuildMember)) {
			return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
		}

		const channel = interaction.channel;
		if (!channel?.isThread()) {
			return interactionReply(interaction, getMessage("ERR_ONLY_IN_THREAD", interaction.id));
		}

		const hasArchivingPermissions = member
			.permissionsIn(channel)
			.has(Permissions.FLAGS.MANAGE_THREADS, true);

		if (hasArchivingPermissions) {
			
      console.log ('archiving...');

      const messages = await getChannelMessages(channel);
      const startMsg = await getThreadStartMessage(channel);

      if (messages?.size == 0 || !startMsg) {
        return interactionReply(interaction, 'No messages in thread or parent msg deleted.');
      }

      let threadData: any = {};
      threadData.name = channel.name;
      if (process.env.ARCHIVE_ANONYMIZE === 'true') {
        threadData.name = `Needle - ${channel.id}`;
      }
      threadData.guildName = channel.guild.name;
      threadData.guildIcon = channel.guild.icon;
      threadData.id = channel.id;
      threadData.key = channel.guild.id + '/' + channel.id;
      threadData.messageCount = channel.messageCount;
      threadData.memberCount = channel.memberCount;
      threadData.messages = [];

      let involvedUsers = { count: 0 };

      messages?.forEach((msg) => {
        console.log(msg.content);
        console.log(msg);
        //console.log(JSON.stringify(msg.reactions,null,2));
        let isSolution = false;
        msg.reactions.cache.forEach((r) => {
          console.log(r);
          if (r.emoji.name === process.env.ARCHIVE_SOLUTION_EMOJI_NAME) isSolution = true;
        });
        //console.log(msg);
        //msg.reactions.
        if (msg.content) {
          let xmsg = msgFromMessage(msg, involvedUsers);
          if (isSolution) xmsg.isSolution = true;
          threadData.messages.push(xmsg);
        }
      });
      //console.log(`channel`, channel);
      threadData.messages.push(msgFromMessage(startMsg, involvedUsers));

      threadData.messages.sort((a: any, b: any) => {
        if (a.created > b.created) return 1;
        return -1;
      });

      //await saveToS3(threadData);
      await archiveThread(threadData);

      console.log ('archiving done.');
			return interactionReply(interaction, ':thumbsup:');
		}

		await interactionReply(interaction, "Nothing done.");
	},
};

function msgFromMessage(discMsg: Message | null, involvedUsers: any) {
  let msg: any = {};
  if (!discMsg) return msg;
  msg.id = discMsg.id;
  msg.created = discMsg.createdTimestamp;
  msg.type = discMsg.type;
  msg.system = discMsg.system;
  msg.content = discMsg.content;
  msg.author = {
    id: discMsg.author.id,
    username: discMsg.author.username,
    avatar: `https://cdn.discordapp.com/avatars/${discMsg.author.id}/${discMsg.author.avatar}.png?size=80`,
    discrim: discMsg.author.discriminator
  };
  if (process.env.ARCHIVE_ANONYMIZE === 'true') {
    if (!involvedUsers[discMsg.author.id]) {
      involvedUsers.count += 1;
      involvedUsers[discMsg.author.id] = fakeUser();
    }
    msg.author = involvedUsers[discMsg.author.id];
  }
  if (discMsg.attachments) {
    discMsg.attachments.forEach((attach) => {
      console.log('****************** ATTACHED');
      console.log(attach.url, attach.size, attach.contentType);
      msg.attachments = msg.attachments || [];
      msg.attachments.push({
        url: attach.url,
        size: attach.size,
        contentType: attach.contentType
      });
    });
  }
  if (discMsg.embeds) {
    discMsg.embeds.forEach((embed) => {
      console.log('****************** EMBED ************');
      console.log(embed.url, embed.image, embed.thumbnail);
      msg.embeds = msg.embeds || [];
      msg.embeds.push({
        url: embed.url,
        image: embed.image,
        thumbnail: embed.thumbnail
      });
    });
  }
  return msg;
}

async function getChannelMessages(channel: TextBasedChannel): Promise<Collection<String, Message<boolean>> | undefined> {
	const messages = await channel.messages.fetch({ limit: 100 });
	return messages;
}

async function getThreadStartMessage(channel: TextBasedChannel): Promise<Message | null> {
  if (!channel?.isThread()) { return null; }
	if (!channel.parentId) { return null; }

	const parentChannel = await channel.guild?.channels.fetch(channel.parentId);
	if (!parentChannel?.isText()) { return null; }
	// The thread's channel ID is the same as the start message's ID,
	// but if the start message has been deleted this will throw an exception
	return parentChannel.messages
		.fetch(channel.id)
		.catch(() => null);
}
/*
async function saveToS3(threadData: any): Promise<boolean> {
  const s3 = new S3({
    accessKeyId: process.env.S3_API_KEY,
    secretAccessKey: process.env.S3_API_SECRET
  });

  const threadTags = await fetchThread(threadData.id);
  console.log('=== TaGS ===');
  console.log(JSON.stringify(threadTags,null,2));

  threadData.tags = threadTags.tags;

  let parms: PutObjectRequest = {
    Bucket: `${process.env.S3_BUCKET}`,
    Key: `${process.env.S3_KEY_PREFIX}${threadData.key}`,
    Body: JSON.stringify(threadData, null, 2),
    ContentType: 'text/json'
  };
  return new Promise ((resolve, reject) => {
    return s3.putObject(parms).promise()
    .then(() => {
      resolve(true);
    })
    .catch((s3err: any) => {
      console.log('s3.save', s3err.message);
      resolve(false);
    });
  });
}
*/
