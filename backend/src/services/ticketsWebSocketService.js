import websocketService from './websocketService.js'

class TicketsWebSocketService {
  broadcast(ticketId, message) {
    // Reuse task broadcast mechanism, using ticketId as a channel key
    websocketService.broadcastToTask(ticketId, message)
  }
}

export default new TicketsWebSocketService() 