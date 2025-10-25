const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ip')
        .setDescription('Mostra o IP do servidor KWMC'),
    
    async execute(interaction) {
        const serverIP = process.env.MC_SERVER_IP || 'seu-servidor.com';
        const serverPort = process.env.MC_SERVER_PORT || '25565';
        
        const embed = new EmbedBuilder()
            .setTitle('🎮 Servidor KWMC')
            .setDescription('**Conecte-se ao nosso servidor!**')
            .setColor('#00D4FF')
            .addFields(
                { name: '📡 IP do Servidor', value: `\`${serverIP}\``, inline: true },
                { name: '🔌 Porta', value: `\`${serverPort}\``, inline: true },
                { name: '🎯 Versão', value: '`1.20.x`', inline: true }
            )
            .addFields(
                { name: '🎮 Modos de Jogo', value: '• **Survival** - Sobrevivência clássica\n• **Lobby** - Hub principal', inline: false },
                { name: '🌟 Recursos', value: '• Sistema de proteção\n• Economia\n• Homes e Warps\n• Chat integrado com Discord', inline: false }
            )
            .setFooter({ text: 'KWMC - Servidor de Minigames' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
