import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import { useEffect, useRef } from 'react'

export function useCollaboration(editor, roomId) {
  const docRef = useRef(null)
  const providerRef = useRef(null)

  useEffect(() => {
    if (!editor) return

    const doc = new Y.Doc()
    const provider = new WebsocketProvider(
      'ws://localhost:1234',
      roomId,
      doc
    )

    const type = doc.getText('monaco')

    const binding = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    )

    docRef.current = doc
    providerRef.current = provider

    return () => {
      binding.destroy()
      provider.destroy()
      doc.destroy()
    }
  }, [editor, roomId])
}