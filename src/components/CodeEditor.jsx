import Editor from '@monaco-editor/react';

export default function CodeEditor() {
  return (
    <div style={{ height: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="python"
        defaultValue="# Bine ai venit în DevSync IDE\nprint('Hello World!')"
        theme="vs-dark"
        options={{ fontSize: 16, minimap: { enabled: false }, automaticLayout: true }}
      />
    </div>
  );
}