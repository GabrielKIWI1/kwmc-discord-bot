const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const ticketData = require('../utils/ticketData');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Comandos slash
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Comando ${interaction.commandName} não encontrado.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Erro ao executar comando:', error);
                const errorMessage = {
                    content: '❌ Houve um erro ao executar este comando!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        // Botões do sistema de tickets
        if (interaction.isButton()) {
            if (interaction.customId === 'create_ticket_button') {
                await this.showTicketModal(interaction);
            } else if (interaction.customId === 'ticket_close') {
                await this.closeTicket(interaction);
            } else if (interaction.customId === 'ticket_claim') {
                await this.claimTicket(interaction);
            } else if (interaction.customId === 'ticket_transcript') {
                await this.createTranscript(interaction);
            } else if (interaction.customId === 'ticket_close_no_rating') {
                await this.handleCloseWithoutRating(interaction);
            } else if (interaction.customId.startsWith('dashboard_')) {
                await this.handleDashboardButtons(interaction);
            }
        }

        // Select menus
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'ticket_rating') {
                await this.handleRatingSelection(interaction);
            }
        }

        // Modal do ticket
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'ticket_modal') {
                await this.createTicketFromModal(interaction);
            } else if (interaction.customId.startsWith('feedback_modal_')) {
                await this.handleFeedbackModal(interaction);
            }
        }
    },

    async showTicketModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal')
            .setTitle('Criar Ticket de Suporte - KWMC');

        const nicknameInput = new TextInputBuilder()
            .setCustomId('nickname_input')
            .setLabel('Seu Nickname no Minecraft')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Digite seu nickname exato do Minecraft...')
            .setRequired(true)
            .setMaxLength(16);

        const motivoInput = new TextInputBuilder()
            .setCustomId('motivo_input')
            .setLabel('Categoria do Problema')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Bug, Dúvida, Denúncia, Sugestão...')
            .setRequired(true)
            .setMaxLength(50);

        const descricaoInput = new TextInputBuilder()
            .setCustomId('descricao_input')
            .setLabel('Descreva seu problema detalhadamente')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Explique sua situação com o máximo de detalhes possível...')
            .setRequired(true)
            .setMaxLength(1000);

        const firstActionRow = new ActionRowBuilder().addComponents(nicknameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(motivoInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(descricaoInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        await interaction.showModal(modal);
    },

    async createTicketFromModal(interaction) {
        const nickname = interaction.fields.getTextInputValue('nickname_input');
        const motivo = interaction.fields.getTextInputValue('motivo_input');
        const descricao = interaction.fields.getTextInputValue('descricao_input');
        const user = interaction.user;

        await interaction.deferReply({ ephemeral: true });

        // Verificar se já tem ticket aberto (usando Discord username como backup)
        const existingChannel = interaction.guild.channels.cache.find(
            channel => channel.name === `ticket-${nickname.toLowerCase()}` || 
                      channel.name === `ticket-${user.username.toLowerCase()}`
        );

        if (existingChannel) {
            return await interaction.editReply({
                content: `❌ Você já possui um ticket aberto: ${existingChannel}`
            });
        }

        try {
            // Criar canal do ticket usando o nickname do Minecraft
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${nickname.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: process.env.TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
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

            // Criar embed do ticket
            const ticketEmbed = new EmbedBuilder()
                .setTitle('🎫 Novo Ticket de Suporte')
                .setDescription(`
**Usuário Discord:** ${user}
**Nickname Minecraft:** \`${nickname}\`
**Categoria:** ${motivo}
**Descrição:** ${descricao}

**📋 Instruções:**
• Nossa equipe responderá em breve
• Use os botões abaixo para gerenciar o ticket
• Mantenha a conversa respeitosa e clara
                `)
                .setColor('#00D4FF')
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();

            // Botões de controle
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_claim')
                        .setLabel('✋ Assumir')
                        .setStyle(ButtonStyle.Primary)
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

            // Salvar dados do ticket
            const ticketId = `ticket-${Date.now()}`;
            const savedTicket = ticketData.saveTicket({
                id: ticketId,
                userId: user.id,
                username: user.username,
                minecraftNick: nickname,
                category: motivo,
                description: descricao
            });

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

        } catch (error) {
            console.error('Erro ao criar ticket:', error);
            await interaction.editReply({
                content: '❌ Erro ao criar ticket. Verifique as permissões do bot.'
            });
        }
    },

    async closeTicket(interaction) {
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
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
                       interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
        
        // Verificar se é dono do ticket (por Discord username ou se o canal contém o user ID nos dados)
        const tickets = ticketData.getTickets();
        const ticketRecord = tickets.find(t => 
            channel.name.includes(t.minecraftNick?.toLowerCase()) || 
            channel.name.includes(t.username.toLowerCase()) && 
            t.status !== 'closed'
        );
        const isOwner = ticketRecord && ticketRecord.userId === user.id;

        if (!isStaff && !isOwner) {
            return await interaction.reply({
                content: '❌ Você não tem permissão para fechar este ticket.',
                ephemeral: true
            });
        }

        // Usar o ticketRecord já encontrado acima

        // Se for o dono do ticket, mostrar sistema de avaliação
        if (isOwner && ticketRecord) {
            await this.showRatingSystem(interaction, ticketRecord);
        } else {
            // Staff fechando diretamente
            await this.finalizeTicketClosure(interaction, ticketRecord, null, null);
        }
    },

    async showRatingSystem(interaction, ticketRecord) {
        const embed = new EmbedBuilder()
            .setTitle('⭐ Avalie Nosso Atendimento')
            .setDescription(`
**Olá ${interaction.user}!**

Antes de fechar seu ticket, gostaríamos de saber sua opinião sobre nosso atendimento.

**Como você avalia o suporte recebido?**
Sua avaliação nos ajuda a melhorar nossos serviços!
            `)
            .setColor('#FFD700')
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Sua opinião é muito importante para nós!' })
            .setTimestamp();

        const ratingRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_rating')
                    .setPlaceholder('Selecione sua avaliação...')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('⭐ 1 Estrela - Muito Ruim')
                            .setDescription('Atendimento muito insatisfatório')
                            .setValue('1')
                            .setEmoji('⭐'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('⭐⭐ 2 Estrelas - Ruim')
                            .setDescription('Atendimento insatisfatório')
                            .setValue('2')
                            .setEmoji('⭐'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('⭐⭐⭐ 3 Estrelas - Regular')
                            .setDescription('Atendimento satisfatório')
                            .setValue('3')
                            .setEmoji('⭐'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('⭐⭐⭐⭐ 4 Estrelas - Bom')
                            .setDescription('Atendimento muito bom')
                            .setValue('4')
                            .setEmoji('⭐'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('⭐⭐⭐⭐⭐ 5 Estrelas - Excelente')
                            .setDescription('Atendimento excepcional')
                            .setValue('5')
                            .setEmoji('⭐')
                    )
            );

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close_no_rating')
                    .setLabel('Fechar sem Avaliar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏭️')
            );

        await interaction.reply({
            embeds: [embed],
            components: [ratingRow, buttonRow]
        });
    },

    async finalizeTicketClosure(interaction, ticketRecord, rating, feedback) {
        const channel = interaction.channel;
        const user = interaction.user;

        // Atualizar dados do ticket se existir
        if (ticketRecord) {
            ticketData.closeTicket(ticketRecord.id, user.id, rating, feedback);
        }

        let closureMessage = `Ticket será fechado em 5 segundos por ${user}`;
        if (rating) {
            closureMessage += `\n⭐ Avaliação: ${rating}/5 estrelas`;
            if (feedback) {
                closureMessage += `\n💬 Feedback: "${feedback}"`;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🔒 Fechando Ticket')
            .setDescription(closureMessage)
            .setColor('#FF0000')
            .setTimestamp();

        // Se já respondeu (sistema de avaliação), editar resposta
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ 
                embeds: [embed], 
                components: [] 
            });
        } else {
            await interaction.reply({ embeds: [embed] });
        }

        // Log do fechamento
        if (process.env.TICKET_LOGS_CHANNEL_ID && process.env.TICKET_LOGS_CHANNEL_ID !== 'CANAL_LOGS_TICKETS_ID_AQUI') {
            const logChannel = interaction.guild.channels.cache.get(process.env.TICKET_LOGS_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔒 Ticket Fechado')
                    .setDescription(`
**Canal:** ${channel.name}
**Fechado por:** ${user}
${rating ? `**Avaliação:** ${rating}/5 ⭐` : ''}
${feedback ? `**Feedback:** ${feedback}` : ''}
                    `)
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

    async claimTicket(interaction) {
        const channel = interaction.channel;
        const user = interaction.user;

        // Verificar se é staff
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
                       interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

        if (!isStaff) {
            return await interaction.reply({
                content: '❌ Apenas membros da equipe podem assumir tickets.',
                ephemeral: true
            });
        }

        // Atualizar dados do ticket
        const tickets = ticketData.getTickets();
        const ticketRecord = tickets.find(t => 
            channel.name.includes(t.username.toLowerCase()) && t.status !== 'closed'
        );

        if (ticketRecord) {
            ticketData.claimTicket(ticketRecord.id, user.id, user.username);
        }

        const embed = new EmbedBuilder()
            .setTitle('✋ Ticket Assumido')
            .setDescription(`${user} assumiu este ticket e irá te ajudar!`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Atualizar nome do canal
        try {
            await channel.setName(`${channel.name}-${user.username}`);
        } catch (error) {
            console.error('Erro ao renomear canal:', error);
        }
    },

    async handleCloseWithoutRating(interaction) {
        const tickets = ticketData.getTickets();
        const ticketRecord = tickets.find(t => 
            interaction.channel.name.includes(t.username.toLowerCase()) && t.status !== 'closed'
        );

        await this.finalizeTicketClosure(interaction, ticketRecord, null, null);
    },

    async handleRatingSelection(interaction) {
        const rating = parseInt(interaction.values[0]);
        
        // Mostrar modal para feedback opcional
        const modal = new ModalBuilder()
            .setCustomId(`feedback_modal_${rating}`)
            .setTitle('Feedback Adicional (Opcional)');

        const feedbackInput = new TextInputBuilder()
            .setCustomId('feedback_text')
            .setLabel('Comentário sobre o atendimento')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Deixe um comentário sobre nosso atendimento (opcional)...')
            .setRequired(false)
            .setMaxLength(500);

        const actionRow = new ActionRowBuilder().addComponents(feedbackInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    },

    async handleDashboardButtons(interaction) {
        const action = interaction.customId.replace('dashboard_', '');
        
        // Importar comando dashboard
        const dashboardCommand = require('../commands/dashboard');
        
        if (action === 'refresh' || action === 'general') {
            await dashboardCommand.showGeneralDashboard(interaction);
        } else if (action === 'staff') {
            await dashboardCommand.showStaffDashboard(interaction);
        } else if (action === 'categories') {
            await dashboardCommand.showCategoryDashboard(interaction);
        }
    },

    async handleFeedbackModal(interaction) {
        const rating = parseInt(interaction.customId.split('_')[2]);
        const feedback = interaction.fields.getTextInputValue('feedback_text') || null;
        
        const tickets = ticketData.getTickets();
        const ticketRecord = tickets.find(t => 
            interaction.channel.name.includes(t.username.toLowerCase()) && t.status !== 'closed'
        );

        await this.finalizeTicketClosure(interaction, ticketRecord, rating, feedback);
    },

    async createTranscript(interaction) {
        const channel = interaction.channel;
        const user = interaction.user;

        // Verificar se é staff
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
                       interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

        if (!isStaff) {
            return await interaction.reply({
                content: '❌ Apenas membros da equipe podem criar transcrições.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            // Buscar mensagens do canal
            const messages = await channel.messages.fetch({ limit: 100 });
            const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            // Criar transcrição
            let transcript = `TRANSCRIÇÃO DO TICKET: ${channel.name}\n`;
            transcript += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
            transcript += `Solicitado por: ${user.username}\n`;
            transcript += `${'='.repeat(50)}\n\n`;

            sortedMessages.forEach(msg => {
                const timestamp = msg.createdAt.toLocaleString('pt-BR');
                transcript += `[${timestamp}] ${msg.author.username}: ${msg.content}\n`;
                
                if (msg.attachments.size > 0) {
                    msg.attachments.forEach(attachment => {
                        transcript += `[ANEXO: ${attachment.name}]\n`;
                    });
                }
                transcript += '\n';
            });

            // Criar arquivo
            const buffer = Buffer.from(transcript, 'utf-8');

            await interaction.editReply({
                content: '📄 Transcrição do ticket criada com sucesso!',
                files: [{
                    attachment: buffer,
                    name: `transcript-${channel.name}-${Date.now()}.txt`
                }]
            });

        } catch (error) {
            console.error('Erro ao criar transcrição:', error);
            await interaction.editReply({
                content: '❌ Erro ao criar transcrição do ticket.'
            });
        }
    }
};
