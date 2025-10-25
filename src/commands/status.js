const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Verifica o status do servidor KWMC'),
    
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const serverIP = process.env.MC_SERVER_IP || 'localhost';
            const serverPort = process.env.MC_SERVER_PORT || '25565';
            
            // Usar API para verificar status do servidor
            const response = await axios.get(`https://api.mcsrvstat.us/3/${serverIP}:${serverPort}`, {
                timeout: 10000
            });
            
            const serverData = response.data;
            
            const embed = new EmbedBuilder()
                .setTitle('🎮 Status do Servidor KWMC')
                .setColor(serverData.online ? '#00FF00' : '#FF0000')
                .setTimestamp();

            if (serverData.online) {
                embed
                    .setDescription('✅ **Servidor Online**')
                    .addFields(
                        { name: '👥 Jogadores', value: `${serverData.players.online}/${serverData.players.max}`, inline: true },
                        { name: '📡 IP', value: `\`${serverIP}:${serverPort}\``, inline: true },
                        { name: '🎯 Versão', value: serverData.version || 'N/A', inline: true }
                    );

                if (serverData.players.online > 0 && serverData.players.list) {
                    const playerList = serverData.players.list.slice(0, 10).join(', ');
                    embed.addFields({ name: '🎮 Jogadores Online', value: playerList, inline: false });
                }
            } else {
                embed
                    .setDescription('❌ **Servidor Offline**')
                    .addFields(
                        { name: '📡 IP', value: `\`${serverIP}:${serverPort}\``, inline: true },
                        { name: '⏰ Status', value: 'Servidor indisponível', inline: true }
                    );
            }

            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erro ao Verificar Status')
                .setDescription('Não foi possível conectar ao servidor.')
                .setColor('#FF0000')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
