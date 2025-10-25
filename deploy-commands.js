const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Comando preparado: ${command.data.name}`);
        } else {
            console.log(`⚠️ Comando em ${filePath} está faltando "data" ou "execute"`);
        }
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Registrando ${commands.length} comandos...`);

        // Registrar comandos globalmente ou em uma guild específica
        const data = await rest.put(
            // Para comandos globais (demora até 1 hora para aparecer):
            // Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            
            // Para comandos em uma guild específica (instantâneo):
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log(`✅ ${data.length} comandos registrados com sucesso!`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();
