const WebSocket = require('ws');

console.log('🔍 Testing WebSocket connection to backend...');

const ws = new WebSocket('ws://localhost:8000/api/v1/browser-agent/ws');

ws.on('open', function open() {
  console.log('✅ WebSocket connection established!');
  
  // Send a ping message
  const pingMessage = {
    type: 'ping',
    data: { test: true }
  };
  
  console.log('📤 Sending ping message:', pingMessage);
  ws.send(JSON.stringify(pingMessage));
});

ws.on('message', function message(data) {
  console.log('📨 Received message:', data.toString());
  
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📨 Parsed message:', parsed);
  } catch (error) {
    console.log('❌ Failed to parse message:', error.message);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket connection closed:', code, reason.toString());
});

// Close connection after 5 seconds
setTimeout(() => {
  console.log('⏰ Closing WebSocket connection...');
  ws.close();
}, 5000);
