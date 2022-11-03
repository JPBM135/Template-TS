import { createMessageActionRow } from '@yuudachi/framework';
import type { ArgumentsOf } from '@yuudachi/framework/types';
import type { APIButtonComponentWithCustomId, ChatInputCommandInteraction } from 'discord.js';
import { ComponentType, ButtonStyle, parseEmoji } from 'discord.js';
import { Emojis } from '../constants.js';
import { fetchCorreios } from '../correios/fetch.js';
import type { LookupCommand } from '../interactions/lookup.js';
import { getCode } from '../postgres/get.js';
import { formatCorreios } from '../utils/correioFormat.js';
import { validateCode } from '../utils/validadeCode.js';

export async function handleLookup(interaction: ChatInputCommandInteraction, args: ArgumentsOf<typeof LookupCommand>) {
	const [code, hide] = [args.codigo, args.esconder ?? false];

	await interaction.deferReply({
		ephemeral: hide,
	});

	if (!validateCode(code)) {
		return interaction.editReply({
			content: [
				`${Emojis.warning} | **Código inválido.**`,
				'',
				`> Os codigos de rastreio seguem o padrão: \`LL000000000LL\` onde \`L\` é uma letra e \`0\` é um número.`,
			].join('\n'),
		});
	}

	const codeConfig = await getCode(code);

	if (code && codeConfig?.restricted && codeConfig.owner_id !== interaction.user.id) {
		return interaction.editReply(`${Emojis.error} | Esse código foi cadastrado como restrito.`);
	}

	const correios = await fetchCorreios(code);

	if (!correios) {
		return interaction.editReply(`${Emojis.error} | Código não encontrado, tente novamente mais tarde.`);
	}

	const refreshButton: APIButtonComponentWithCustomId = {
		label: 'Atualizar',
		type: ComponentType.Button,
		custom_id: `REFRESH::${code}`,
		style: ButtonStyle.Secondary,
		// @ts-expect-error: this is a valid emoji
		emoji: parseEmoji(Emojis.refresh),
	};

	return interaction.editReply({
		embeds: [formatCorreios({ ...correios, name: codeConfig?.name })],
		components: [createMessageActionRow([refreshButton])],
	});
}
