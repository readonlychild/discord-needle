import { SlashCommandBuilder } from "@discordjs/builders";
import { type CommandInteraction, GuildMember, Permissions, DataResolver } from "discord.js";
import { interactionReply, getMessage } from "../helpers/messageHelpers";
import type { NeedleCommand } from "../types/needleCommand";
import { encode } from "base-64";
import axios from 'axios';

export const command: NeedleCommand = {
	name: "card",
	shortHelpDescription: "Show GuildMember Card",
	longHelpDescription: "Show GuildMember Card",

	async getSlashCommandBuilder() {
		return new SlashCommandBuilder()
			.setName("card")
			.setDescription("Show GuildMember Card")
			.addUserOption(option => {
				return option
					.setName("member")
					.setDescription("@tag someone")
					.setRequired(false);
			})
			.addStringOption(option => {
				return option
					.setName("cache-buster")
					.setDescription("Bust the Cache")
					.setRequired(false);
			})
			.addStringOption(option => {
				return option
				.setName("theme")
				.setDescription("Pick a card theme")
				.addChoice("v1", "v1")
				.addChoice("v1b", "v1b")
					;
			})
			.toJSON();
	},

	async execute(interaction: CommandInteraction): Promise<void> {
		//interaction.deferReply();
		const member = interaction.member;
		if (!(member instanceof GuildMember)) {
			return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
		}

		let mention = interaction.options.getMember("member") || member;
		let theme = interaction.options.getString("theme") || 'v1';
		let cacheBuster = interaction.options.getString('cache-buster') || 'o';
		
		const hasPermission = true;

		if (hasPermission) {
			let imageUrl = await getCard(interaction, { mention, theme, cacheBuster });
			return interaction.reply({
				files: [ { attachment: imageUrl, name: 'card.png' } ]
			});
		}

		// await interactionReply(interaction, "Nothing done.");
	},
};

const ixmage = 'https://cdn.ixmage.com/bimg/v1/astro/';

async function getCard (interaction: CommandInteraction, options: any): Promise<string> {
	// load theme
	const themeUri = process.env.CARD_THEME_URI?.replace('{theme}', options.theme);
	if (!themeUri) {
		console.log('**** NO CARD_THEME_URI in Envirionment ****')
	}
	console.log(themeUri);
	const themeresp = await axios.get(themeUri || '');
	const theme = themeresp.data;

	console.log(JSON.stringify(theme,null,2));
	console.log('canvas width', theme.canvas.width);

	// build json
	let imgDef: any = {};
	imgDef.defs = {
		annot: { f: theme.font?.name || 'supercell.ttf', grav: 'northwest', sz: theme.font?.sz || 14, color: theme.font?.color || 'white' }
	};

	// canvas
	imgDef.canvas = { w: theme.canvas.width, h: theme.canvas.height, src: theme.base + theme.canvas.img };
	const m: GuildMember = options.mention;
	imgDef.actions = [];
	// avatar
	imgDef.actions.push({
		t: 'image', x: theme.avatar.x, y: theme.avatar.y, w: theme.avatar.width,
		src: `${m.displayAvatarURL()}?w=128`
	});
	// avatar frame
	if (theme.avatarFrame) {
		imgDef.actions.push({
			t: 'image', x: theme.avatarFrame.x, y: theme.avatarFrame.y, w: theme.avatarFrame.width,
			src: theme.base + theme.avatarFrame.img
		});
	}

	// username
	imgDef.actions.push({ t: 'annot', txt: m.displayName, sz: theme.username.sz, x: theme.username.x, y: theme.username.y });
	let k = 0;
	theme.badges.type2.names.forEach((badge: any) => {
		if (memberHasRoleAny(m, badge.roles)) {
			imgDef.actions.push({
				t: 'image', 
				w: theme.badges.type2.width, 
				x: theme.badges.type2.pos[k].x, 
				y: theme.badges.type2.pos[k].y, 
				src: theme.base + badge.img
			});
			k += 1;
		}
	});
	k = 0;
	theme.badges.type1.names.forEach((badge: any) => {
		if (memberHasRoleAny(m, badge.roles)) {
			imgDef.actions.push({
				t: 'image', 
				w: theme.badges.type1.width, 
				x: theme.badges.type1.pos[k].x, 
				y: theme.badges.type1.pos[k].y, 
				src: theme.base + badge.img
			});
			k += 1;
		}
	});

	// turn base64
	console.log('imgDef', JSON.stringify(imgDef,null,2));
	let json = JSON.stringify(imgDef);
	let data64 = encode(json);

	// fetch bimg
	const imgurl = `${ixmage}${data64}?b=${options.cacheBuster||'i'}`;
	return imgurl;
	
};

function memberHasRoleAny(m: GuildMember, roleNames: string[]): boolean {
	let b = false;
	if (roleNames.includes('*')) return true;
	m.roles.cache.forEach((role) => {
		if (roleNames.includes(role.name)) b = b || true;
	});
	return b;
};
