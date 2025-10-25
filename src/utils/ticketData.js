const fs = require('fs');
const path = require('path');

class TicketDataManager {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data');
        this.ticketsFile = path.join(this.dataPath, 'tickets.json');
        this.statsFile = path.join(this.dataPath, 'stats.json');
        
        // Criar diretório se não existir
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
        
        // Inicializar arquivos se não existirem
        this.initializeFiles();
    }

    initializeFiles() {
        if (!fs.existsSync(this.ticketsFile)) {
            fs.writeFileSync(this.ticketsFile, JSON.stringify([], null, 2));
        }
        
        if (!fs.existsSync(this.statsFile)) {
            const initialStats = {
                totalTickets: 0,
                closedTickets: 0,
                averageRating: 0,
                totalRatings: 0,
                ratingSum: 0,
                staffStats: {},
                categoryStats: {},
                monthlyStats: {}
            };
            fs.writeFileSync(this.statsFile, JSON.stringify(initialStats, null, 2));
        }
    }

    // Salvar novo ticket
    saveTicket(ticketData) {
        try {
            const tickets = this.getTickets();
            const newTicket = {
                id: ticketData.id || Date.now().toString(),
                userId: ticketData.userId,
                username: ticketData.username,
                category: ticketData.category,
                description: ticketData.description,
                createdAt: new Date().toISOString(),
                closedAt: null,
                closedBy: null,
                claimedBy: null,
                rating: null,
                feedback: null,
                status: 'open' // open, claimed, closed
            };
            
            tickets.push(newTicket);
            fs.writeFileSync(this.ticketsFile, JSON.stringify(tickets, null, 2));
            
            // Atualizar estatísticas
            this.updateStats('ticketCreated', newTicket);
            
            return newTicket;
        } catch (error) {
            console.error('Erro ao salvar ticket:', error);
            return null;
        }
    }

    // Fechar ticket
    closeTicket(ticketId, closedBy, rating = null, feedback = null) {
        try {
            const tickets = this.getTickets();
            const ticketIndex = tickets.findIndex(t => t.id === ticketId);
            
            if (ticketIndex === -1) return false;
            
            tickets[ticketIndex].status = 'closed';
            tickets[ticketIndex].closedAt = new Date().toISOString();
            tickets[ticketIndex].closedBy = closedBy;
            tickets[ticketIndex].rating = rating;
            tickets[ticketIndex].feedback = feedback;
            
            fs.writeFileSync(this.ticketsFile, JSON.stringify(tickets, null, 2));
            
            // Atualizar estatísticas
            this.updateStats('ticketClosed', tickets[ticketIndex]);
            
            return tickets[ticketIndex];
        } catch (error) {
            console.error('Erro ao fechar ticket:', error);
            return false;
        }
    }

    // Assumir ticket
    claimTicket(ticketId, staffId, staffName) {
        try {
            const tickets = this.getTickets();
            const ticketIndex = tickets.findIndex(t => t.id === ticketId);
            
            if (ticketIndex === -1) return false;
            
            tickets[ticketIndex].status = 'claimed';
            tickets[ticketIndex].claimedBy = {
                id: staffId,
                name: staffName,
                claimedAt: new Date().toISOString()
            };
            
            fs.writeFileSync(this.ticketsFile, JSON.stringify(tickets, null, 2));
            
            return tickets[ticketIndex];
        } catch (error) {
            console.error('Erro ao assumir ticket:', error);
            return false;
        }
    }

    // Obter todos os tickets
    getTickets() {
        try {
            const data = fs.readFileSync(this.ticketsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Erro ao ler tickets:', error);
            return [];
        }
    }

    // Obter ticket por ID
    getTicketById(ticketId) {
        const tickets = this.getTickets();
        return tickets.find(t => t.id === ticketId);
    }

    // Obter tickets por usuário
    getTicketsByUser(userId) {
        const tickets = this.getTickets();
        return tickets.filter(t => t.userId === userId);
    }

    // Atualizar estatísticas
    updateStats(action, ticketData) {
        try {
            const stats = this.getStats();
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            
            switch (action) {
                case 'ticketCreated':
                    stats.totalTickets++;
                    
                    // Estatísticas por categoria
                    if (!stats.categoryStats[ticketData.category]) {
                        stats.categoryStats[ticketData.category] = 0;
                    }
                    stats.categoryStats[ticketData.category]++;
                    
                    // Estatísticas mensais
                    if (!stats.monthlyStats[currentMonth]) {
                        stats.monthlyStats[currentMonth] = {
                            created: 0,
                            closed: 0,
                            ratings: []
                        };
                    }
                    stats.monthlyStats[currentMonth].created++;
                    break;
                    
                case 'ticketClosed':
                    stats.closedTickets++;
                    
                    // Atualizar rating se fornecido
                    if (ticketData.rating) {
                        stats.totalRatings++;
                        stats.ratingSum += ticketData.rating;
                        stats.averageRating = stats.ratingSum / stats.totalRatings;
                        
                        // Adicionar ao mês atual
                        if (stats.monthlyStats[currentMonth]) {
                            stats.monthlyStats[currentMonth].ratings.push(ticketData.rating);
                        }
                    }
                    
                    // Estatísticas do staff
                    if (ticketData.claimedBy) {
                        const staffId = ticketData.claimedBy.id;
                        if (!stats.staffStats[staffId]) {
                            stats.staffStats[staffId] = {
                                name: ticketData.claimedBy.name,
                                ticketsClosed: 0,
                                totalRating: 0,
                                ratingCount: 0,
                                averageRating: 0
                            };
                        }
                        
                        stats.staffStats[staffId].ticketsClosed++;
                        
                        if (ticketData.rating) {
                            stats.staffStats[staffId].totalRating += ticketData.rating;
                            stats.staffStats[staffId].ratingCount++;
                            stats.staffStats[staffId].averageRating = 
                                stats.staffStats[staffId].totalRating / stats.staffStats[staffId].ratingCount;
                        }
                    }
                    
                    // Estatísticas mensais
                    if (stats.monthlyStats[currentMonth]) {
                        stats.monthlyStats[currentMonth].closed++;
                    }
                    break;
            }
            
            fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    }

    // Obter estatísticas
    getStats() {
        try {
            const data = fs.readFileSync(this.statsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Erro ao ler estatísticas:', error);
            return {
                totalTickets: 0,
                closedTickets: 0,
                averageRating: 0,
                totalRatings: 0,
                ratingSum: 0,
                staffStats: {},
                categoryStats: {},
                monthlyStats: {}
            };
        }
    }

    // Obter estatísticas do dashboard
    getDashboardStats() {
        const stats = this.getStats();
        const tickets = this.getTickets();
        
        const openTickets = tickets.filter(t => t.status === 'open').length;
        const claimedTickets = tickets.filter(t => t.status === 'claimed').length;
        const closedTickets = tickets.filter(t => t.status === 'closed').length;
        
        // Calcular tempo médio de resposta (tickets fechados nas últimas 24h)
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentClosed = tickets.filter(t => 
            t.status === 'closed' && 
            new Date(t.closedAt) > last24h
        );
        
        let averageResponseTime = 0;
        if (recentClosed.length > 0) {
            const totalTime = recentClosed.reduce((sum, ticket) => {
                const created = new Date(ticket.createdAt);
                const closed = new Date(ticket.closedAt);
                return sum + (closed - created);
            }, 0);
            averageResponseTime = totalTime / recentClosed.length;
        }
        
        return {
            total: stats.totalTickets,
            open: openTickets,
            claimed: claimedTickets,
            closed: closedTickets,
            averageRating: Math.round(stats.averageRating * 10) / 10,
            totalRatings: stats.totalRatings,
            averageResponseTime: Math.round(averageResponseTime / (1000 * 60 * 60)), // em horas
            staffStats: stats.staffStats,
            categoryStats: stats.categoryStats,
            recentTickets: tickets.slice(-10).reverse() // 10 mais recentes
        };
    }
}

module.exports = new TicketDataManager();
