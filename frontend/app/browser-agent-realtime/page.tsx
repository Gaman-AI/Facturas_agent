import BrowserAgentRealtime from '@/components/BrowserAgentRealtime';

export default function BrowserAgentRealtimePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Browser Agent Real-Time</h1>
          <p className="text-gray-600 mt-2">
            Watch your browser automation tasks execute in real-time with live browser interactions
          </p>
        </div>
        
        <BrowserAgentRealtime />
      </div>
    </div>
  );
} 