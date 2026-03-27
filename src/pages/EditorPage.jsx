import Toolbar from '../components/Toolbar';
import CodeEditor from '../components/CodeEditor';
import Terminal from '../components/Terminal';

export default function EditorPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <div style={{ width: '65%' }}>
          <CodeEditor />
        </div>
        <div style={{ width: '35%' }}>
          <Terminal />
        </div>
      </div>
    </div>
  );
}