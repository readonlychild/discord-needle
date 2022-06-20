import { SlashCommandBuilder } from "@discordjs/builders";
import { type CommandInteraction, GuildMember, Permissions, InteractionCollector, MessageEmbed } from "discord.js";
import { interactionReply, getMessage, getThreadAuthor } from "../helpers/messageHelpers";
import type { NeedleCommand } from "../types/needleCommand";
import axios from 'axios';

/* ==== DATA ==== */
const es_index = process.env.ES_DOMAIN; // full-access
const es_readonly = process.env.ES_READONLY || 'o_O'; // read-only

export const command: NeedleCommand = {
	name: "tags",
	shortHelpDescription: "Manage tags for a thread",
	longHelpDescription: "Manage tags for a thread",

	async getSlashCommandBuilder() {
		return new SlashCommandBuilder()
			.setName("tags")
			.setDescription("Manage tags for a thread")
			.addSubcommand(subcommand => {
				return subcommand
					.setName("view")
					.setDescription("Display current thread tags")
			})
			.addSubcommand(subcommand => {
				return subcommand
					.setName("clear")
					.setDescription("Remove all tags from current thread")
			})
			.addSubcommand(subcommand => {
				return subcommand
					.setName("add")
					.setDescription("Add tags to current thread")
					.addStringOption(option => {
						return option
							.setName("tag-list")
							.setDescription("Space separated tag-list; will append to existing tags")
							.setRequired(true);
					})
			})
			.addSubcommand(subcommand => {
				return subcommand
					.setName("replace")
					.setDescription("Replace tags for current thread")
					.addStringOption(option => {
						return option
							.setName("tag-list")
							.setDescription("Space separated tag-list; will replace any existing tags")
							.setRequired(true);
					})
			})
			.addSubcommand(subcommand => {
				return subcommand
					.setName("status")
					.setDescription("Assign a status to the thread")
					.addStringOption(option => {
						return option
							.setName("the-status")
							.setDescription("The status to assign")
							.setRequired(true)
							.addChoice("resolved", "resolved")
							.addChoice("blocker", "blocker")
							.addChoice("easy", "easy")
							.addChoice("hard", "hard")
					})
			})
			.addSubcommand(subcommand => {
				return subcommand
					.setName("stats-top")
					.setDescription("List top 25 tags")
					.addIntegerOption(option => {
						return option
							.setName("days-back")
							.setDescription("Days back to look :eyes: Defaults to 30")
					})
			})
			.toJSON();
	},

	async execute(interaction: CommandInteraction): Promise<void> {

		const subCommand = interaction.options.getSubcommand();

		if (interaction.options.getSubcommand() === "stats-top") {
			const daysBack = interaction.options.getInteger('days-back') || 30;
			let query = {
				query: {
					bool: {
						must: [
							{ term: { server: interaction.guild?.id || '999' } },
							{ range: { created: { gte: `now-${daysBack}d` } } }
						]
					}
				},
				aggs: {
					tagging: {
						terms: { field: 'tags', size: 25 }
					}
				}
			};
			let toptags = await searchIndex(query);
			const buckets = toptags.aggregations.tagging.buckets;
			let embed = getTop25Embed(daysBack, buckets, toptags.hits.total.value, toptags.aggregations.tagging.sum_other_doc_count);
			await interaction.reply({
				embeds: [embed],
				ephemeral: true
			});
			return;
		}

		const member = interaction.member;
		if (!(member instanceof GuildMember)) {
			return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
		}

		const channel = interaction.channel;
		if (!channel?.isThread()) {
			return interactionReply(interaction, getMessage("ERR_ONLY_IN_THREAD", interaction.id));
		}

		const taglist = interaction.options.getString("tag-list") || '';

		const hasTaggingPermissions = member
			.permissionsIn(channel)
			.has(Permissions.FLAGS.MANAGE_THREADS, true);

		if (hasTaggingPermissions) {
			let threadData = await fetchThread(interaction.channel?.id || 'o_O');
			threadData.uid = interaction.channel?.id;
			threadData.server = interaction.guild?.id;
			if (subCommand === 'view') {
				await interactionReply(interaction, `Thread Tags: ${getTagList(threadData)}`);
				return;
			}
			if (subCommand === 'replace') {
				threadData.tags = [];
			}
			let messageForUser = '';
			if (subCommand === 'clear') {
				threadData.tags = [];
				threadData.log.push({
					who: interaction.user.username, av: interaction.user.displayAvatarURL(), when: new Date(), what: `clear`
				});
				messageForUser = 'Thread tags cleared :thumbsup:';
			}
			if (['add','replace'].includes(subCommand)) {
				messageForUser = await applyTags(interaction, threadData, { taglist, subcommand: subCommand || 'x' });
			}
			if (subCommand === 'status') {
				const userstatus = interaction.options.getString("the-status");
				threadData.status = userstatus;
				messageForUser = `Status set to **${userstatus}**`;
				threadData.log.push({
					who: interaction.user.username, av: interaction.user.displayAvatarURL(), when: new Date(), what: `status: ${userstatus}`
				});
			}
			// save thread object
			await saveThread(threadData.uid, threadData);
			await interactionReply(interaction, messageForUser);
			return;
		}

		await interactionReply(interaction, "Nothing done.");
	},
};

async function applyTags (interaction: CommandInteraction, thread: any, options: any): Promise<string> {
	// load thread object
	let newTags = options.taglist.split(' ');
	if (!newTags.length) {
		return `Tags: <empty>; no tags applied.`;
	}
	// log
	thread.log.push({ who: interaction.user.username, av: interaction.user.displayAvatarURL(), when: new Date(), what: `${options.subcommand}: ${options.taglist}` });
	// apply/dedupe tags
	newTags.forEach((tag: string) => {
		if (!thread.tags.includes(tag.toLowerCase())) {
			thread.tags.push(tag.toLowerCase());
		}
	});
	return `Tags: ${getTagList(thread)}`;
};

/* ==== HELPERS ==== */

export async function fetchThread (uid: any) {
	if (uid === 'o_O') {
		return getNewThreadData();
	}
	try {
		const resp = await axios.get(`${es_index}/threads/_doc/${uid}`);
		const data = resp.data;
		if (data.found) {
			return data._source;
		}
		return getNewThreadData();
	} catch (err) {
		return getNewThreadData();
	}
}

function getNewThreadData () {
	return {
		uid: '',
		server: '',
		created: new Date(),
		updated: new Date(),
		log: [],
		tags: [],
		status: 'new'
	};
}

async function searchIndex (query: any) {
	const resp = await axios.post(`${es_index}/threads/_search`, query);
	return resp.data;
}

async function saveThread (uid: string, obj: any) {
	const resp = await axios.post(`${es_index}/threads/_doc/${uid}`, obj);
	return;
}

function getTop25Embed (daysBack: number, buckets: any, ttlThreads: number, otherTags: number): MessageEmbed {
	let embed = new MessageEmbed().setTitle(`Top 25 tags in the last ${daysBack} days`);
	let desc = '';
	buckets.forEach((bucket: any) => {
		embed.addField(bucket.key, bucket.doc_count.toString(), true);
	});
	embed.setDescription(desc);
	embed.setFooter({ text: `Ttl Threads: ${ttlThreads}; Other tags: ${otherTags}` });
	return embed;
}

function getTagList (threadData: any) {
	let markup = '';
	threadData.tags.forEach((tag: string) => {
		markup += `🏷️\`${tag}\` `;
	});
	return markup;
}

