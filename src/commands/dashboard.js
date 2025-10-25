const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ticketData = require('../utils/ticketData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Painel de controle e estatísticas dos tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('geral')
                .setDescription('Estatísticas gerais do sistema de tickets')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('staff')
                .setDescription('Estatísticas da equipe de suporte')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('categorias')
                .setDescription('Estatísticas por categoria de tickets')
        ),

    async execute(interaction) {
        // Verificar se é staff
        const isStaff = interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID) || 
                       interaction.member.roles.cache.has(process.env.MOD_ROLE_ID);

        if (!isStaff) {
            return await interaction.reply({
                content: '❌ Apenas membros da equipe podem acessar o dashboard.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'geral') {
            await this.showGeneralDashboard(interaction);
        } else if (subcommand === 'staff') {
            await this.showStaffDashboard(interaction);
        } else if (subcommand === 'categorias') {
            await this.showCategoryDashboard(interaction);
        }
    },

    async showGeneralDashboard(interaction) {
        await interaction.deferReply();

        try {
            const stats = ticketData.getDashboardStats();
            
            // Calcular porcentagens
            const closedPercentage = stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;
            const openPercentage = stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0;
            
            // Criar gráfico de barras simples
            const createProgressBar = (value, max, length = 10) => {
                const percentage = max > 0 ? value / max : 0;
                const filled = Math.round(percentage * length);
                const empty = length - filled;
                return '█'.repeat(filled) + '░'.repeat(empty);
            };

            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'KWMC Dashboard - Estatísticas Gerais', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTitle('📊 Painel de Controle')
                .setDescription(`
**📈 Resumo Geral**
Total de Tickets: **${stats.total}**
Tickets Fechados: **${stats.closed}** (${closedPercentage}%)
Taxa de Resolução: **${closedPercentage}%**
                `)
                .addFields(
                    {
                        name: '🎯 **Status Atual**',
                        value: `
🟢 **Abertos:** ${stats.open}
🟡 **Em Atendimento:** ${stats.claimed}
🔴 **Fechados:** ${stats.closed}

**Distribuição:**
🟢 ${createProgressBar(stats.open, stats.total)} ${openPercentage}%
🟡 ${createProgressBar(stats.claimed, stats.total)} ${Math.round((stats.claimed / stats.total) * 100) || 0}%
🔴 ${createProgressBar(stats.closed, stats.total)} ${closedPercentage}%
                        `,
                        inline: false
                    },
                    {
                        name: '⭐ **Avaliações**',
                        value: `
**Média Geral:** ${stats.averageRating > 0 ? `${stats.averageRating}/5.0 ⭐` : 'Sem avaliações'}
**Total de Avaliações:** ${stats.totalRatings}
**Tempo Médio de Resposta:** ${stats.averageResponseTime}h
                        `,
                        inline: true
                    },
                    {
                        name: '📅 **Atividade Recente**',
                        value: `
**Últimas 24h:**
• ${stats.recentTickets.filter(t => {
    const created = new Date(t.createdAt);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return created > last24h;
}).length} novos tickets
• ${stats.recentTickets.filter(t => {
    const closed = new Date(t.closedAt || 0);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return closed > last24h;
}).length} tickets fechados
                        `,
                        inline: true
                    }
                )
                .setColor('#00D4FF')
                .setFooter({ 
                    text: `Atualizado • ${new Date().toLocaleString('pt-BR')}`, 
                    iconURL: interaction.guild.iconURL() 
                })
                .setTimestamp();

            // Botões de navegação
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('dashboard_refresh')
                        .setLabel('🔄 Atualizar')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('dashboard_staff')
                        .setLabel('👥 Staff')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('dashboard_categories')
                        .setLabel('📋 Categorias')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Erro ao gerar dashboard:', error);
            await interaction.editReply({
                content: '❌ Erro ao carregar estatísticas do dashboard.'
            });
        }
    },

    async showStaffDashboard(interaction) {
        await interaction.deferReply();

        try {
            const stats = ticketData.getDashboardStats();
            
            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'KWMC Dashboard - Estatísticas da Equipe', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTitle('👥 Performance da Equipe')
                .setColor('#5865F2');

            if (Object.keys(stats.staffStats).length === 0) {
                embed.setDescription('📊 Ainda não há estatísticas de staff disponíveis.\nAs estatísticas aparecerão após os primeiros tickets serem fechados.');
            } else {
                let staffList = '';
                let topPerformer = null;
                let highestRating = 0;

                Object.entries(stats.staffStats).forEach(([staffId, data]) => {
                    const rating = data.averageRating || 0;
                    const ratingStars = '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
                    
                    staffList += `
**${data.name}**
• Tickets Fechados: **${data.ticketsClosed}**
• Avaliação Média: **${rating.toFixed(1)}/5.0** ${ratingStars}
• Total de Avaliações: **${data.ratingCount}**
────────────────────
`;

                    if (rating > highestRating) {
                        highestRating = rating;
                        topPerformer = data.name;
                    }
                });

                embed.setDescription(`
**🏆 Melhor Avaliado:** ${topPerformer || 'N/A'} (${highestRating.toFixed(1)}/5.0)
**📊 Total de Staff Ativo:** ${Object.keys(stats.staffStats).length}

${staffList}
                `);
            }

            embed.setFooter({ 
                text: `Atualizado • ${new Date().toLocaleString('pt-BR')}`, 
                iconURL: interaction.guild.iconURL() 
            });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('dashboard_general')
                        .setLabel('📊 Geral')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('dashboard_refresh')
                        .setLabel('🔄 Atualizar')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Erro ao gerar dashboard de staff:', error);
            await interaction.editReply({
                content: '❌ Erro ao carregar estatísticas da equipe.'
            });
        }
    },

    async showCategoryDashboard(interaction) {
        await interaction.deferReply();

        try {
            const stats = ticketData.getDashboardStats();
            
            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'KWMC Dashboard - Estatísticas por Categoria', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTitle('📋 Tickets por Categoria')
                .setColor('#57F287');

            if (Object.keys(stats.categoryStats).length === 0) {
                embed.setDescription('📊 Ainda não há estatísticas de categorias disponíveis.\nAs estatísticas aparecerão após os primeiros tickets serem criados.');
            } else {
                const total = Object.values(stats.categoryStats).reduce((sum, count) => sum + count, 0);
                
                let categoryList = '';
                const sortedCategories = Object.entries(stats.categoryStats)
                    .sort(([,a], [,b]) => b - a);

                const categoryEmojis = {
                    'bug': '🐛',
                    'duvida': '❓',
                    'economia': '💰',
                    'denuncia': '👤',
                    'sugestao': '🎮',
                    'outros': '📋'
                };

                sortedCategories.forEach(([category, count]) => {
                    const percentage = Math.round((count / total) * 100);
                    const emoji = categoryEmojis[category] || '📋';
                    const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
                    
                    categoryList += `
${emoji} **${category.charAt(0).toUpperCase() + category.slice(1)}**
${progressBar} **${count}** tickets (${percentage}%)
`;
                });

                embed.setDescription(`
**📊 Total de Tickets:** ${total}
**📈 Categoria Mais Popular:** ${sortedCategories[0] ? sortedCategories[0][0] : 'N/A'}

${categoryList}
                `);
            }

            embed.setFooter({ 
                text: `Atualizado • ${new Date().toLocaleString('pt-BR')}`, 
                iconURL: interaction.guild.iconURL() 
            });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('dashboard_general')
                        .setLabel('📊 Geral')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('dashboard_refresh')
                        .setLabel('🔄 Atualizar')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Erro ao gerar dashboard de categorias:', error);
            await interaction.editReply({
                content: '❌ Erro ao carregar estatísticas de categorias.'
            });
        }
    }
};
