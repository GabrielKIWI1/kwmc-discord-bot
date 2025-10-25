const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`🚀 Bot conectado como ${client.user.tag}!`);
        console.log(`📊 Conectado em ${client.guilds.cache.size} servidor(es)`);
        console.log(`👥 Servindo ${client.users.cache.size} usuários`);
        
        // Definir status do bot
        client.user.setPresence({
            activities: [{
                name: 'KWMC Server',
                type: ActivityType.Watching,
                url: 'https://kwmc.com'
            }],
            status: 'online'
        });

        // Atualizar status periodicamente
        setInterval(() => {
            updateBotStatus(client);
        }, 30000); // A cada 30 segundos
    }
};

async function updateBotStatus(client) {
    try {
        // Aqui você pode fazer uma requisição para verificar o status do servidor
        // Por enquanto, vamos apenas alternar entre algumas mensagens
        
        const activities = [
            { name: 'KWMC Server', type: ActivityType.Watching },
            { name: 'players online', type: ActivityType.Listening },
            { name: 'Minecraft', type: ActivityType.Playing }
        ];
        
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        
        client.user.setPresence({
            activities: [randomActivity],
            status: 'online'
        });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
    }
}
