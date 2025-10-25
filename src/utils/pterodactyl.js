const axios = require('axios');

class PterodactylAPI {
    constructor(panelUrl, apiKey) {
        this.panelUrl = panelUrl;
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL: `${panelUrl}/api/client`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        });
    }

    // Executar comando em um servidor específico
    async executeCommand(serverId, command) {
        try {
            const response = await this.client.post(`/servers/${serverId}/command`, {
                command: command
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao executar comando:', error.response?.data || error.message);
            throw error;
        }
    }

    // Obter status do servidor
    async getServerStatus(serverId) {
        try {
            const response = await this.client.get(`/servers/${serverId}/resources`);
            return response.data;
        } catch (error) {
            console.error('Erro ao obter status:', error.response?.data || error.message);
            throw error;
        }
    }

    // Listar servidores
    async getServers() {
        try {
            const response = await this.client.get('/');
            return response.data;
        } catch (error) {
            console.error('Erro ao listar servidores:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = PterodactylAPI;
