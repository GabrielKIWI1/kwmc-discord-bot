const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Sistema de tickets do KWMC')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('criar')
                .setDescription('Criar um novo ticket de suporte')
                .addStringOption(option =>
                    option
                        .setName('motivo')
                        .setDescription('Motivo do ticket')
                        .setRequired(true)
                        .addChoices(
                            { name: '🐛 Bug/Problema', value: 'bug' },
                            { name: '❓ Dúvida', value: 'duvida' },
                            { name: '💰 Economia/Loja', value: 'economia' },
                            { name: '👤 Denúncia', value: 'denuncia' },
                            { name: '🎮 Sugestão', value: 'sugestao' },
                            { name: '📋 Outros', value: 'outros' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('descricao')
                        .setDescription('Descreva seu problema/dúvida')
                        .setRequired(true)
                        .setMaxLength(1000)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('fechar')
                .setDescription('Fechar o ticket atual (apenas staff)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configurar sistema de tickets (apenas admins)')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'criar') {
            await this.criarTicket(interaction);
        } else if (subcommand === 'fechar') {
            await this.fecharTicket(interaction);
        } else if (subcommand === 'setup') {
            await this.setupTickets(interaction);
        }
    },

    async criarTicket(interaction) {
        const motivo = interaction.options.getString('motivo');
        const descricao = interaction.options.getString('descricao');
        const user = interaction.user;
        const guild = interaction.guild;

        // Verificar se já tem ticket aberto
        const existingTicket = guild.channels.cache.find(
            channel => channel.name === `ticket-${user.username.toLowerCase()}` && 
            channel.type === ChannelType.GuildText
        );

        if (existingTicket) {
            return await interaction.reply({
                content: `❌ Você já tem um ticket aberto: ${existingTicket}`,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Buscar categoria de tickets
            let ticketCategory = null;
            if (process.env.TICKET_CATEGORY_ID && process.env.TICKET_CATEGORY_ID !== 'CATEGORIA_TICKETS_ID_AQUI') {
                ticketCategory = guild.channels.cache.get(process.env.TICKET_CATEGORY_ID);
            }

            // Criar canal do ticket
            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: ChannelType.GuildText,
                parent: ticketCategory?.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    }
                ]
            });

            // Adicionar permissões para staff
            if (process.env.ADMIN_ROLE_ID && process.env.ADMIN_ROLE_ID !== 'CARGO_ADMIN_ID_AQUI') {
                await ticketChannel.permissionOverwrites.create(process.env.ADMIN_ROLE_ID, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    ManageMessages: true
                });
            }

            if (process.env.MOD_ROLE_ID && process.env.MOD_ROLE_ID !== 'CARGO_MOD_ID_AQUI') {
                await ticketChannel.permissionOverwrites.create(process.env.MOD_ROLE_ID, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
            }

            // Emoji para cada tipo de ticket
            const emojiMap = {
                'bug': '🐛',
                'duvida': '❓',
                'economia': '💰',
                'denuncia': '👤',
                'sugestao': '🎮',
                'outros': '📋'
            };

            const motivoMap = {
                'bug': 'Bug/Problema',
                'duvida': 'Dúvida',
                'economia': 'Economia/Loja',
                'denuncia': 'Denúncia',
                'sugestao': 'Sugestão',
                'outros': 'Outros'
            };

            // Embed do ticket mais bonita
            const ticketEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `${user.tag}`, 
                    iconURL: user.displayAvatarURL(),
                })
                .setTitle(`${emojiMap[motivo]} ${motivoMap[motivo]} - Ticket #${Math.floor(Math.random() * 10000)}`)
                .setDescription(`
**👋 Olá ${user}!**

Seu ticket foi criado com sucesso. Nossa equipe foi notificada e responderá em breve.

**📝 Detalhes do Ticket:**
\`\`\`
${descricao}
\`\`\`

**⏰ Status:** 🟡 Aguardando Atendimento
**🕐 Criado:** <t:${Math.floor(Date.now() / 1000)}:R>
**📋 Categoria:** ${motivoMap[motivo]}
                `)
                .setColor('#FFD700')
                .setThumbnail(user.displayAvatarURL({ size: 128 }))
                .addFields(
                    { 
                        name: '📋 **Próximos Passos**', 
                        value: '• Nossa equipe analisará seu ticket\n• Você receberá uma resposta em até 24h\n• Mantenha este canal aberto para atualizações', 
                        inline: false 
                    },
                    { 
                        name: '🔧 **Ações Disponíveis**', 
                        value: '• **✋ Assumir:** Staff pode assumir o ticket\n• **📄 Transcrição:** Salvar conversa\n• **🔒 Fechar:** Encerrar o atendimento', 
                        inline: false 
                    }
                )
                .setFooter({ 
                    text: `KWMC Support System • ID: ${user.id}`, 
                    iconURL: interaction.guild.iconURL() 
                })
                .setTimestamp();

            // Botões de controle mais bonitos
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_claim')
                        .setLabel('✋ Assumir')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✋'),
                    new ButtonBuilder()
                        .setCustomId('ticket_transcript')
                        .setLabel('📄 Transcrição')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📄'),
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('🔒 Fechar')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

            // Enviar mensagem no canal do ticket
            await ticketChannel.send({
                content: `🎫 **Ticket Criado** | ${user}`,
                embeds: [ticketEmbed],
                components: [row]
            });

            // Responder ao usuário
            await interaction.editReply({
                content: `✅ Ticket criado com sucesso! ${ticketChannel}`,
            });

            // Log do ticket (se configurado)
            if (process.env.TICKET_LOGS_CHANNEL_ID && process.env.TICKET_LOGS_CHANNEL_ID !== 'CANAL_LOGS_TICKETS_ID_AQUI') {
                const logChannel = guild.channels.cache.get(process.env.TICKET_LOGS_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📋 Novo Ticket Criado')
                        .setDescription(`**Canal:** ${ticketChannel}\n**Usuário:** ${user}\n**Motivo:** ${motivoMap[motivo]}`)
                        .setColor('#00FF00')
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

        } catch (error) {
            console.error('Erro ao criar ticket:', error);
            await interaction.editReply({
                content: '❌ Erro ao criar ticket. Tente novamente ou contate um administrador.',
            });
        }
    },

    async fecharTicket(interaction) {
        const channel = interaction.channel;
        const user = interaction.user;

        // Verificar se é um canal de ticket
        if (!channel.name.startsWith('ticket-')) {
            return await interaction.reply({
                content: '❌ Este comando só pode ser usado em canais de ticket.',
                ephemeral: true
            });
        }

        // Verificar permissões (staff ou dono do ticket)
        const isStaff = interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID) || 
                       interaction.member.roles.cache.has(process.env.MOD_ROLE_ID);
        const isOwner = channel.name === `ticket-${user.username}`;

        if (!isStaff && !isOwner) {
            return await interaction.reply({
                content: '❌ Você não tem permissão para fechar este ticket.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🔒 Fechando Ticket')
            .setDescription(`Ticket será fechado em 5 segundos por ${user}`)
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Log do fechamento
        if (process.env.TICKET_LOGS_CHANNEL_ID && process.env.TICKET_LOGS_CHANNEL_ID !== 'CANAL_LOGS_TICKETS_ID_AQUI') {
            const logChannel = interaction.guild.channels.cache.get(process.env.TICKET_LOGS_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔒 Ticket Fechado')
                    .setDescription(`**Canal:** ${channel.name}\n**Fechado por:** ${user}`)
                    .setColor('#FF0000')
                    .setTimestamp();
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // Deletar canal após 5 segundos
        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (error) {
                console.error('Erro ao deletar canal:', error);
            }
        }, 5000);
    },

    async setupTickets(interaction) {
        // Verificar se é admin
        if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            return await interaction.reply({
                content: '❌ Apenas administradores podem usar este comando.',
                ephemeral: true
            });
        }

        // Criar embed principal mais bonita
        const mainEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: 'KWMC - Sistema de Suporte', 
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTitle('🎫 Central de Atendimento')
            .setDescription(`
**Precisa de ajuda?** Nossa equipe está aqui para você!

Clique no botão abaixo para abrir um ticket e receber suporte personalizado. Nossa equipe responderá o mais rápido possível.
`)
            .setColor('#2F3136')
            .setTimestamp();

        // Embed secundária com informações
        const infoEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setDescription(`
**ℹ️ Como funciona:**
• Clique em **"🎫 Abrir Ticket"** abaixo
• Preencha o formulário com seu problema
• Um canal privado será criado para você
• Nossa equipe será notificada automaticamente
• Responderemos em até **24 horas**

**⏰ Horário de Atendimento:** 24/7 (Resposta em até 24h)
**🌟 Avaliação:** Sua opinião é importante para nós!
            `);

        // Botões mais bonitos
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket_button')
                    .setLabel('🎫 Abrir Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎫')
            );

        // Enviar diretamente no canal como resposta do comando
        await interaction.reply({
            embeds: [mainEmbed, infoEmbed],
            components: [row]
        });
    }
};
