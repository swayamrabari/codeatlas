export default function Chat({ projectId }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground/80">Chat</h1>
        <p className="text-foreground/60 mt-2">
          Chat with your codebase and get instant insights.
        </p>
        <p className="text-foreground/40 text-sm mt-1">Project ID: {projectId}</p>
      </div>
    </div>
  );
}
